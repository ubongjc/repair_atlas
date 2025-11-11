import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  constructWebhookEvent,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { logPaymentEvent, AuditAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logger.warn('Missing Stripe signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Construct and verify webhook event
    const event = await constructWebhookEvent(body, signature);

    logger.info('Stripe webhook received', {
      type: event.type,
      id: event.id,
    });

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        await logPaymentEvent(
          AuditAction.SUBSCRIPTION_CREATED,
          subscription.metadata.clerkUserId,
          true,
          { subscriptionId: subscription.id }
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        await logPaymentEvent(
          AuditAction.SUBSCRIPTION_UPDATED,
          subscription.metadata.clerkUserId,
          true,
          { subscriptionId: subscription.id }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        await logPaymentEvent(
          AuditAction.SUBSCRIPTION_CANCELLED,
          subscription.metadata.clerkUserId,
          true,
          { subscriptionId: subscription.id }
        );
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        logger.info('Payment succeeded', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
        });
        // TODO: Send receipt email
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        logger.warn('Payment failed', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
        });
        // TODO: Send payment failed email
        break;
      }

      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error', { error });
    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 400 }
    );
  }
}
