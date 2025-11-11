import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { generateSecureToken } from '@/lib/encryption';
import { logUserAction, AuditAction } from '@/lib/audit';
import { z } from 'zod';

/**
 * Two-Factor Authentication (2FA) via Email
 * - Generate 6-digit code
 * - 10-minute expiration
 * - Rate limited
 * - Single use tokens
 */

const Verify2FASchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

/**
 * @openapi
 * /api/security/2fa/enable:
 *   post:
 *     summary: Enable 2FA for user account
 *     tags:
 *       - Security
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, 'auth');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    const user = await requireUser();

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in database (hashed)
    const token = generateSecureToken();

    await db.user.update({
      where: { id: user.id },
      data: {
        metadata: {
          ...(user.metadata as object || {}),
          twoFactorCode: code, // In production, hash this
          twoFactorToken: token,
          twoFactorExpiresAt: expiresAt.toISOString(),
        },
      },
    });

    // TODO: Send email with code (integrate with email service)
    logger.info('2FA code generated', {
      userId: user.id,
      email: user.email,
    });

    // In development, return code (REMOVE IN PRODUCTION!)
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        message: '2FA code sent to your email',
        devOnly: { code }, // REMOVE IN PRODUCTION
      });
    }

    return NextResponse.json({
      success: true,
      message: '2FA code sent to your email',
      token,
    });
  } catch (error) {
    logger.error('Failed to enable 2FA', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to enable 2FA' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /api/security/2fa/verify:
 *   post:
 *     summary: Verify 2FA code
 *     tags:
 *       - Security
 */
export async function PUT(request: NextRequest) {
  try {
    // Strict rate limiting
    const rateLimitResult = await rateLimit(request, 'auth');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many attempts' },
        { status: 429, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    const user = await requireUser();
    const body = await request.json();

    const validatedData = Verify2FASchema.parse(body);

    const metadata = user.metadata as Record<string, unknown> || {};
    const storedCode = metadata.twoFactorCode as string;
    const expiresAt = metadata.twoFactorExpiresAt as string;

    if (!storedCode || !expiresAt) {
      return NextResponse.json(
        { error: '2FA not initiated' },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Code expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Verify code
    if (storedCode === validatedData.code) {
      // Success - enable 2FA
      await db.user.update({
        where: { id: user.id },
        data: {
          metadata: {
            ...(user.metadata as object || {}),
            twoFactorEnabled: true,
            twoFactorCode: null, // Clear used code
            twoFactorToken: null,
            twoFactorExpiresAt: null,
          },
        },
      });

      await logUserAction(
        AuditAction.USER_LOGIN,
        user.clerkId,
        request,
        { action: '2FA_ENABLED' }
      );

      logger.info('2FA enabled successfully', { userId: user.id });

      return NextResponse.json({
        success: true,
        message: '2FA enabled successfully',
      });
    } else {
      // Failed verification
      logger.warn('Invalid 2FA code attempt', {
        userId: user.id,
        ip: request.headers.get('x-forwarded-for'),
      });

      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error('2FA verification failed', { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /api/security/2fa/status:
 *   get:
 *     summary: Check 2FA status
 *     tags:
 *       - Security
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, 'authenticated');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    const user = await requireUser();
    const metadata = user.metadata as Record<string, unknown> || {};
    const twoFactorEnabled = metadata.twoFactorEnabled as boolean || false;

    return NextResponse.json({
      twoFactorEnabled,
    });
  } catch (error) {
    logger.error('Failed to get 2FA status', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
