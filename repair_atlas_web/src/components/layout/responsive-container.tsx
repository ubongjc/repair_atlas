'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: boolean;
}

/**
 * Responsive Container Component
 * - Works seamlessly across laptop, iPad, Android, iPhone
 * - Adapts padding and width based on screen size
 * - Supports different max-width sizes
 */
export function ResponsiveContainer({
  size = 'xl',
  padding = true,
  className,
  children,
  ...props
}: ResponsiveContainerProps) {
  const sizeClasses = {
    sm: 'max-w-screen-sm',   // 640px
    md: 'max-w-screen-md',   // 768px
    lg: 'max-w-screen-lg',   // 1024px
    xl: 'max-w-screen-xl',   // 1280px
    full: 'max-w-full',
  };

  return (
    <div
      className={cn(
        'w-full mx-auto',
        sizeClasses[size],
        padding && 'px-4 sm:px-6 lg:px-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Responsive Grid Component
 * - Adapts columns based on screen size
 * - Mobile: 1 column
 * - Tablet: 2 columns
 * - Laptop: 3+ columns
 */
interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: {
    mobile?: number;
    tablet?: number;
    laptop?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

export function ResponsiveGrid({
  cols = { mobile: 1, tablet: 2, laptop: 3, desktop: 4 },
  gap = 'md',
  className,
  children,
  ...props
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8',
  };

  const colClasses = cn(
    'grid',
    cols.mobile && `grid-cols-${cols.mobile}`,
    cols.tablet && `sm:grid-cols-${cols.tablet}`,
    cols.laptop && `lg:grid-cols-${cols.laptop}`,
    cols.desktop && `xl:grid-cols-${cols.desktop}`,
    gapClasses[gap]
  );

  return (
    <div className={cn(colClasses, className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Responsive Stack Component
 * - Stacks vertically on mobile
 * - Can switch to horizontal on larger screens
 */
interface ResponsiveStackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'vertical' | 'horizontal-on-tablet' | 'horizontal-on-laptop';
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end';
}

export function ResponsiveStack({
  direction = 'vertical',
  gap = 'md',
  align = 'start',
  className,
  children,
  ...props
}: ResponsiveStackProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  };

  const directionClasses = {
    vertical: 'flex-col',
    'horizontal-on-tablet': 'flex-col sm:flex-row',
    'horizontal-on-laptop': 'flex-col lg:flex-row',
  };

  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        gapClasses[gap],
        alignClasses[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Mobile-First Wrapper
 * - Optimized spacing for touch targets
 * - Minimum 44x44px touch areas (iOS guideline)
 */
export function MobileFriendly({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-h-[44px]', // iOS minimum touch target
        'touch-manipulation', // Disable double-tap zoom
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Responsive Show/Hide Components
 * - Show or hide content based on breakpoints
 */
export function ShowOnMobile({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('block sm:hidden', className)}>{children}</div>;
}

export function HideOnMobile({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('hidden sm:block', className)}>{children}</div>;
}

export function ShowOnTablet({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('hidden sm:block lg:hidden', className)}>{children}</div>
  );
}

export function ShowOnLaptop({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('hidden lg:block', className)}>{children}</div>;
}
