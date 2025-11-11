import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Visually Hidden Component
 * - Hides content visually but keeps it accessible to screen readers
 * - WCAG 2.1 compliant
 * - Can be made visible on focus
 */
interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  focusable?: boolean;
}

export function VisuallyHidden({
  children,
  focusable = false,
  className,
  ...props
}: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        'sr-only',
        focusable && 'focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-background focus:text-foreground focus:border focus:rounded',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
