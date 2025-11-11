import * as React from 'react';
import { Package, AlertCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50',
        className
      )}
    >
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        {icon || <Package className="h-10 w-10 text-muted-foreground" />}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function NoItemsFound() {
  return (
    <EmptyState
      icon={<Search className="h-10 w-10 text-muted-foreground" />}
      title="No items found"
      description="We couldn't find any items matching your search. Try adjusting your filters or search terms."
    />
  );
}

export function NoDevicesYet({ onAddDevice }: { onAddDevice?: () => void }) {
  return (
    <EmptyState
      icon={<Package className="h-10 w-10 text-muted-foreground" />}
      title="No devices yet"
      description="Get started by identifying your first device. Just take a photo and we'll handle the rest!"
      action={
        onAddDevice
          ? {
              label: 'Identify Device',
              onClick: onAddDevice,
            }
          : undefined
      }
    />
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error. Please try again later.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-10 w-10 text-destructive" />}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}
