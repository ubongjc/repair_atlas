'use client';

import * as React from 'react';

/**
 * Live Region Component
 * - Announces dynamic content changes to screen readers
 * - ARIA live regions for real-time updates
 */
interface LiveRegionProps {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = false,
  relevant = 'additions text',
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="sr-only"
    >
      {children}
    </div>
  );
}

/**
 * Status Message Component
 * - For status updates (form submission, loading states)
 */
export function StatusMessage({ children }: { children: React.ReactNode }) {
  return (
    <LiveRegion politeness="polite" atomic>
      {children}
    </LiveRegion>
  );
}

/**
 * Alert Message Component
 * - For urgent messages (errors, warnings)
 */
export function AlertMessage({ children }: { children: React.ReactNode }) {
  return (
    <LiveRegion politeness="assertive" atomic>
      {children}
    </LiveRegion>
  );
}
