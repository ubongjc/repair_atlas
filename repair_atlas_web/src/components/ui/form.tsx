'use client';

import * as React from 'react';
import { Label } from './label';
import { Input, InputProps } from './input';
import { cn } from '@/lib/utils';

/**
 * FormField Component
 * - Combines Label + Input with proper accessibility
 * - Error handling
 * - Helper text support
 * - Responsive layout
 */
interface FormFieldProps extends InputProps {
  label: string;
  helperText?: string;
  required?: boolean;
}

export function FormField({
  label,
  helperText,
  required,
  error,
  className,
  ...inputProps
}: FormFieldProps) {
  const id = inputProps.id || `field-${React.useId()}`;

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <Input
        id={id}
        error={error}
        required={required}
        aria-required={required}
        {...inputProps}
      />
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

/**
 * FormSection Component
 * - Groups related form fields
 * - Accessible fieldset/legend pattern
 */
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  if (!title) {
    return <div className={cn('space-y-4', className)}>{children}</div>;
  }

  return (
    <fieldset className={cn('space-y-4 border-t pt-6 first:border-t-0 first:pt-0', className)}>
      <legend className="text-lg font-semibold">{title}</legend>
      {description && (
        <p className="text-sm text-muted-foreground -mt-2">{description}</p>
      )}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

/**
 * FormError Component
 * - Display form-level errors
 * - Accessible error announcement
 */
interface FormErrorProps {
  error: string;
  className?: string;
}

export function FormError({ error, className }: FormErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border border-destructive bg-destructive/10 p-4',
        className
      )}
    >
      <p className="text-sm font-medium text-destructive">{error}</p>
    </div>
  );
}

/**
 * FormSuccess Component
 * - Display success messages
 */
interface FormSuccessProps {
  message: string;
  className?: string;
}

export function FormSuccess({ message, className }: FormSuccessProps) {
  return (
    <div
      role="status"
      className={cn(
        'rounded-md border border-green-500 bg-green-50 dark:bg-green-950 p-4',
        className
      )}
    >
      <p className="text-sm font-medium text-green-900 dark:text-green-100">
        {message}
      </p>
    </div>
  );
}
