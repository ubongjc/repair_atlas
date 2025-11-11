/**
 * Application Monitoring
 * - Health checks
 * - Error tracking
 * - Performance metrics
 * - Alerting
 */

import { logger } from './logger';

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  timestamp: Date;
}

export interface SystemMetrics {
  cpu?: number;
  memory?: number;
  activeUsers?: number;
  requestRate?: number;
  errorRate?: number;
}

/**
 * Health check system
 */
export class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();

  /**
   * Register a health check
   */
  async checkService(
    service: string,
    checker: () => Promise<{ healthy: boolean; latency?: number; message?: string }>
  ): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const result = await checker();
      const latency = result.latency || Date.now() - startTime;

      const check: HealthCheck = {
        service,
        status: result.healthy ? 'healthy' : 'degraded',
        latency,
        message: result.message,
        timestamp: new Date(),
      };

      this.checks.set(service, check);
      return check;
    } catch (error) {
      const check: HealthCheck = {
        service,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };

      this.checks.set(service, check);
      logger.error(`Health check failed for ${service}`, { error });
      return check;
    }
  }

  /**
   * Get all health checks
   */
  getAllChecks(): HealthCheck[] {
    return Array.from(this.checks.values());
  }

  /**
   * Get overall system health
   */
  getOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const checks = this.getAllChecks();
    if (checks.length === 0) return 'healthy';

    const unhealthy = checks.filter((c) => c.status === 'unhealthy');
    const degraded = checks.filter((c) => c.status === 'degraded');

    if (unhealthy.length > 0) return 'unhealthy';
    if (degraded.length > 0) return 'degraded';
    return 'healthy';
  }
}

/**
 * Error monitoring
 */
export class ErrorMonitor {
  private errorCounts: Map<string, number> = new Map();
  private readonly threshold = 10; // Alert after 10 errors of same type

  /**
   * Track an error
   */
  trackError(error: Error, context?: Record<string, unknown>): void {
    const errorKey = `${error.name}:${error.message}`;
    const count = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, count);

    logger.error('Application error', {
      error: error.message,
      stack: error.stack,
      context,
      count,
    });

    // Alert if threshold exceeded
    if (count >= this.threshold) {
      this.sendAlert({
        severity: 'high',
        title: `High error frequency: ${error.name}`,
        message: `Error occurred ${count} times: ${error.message}`,
        context,
      });
    }
  }

  /**
   * Send alert
   */
  private sendAlert(alert: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    context?: Record<string, unknown>;
  }): void {
    logger.error('[ALERT]', alert);
    // TODO: Integrate with alerting service (PagerDuty, Opsgenie, etc.)
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { errorType: string; count: number }[] {
    return Array.from(this.errorCounts.entries()).map(([errorType, count]) => ({
      errorType,
      count,
    }));
  }

  /**
   * Reset error counts
   */
  reset(): void {
    this.errorCounts.clear();
  }
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Track a metric
   */
  trackMetric(name: string, value: number): void {
    const values = this.metrics.get(name) || [];
    values.push(value);

    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }

    this.metrics.set(name, values);
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name: string): {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);

    return {
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Track API latency
   */
  trackApiLatency(endpoint: string, latency: number): void {
    this.trackMetric(`api_latency:${endpoint}`, latency);

    // Alert on slow API calls
    if (latency > 3000) {
      logger.warn('Slow API call detected', { endpoint, latency });
    }
  }

  /**
   * Track database query time
   */
  trackDbQuery(query: string, duration: number): void {
    this.trackMetric('db_query_time', duration);

    if (duration > 1000) {
      logger.warn('Slow database query', { query, duration });
    }
  }
}

/**
 * Global monitoring instances
 */
export const healthMonitor = new HealthMonitor();
export const errorMonitor = new ErrorMonitor();
export const performanceMonitor = new PerformanceMonitor();

/**
 * Initialize monitoring
 */
export function initializeMonitoring() {
  // Set up periodic health checks
  if (typeof window === 'undefined') {
    // Server-side health checks
    setInterval(async () => {
      await healthMonitor.checkService('database', async () => {
        // TODO: Ping database
        return { healthy: true, latency: 10 };
      });

      await healthMonitor.checkService('storage', async () => {
        // TODO: Check R2 storage
        return { healthy: true, latency: 50 };
      });
    }, 60000); // Every minute
  }

  // Set up global error handler
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      errorMonitor.trackError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      errorMonitor.trackError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        { reason: event.reason }
      );
    });
  }

  logger.info('Monitoring initialized');
}

/**
 * Utility to wrap async functions with monitoring
 */
export function monitoredAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  name: string
): T {
  return (async (...args: unknown[]) => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      performanceMonitor.trackMetric(`function:${name}`, duration);
      return result;
    } catch (error) {
      errorMonitor.trackError(error as Error, { function: name, args });
      throw error;
    }
  }) as T;
}
