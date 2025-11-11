'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Skip to Content Link
 * - WCAG 2.1 AA requirement
 * - Allows keyboard users to skip navigation
 * - Only visible when focused
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className={cn(
        'sr-only focus:not-sr-only',
        'fixed top-4 left-4 z-50',
        'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'transition-all'
      )}
    >
      Skip to main content
    </a>
  );
}

/**
 * Main Content Landmark
 * - Wraps main content area
 * - Provides proper ARIA landmark
 */
export function MainContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main id="main-content" className={className} tabIndex={-1}>
      {children}
    </main>
  );
}
