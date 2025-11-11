import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, primary_email_address_id } = evt.data;

    const primaryEmail = email_addresses.find(
      (email) => email.id === primary_email_address_id
    );

    if (!primaryEmail) {
      return new Response('No primary email found', { status: 400 });
    }

    // Create user in database
    await db.user.create({
      data: {
        clerkId: id,
        email: primaryEmail.email_address,
        role: 'USER',
      },
    });
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, primary_email_address_id } = evt.data;

    const primaryEmail = email_addresses.find(
      (email) => email.id === primary_email_address_id
    );

    if (!primaryEmail) {
      return new Response('No primary email found', { status: 400 });
    }

    // Update user in database
    await db.user.update({
      where: { clerkId: id },
      data: {
        email: primaryEmail.email_address,
      },
    });
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    // Delete user from database
    await db.user.delete({
      where: { clerkId: id! },
    });
  }

  return new Response('', { status: 200 });
}
