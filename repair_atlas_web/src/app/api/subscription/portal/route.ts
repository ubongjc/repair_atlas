import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createPortalSession } from '@/lib/stripe';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'authenticated');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult),
        }
      );
    }

    const user = await requireUser();

    // Get subscription
    const subscription = await db.subscription.findUnique({
      where: { clerkUserId: user.clerkId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Create portal session
    const session = await createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    logger.error('Failed to create portal session', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
