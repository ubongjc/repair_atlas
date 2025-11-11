import Stripe from 'stripe';
import { db } from './db';
import { logger } from './logger';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Price IDs - set these in environment variables
export const PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
};

export async function createCustomer(params: {
  email: string;
  clerkUserId: string;
  name?: string;
}): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email: params.email,
      metadata: {
        clerkUserId: params.clerkUserId,
      },
      name: params.name,
    });

    logger.info('Stripe customer created', {
      customerId: customer.id,
      clerkUserId: params.clerkUserId,
    });

    return customer;
  } catch (error) {
    logger.error('Failed to create Stripe customer', { error, params });
    throw error;
  }
}

export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  clerkUserId: string;
}): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: params.customerId,
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        clerkUserId: params.clerkUserId,
      },
      subscription_data: {
        metadata: {
          clerkUserId: params.clerkUserId,
        },
      },
    });

    logger.info('Checkout session created', {
      sessionId: session.id,
      customerId: params.customerId,
    });

    return session;
  } catch (error) {
    logger.error('Failed to create checkout session', { error, params });
    throw error;
  }
}

export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });

    logger.info('Portal session created', {
      sessionId: session.id,
      customerId: params.customerId,
    });

    return session;
  } catch (error) {
    logger.error('Failed to create portal session', { error, params });
    throw error;
  }
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    logger.info('Subscription cancelled', {
      subscriptionId,
    });

    return subscription;
  } catch (error) {
    logger.error('Failed to cancel subscription', { error, subscriptionId });
    throw error;
  }
}

export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    logger.info('Subscription reactivated', {
      subscriptionId,
    });

    return subscription;
  } catch (error) {
    logger.error('Failed to reactivate subscription', {
      error,
      subscriptionId,
    });
    throw error;
  }
}

export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

export async function getCustomer(customerId: string): Promise<Stripe.Customer> {
  return await stripe.customers.retrieve(customerId) as Stripe.Customer;
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not set');
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    logger.error('Webhook signature verification failed', { error });
    throw error;
  }
}

export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const clerkUserId = subscription.metadata.clerkUserId;
  const customerId = subscription.customer as string;

  if (!clerkUserId) {
    logger.error('Missing clerkUserId in subscription metadata', {
      subscriptionId: subscription.id,
    });
    return;
  }

  try {
    await db.subscription.create({
      data: {
        clerkUserId,
        stripeCustomerId: customerId,
        stripePriceId: subscription.items.data[0].price.id,
        status: subscription.status === 'active' ? 'ACTIVE' : 'TRIALING',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    // Update user role to PRO
    await db.user.update({
      where: { clerkId: clerkUserId },
      data: { role: 'PRO' },
    });

    logger.info('Subscription created in database', {
      clerkUserId,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    logger.error('Failed to handle subscription created', {
      error,
      subscriptionId: subscription.id,
    });
    throw error;
  }
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;

  try {
    await db.subscription.update({
      where: { stripeCustomerId: customerId },
      data: {
        stripePriceId: subscription.items.data[0].price.id,
        status: subscription.status === 'active' ? 'ACTIVE' : subscription.status === 'past_due' ? 'PAST_DUE' : 'CANCELED',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    logger.info('Subscription updated in database', {
      customerId,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    logger.error('Failed to handle subscription updated', {
      error,
      subscriptionId: subscription.id,
    });
    throw error;
  }
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;
  const clerkUserId = subscription.metadata.clerkUserId;

  try {
    await db.subscription.update({
      where: { stripeCustomerId: customerId },
      data: {
        status: 'CANCELED',
      },
    });

    // Downgrade user to USER role
    if (clerkUserId) {
      await db.user.update({
        where: { clerkId: clerkUserId },
        data: { role: 'USER' },
      });
    }

    logger.info('Subscription deleted in database', {
      customerId,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    logger.error('Failed to handle subscription deleted', {
      error,
      subscriptionId: subscription.id,
    });
    throw error;
  }
}

export async function getUserSubscription(clerkUserId: string): Promise<{
  active: boolean;
  subscription?: {
    status: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  };
}> {
  try {
    const subscription = await db.subscription.findUnique({
      where: { clerkUserId },
    });

    if (!subscription) {
      return { active: false };
    }

    return {
      active: subscription.status === 'ACTIVE' || subscription.status === 'TRIALING',
      subscription: {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    };
  } catch (error) {
    logger.error('Failed to get user subscription', { error, clerkUserId });
    return { active: false };
  }
}

export async function checkSubscriptionAccess(clerkUserId: string): Promise<boolean> {
  const { active } = await getUserSubscription(clerkUserId);
  return active;
}
