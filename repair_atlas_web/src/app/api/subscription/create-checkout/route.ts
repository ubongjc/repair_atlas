import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createCheckoutSession, createCustomer, PRICE_IDS } from '@/lib/stripe';
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
    const body = await request.json();
    const { priceId = PRICE_IDS.PRO_MONTHLY } = body;

    // Validate price ID
    if (!Object.values(PRICE_IDS).includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let subscription = await db.subscription.findUnique({
      where: { clerkUserId: user.clerkId },
    });

    let customerId: string;

    if (subscription) {
      customerId = subscription.stripeCustomerId;
    } else {
      // Create new Stripe customer
      const customer = await createCustomer({
        email: user.email,
        clerkUserId: user.clerkId,
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
      clerkUserId: user.clerkId,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('Failed to create checkout session', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
