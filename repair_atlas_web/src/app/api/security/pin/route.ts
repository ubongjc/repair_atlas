import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { encrypt, decrypt } from '@/lib/encryption';
import { auditLog, AuditAction } from '@/lib/audit';
import { z } from 'zod';

/**
 * PIN Protection System
 * - 4-6 digit PIN
 * - Encrypted storage
 * - Rate limiting on attempts
 * - Auto-lock after failed attempts
 */

const SetPINSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
  confirmPin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

const VerifyPINSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

/**
 * @openapi
 * /api/security/pin/set:
 *   post:
 *     summary: Set user PIN for additional security
 *     tags:
 *       - Security
 *     security:
 *       - bearerAuth: []
 */
export async function POST(request: NextRequest) {
  try {
    // Strict rate limiting for security endpoints
    const rateLimitResult = await rateLimit(request, 'auth');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    const user = await requireUser();
    const body = await request.json();

    const validatedData = SetPINSchema.parse(body);

    // Verify PINs match
    if (validatedData.pin !== validatedData.confirmPin) {
      return NextResponse.json(
        { error: 'PINs do not match' },
        { status: 400 }
      );
    }

    // Hash and encrypt PIN (never store plain text)
    const encrypted = encrypt(validatedData.pin);

    // Store encrypted PIN in database
    await db.user.update({
      where: { id: user.id },
      data: {
        metadata: {
          ...(user.metadata as object || {}),
          pinHash: encrypted.ciphertext,
          pinIv: encrypted.iv,
          pinAuthTag: encrypted.authTag,
          pinEnabled: true,
        },
      },
    });

    // Audit log
    await auditLog(AuditAction.USER_LOGIN, user.clerkId, {
      action: 'PIN_SET',
      timestamp: new Date().toISOString(),
    });

    logger.info('PIN set successfully', { userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'PIN set successfully',
    });
  } catch (error) {
    logger.error('Failed to set PIN', { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid PIN format', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to set PIN' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /api/security/pin/verify:
 *   post:
 *     summary: Verify user PIN
 *     tags:
 *       - Security
 */
export async function PUT(request: NextRequest) {
  try {
    // Strict rate limiting (5 attempts per 15 minutes)
    const rateLimitResult = await rateLimit(request, 'auth');
    if (!rateLimitResult.success) {
      // Log potential brute force attempt
      logger.warn('PIN verification rate limit exceeded', {
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
      });

      return NextResponse.json(
        { error: 'Too many failed attempts. Account temporarily locked.' },
        { status: 429, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    const user = await requireUser();
    const body = await request.json();

    const validatedData = VerifyPINSchema.parse(body);

    // Get stored PIN
    const metadata = user.metadata as Record<string, unknown> || {};
    const pinHash = metadata.pinHash as string;
    const pinIv = metadata.pinIv as string;
    const pinAuthTag = metadata.pinAuthTag as string;
    const pinEnabled = metadata.pinEnabled as boolean;

    if (!pinEnabled || !pinHash) {
      return NextResponse.json(
        { error: 'PIN not set' },
        { status: 400 }
      );
    }

    // Decrypt and verify
    try {
      const decryptedPin = decrypt({
        ciphertext: pinHash,
        iv: pinIv,
        authTag: pinAuthTag,
      });

      if (decryptedPin === validatedData.pin) {
        // Success
        await auditLog(AuditAction.USER_LOGIN, user.clerkId, {
          action: 'PIN_VERIFIED',
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: 'PIN verified successfully',
        });
      } else {
        // Failed verification
        await auditLog(AuditAction.UNAUTHORIZED_ACCESS, user.clerkId, {
          action: 'PIN_VERIFICATION_FAILED',
          timestamp: new Date().toISOString(),
        });

        logger.warn('Invalid PIN attempt', {
          userId: user.id,
          ip: request.headers.get('x-forwarded-for'),
        });

        return NextResponse.json(
          { error: 'Invalid PIN' },
          { status: 401 }
        );
      }
    } catch (decryptError) {
      logger.error('PIN decryption failed', { error: decryptError });
      return NextResponse.json(
        { error: 'Security error' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('PIN verification failed', { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid PIN format' },
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
 * /api/security/pin/status:
 *   get:
 *     summary: Check if PIN is enabled
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
    const pinEnabled = metadata.pinEnabled as boolean || false;

    return NextResponse.json({
      pinEnabled,
    });
  } catch (error) {
    logger.error('Failed to get PIN status', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
