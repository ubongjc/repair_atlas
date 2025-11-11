import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getUserSubscription } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
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

    const subscriptionStatus = await getUserSubscription(user.clerkId);

    return NextResponse.json({
      active: subscriptionStatus.active,
      subscription: subscriptionStatus.subscription,
      userRole: user.role,
    });
  } catch (error) {
    logger.error('Failed to get subscription status', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
