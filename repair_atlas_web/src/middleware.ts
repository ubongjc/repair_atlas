import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSecurityHeaders, detectSuspiciousActivity } from './lib/security';
import { logger } from './lib/logger';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Detect suspicious activity
  const suspiciousCheck = detectSuspiciousActivity({
    ip: request.ip || request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    path: request.nextUrl.pathname,
  });

  if (suspiciousCheck.suspicious) {
    logger.warn('Suspicious activity detected', {
      path: request.nextUrl.pathname,
      ip: request.ip,
      reasons: suspiciousCheck.reasons,
    });

    // Log but don't block for now - in production, consider blocking
  }

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Get response (either from Clerk or pass through)
  const response = NextResponse.next();

  // Add security headers to all responses
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
