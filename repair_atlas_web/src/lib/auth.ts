import { auth } from '@clerk/nextjs/server';
import { db } from './db';

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function hasRole(role: 'USER' | 'PRO' | 'ADMIN') {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  if (role === 'ADMIN') {
    return user.role === 'ADMIN';
  }

  if (role === 'PRO') {
    return user.role === 'PRO' || user.role === 'ADMIN';
  }

  return true; // USER role - everyone has this
}
