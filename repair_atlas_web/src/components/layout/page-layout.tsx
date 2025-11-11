'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ResponsiveContainer } from './responsive-container';
import { fadeInUp, staggerContainer } from '@/lib/animations';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  animate?: boolean;
}

/**
 * Standard Page Layout Component
 * - Consistent spacing and structure
 * - Responsive design for all devices
 * - Optional animations
 * - Supports page title, description, and action buttons
 */
export function PageLayout({
  children,
  title,
  description,
  actions,
  maxWidth = 'xl',
  className,
  animate = true,
}: PageLayoutProps) {
  const content = (
    <ResponsiveContainer size={maxWidth} className={cn('py-6 sm:py-8 lg:py-10', className)}>
      {(title || description || actions) && (
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              {title && (
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      <div>{children}</div>
    </ResponsiveContainer>
  );

  if (animate) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

/**
 * Section Component for organizing page content
 */
interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  spacing?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export function Section({
  children,
  title,
  description,
  actions,
  spacing = 'md',
  animate = true,
  className,
  ...props
}: SectionProps) {
  const spacingClasses = {
    sm: 'mb-6',
    md: 'mb-8 sm:mb-10',
    lg: 'mb-10 sm:mb-12',
  };

  const content = (
    <section
      className={cn(spacingClasses[spacing], className)}
      {...props}
    >
      {(title || description || actions) && (
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              {title && (
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm sm:text-base text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </section>
  );

  if (animate) {
    return (
      <motion.div variants={fadeInUp}>
        {content}
      </motion.div>
    );
  }

  return content;
}

/**
 * Card Grid Layout
 * - Responsive grid for cards
 * - Automatically adapts to screen size
 */
interface CardGridProps {
  children: React.ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    laptop?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CardGrid({
  children,
  columns = { mobile: 1, tablet: 2, laptop: 3, desktop: 4 },
  gap = 'md',
  className,
}: CardGridProps) {
  const gapClasses = {
    sm: 'gap-3 sm:gap-4',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8',
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn(
        'grid',
        `grid-cols-${columns.mobile || 1}`,
        `sm:grid-cols-${columns.tablet || 2}`,
        `lg:grid-cols-${columns.laptop || 3}`,
        `xl:grid-cols-${columns.desktop || 4}`,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </motion.div>
  );
}
