/**
 * Analytics and Event Tracking
 * - User behavior tracking
 * - Performance monitoring
 * - Error tracking
 * - Privacy-first approach
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

/**
 * Track custom events
 */
export function trackEvent(event: AnalyticsEvent): void {
  const enrichedEvent = {
    ...event,
    timestamp: event.timestamp || new Date(),
    sessionId: event.sessionId || getSessionId(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', enrichedEvent);
  }

  // TODO: Send to analytics service (Google Analytics, Mixpanel, Posthog, etc.)
  // Example: sendToAnalyticsService(enrichedEvent);
}

/**
 * Track page views
 */
export function trackPageView(page: string, properties?: Record<string, unknown>): void {
  trackEvent({
    name: 'page_view',
    properties: {
      page,
      ...properties,
    },
  });
}

/**
 * Track user actions
 */
export const AnalyticsActions = {
  // Device identification
  deviceIdentified: (deviceInfo: { brand?: string; model?: string; confidence?: number }) => {
    trackEvent({
      name: 'device_identified',
      properties: deviceInfo,
    });
  },

  // Repair flow
  defectReported: (defectInfo: { severity: string; symptoms: string[] }) => {
    trackEvent({
      name: 'defect_reported',
      properties: defectInfo,
    });
  },

  repairGuideViewed: (guideId: string, difficulty: string) => {
    trackEvent({
      name: 'repair_guide_viewed',
      properties: { guideId, difficulty },
    });
  },

  repairStarted: (guideId: string) => {
    trackEvent({
      name: 'repair_started',
      properties: { guideId },
    });
  },

  repairCompleted: (guideId: string, timeSpent: number) => {
    trackEvent({
      name: 'repair_completed',
      properties: { guideId, timeSpent },
    });
  },

  // Parts & Tools
  partSearched: (query: string, resultsCount: number) => {
    trackEvent({
      name: 'part_searched',
      properties: { query, resultsCount },
    });
  },

  partClicked: (partNumber: string, vendor: string, price: number) => {
    trackEvent({
      name: 'part_clicked',
      properties: { partNumber, vendor, price },
    });
  },

  toolViewed: (toolName: string, category: string) => {
    trackEvent({
      name: 'tool_viewed',
      properties: { toolName, category },
    });
  },

  // Subscription
  subscriptionStarted: (plan: string) => {
    trackEvent({
      name: 'subscription_started',
      properties: { plan },
    });
  },

  subscriptionCancelled: (plan: string, reason?: string) => {
    trackEvent({
      name: 'subscription_cancelled',
      properties: { plan, reason },
    });
  },

  // User engagement
  featureUsed: (featureName: string) => {
    trackEvent({
      name: 'feature_used',
      properties: { featureName },
    });
  },

  searchPerformed: (query: string, filters?: Record<string, unknown>) => {
    trackEvent({
      name: 'search_performed',
      properties: { query, ...filters },
    });
  },

  // Errors
  errorEncountered: (errorType: string, errorMessage: string, context?: Record<string, unknown>) => {
    trackEvent({
      name: 'error_encountered',
      properties: {
        errorType,
        errorMessage,
        ...context,
      },
    });
  },
};

/**
 * Performance tracking
 */
export const PerformanceTracking = {
  /**
   * Track page load time
   */
  trackPageLoad: () => {
    if (typeof window === 'undefined' || !window.performance) return;

    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;

    trackEvent({
      name: 'page_performance',
      properties: {
        pageLoadTime,
        domReadyTime,
        ttfb: perfData.responseStart - perfData.navigationStart,
      },
    });
  },

  /**
   * Track API call performance
   */
  trackApiCall: (endpoint: string, duration: number, status: number) => {
    trackEvent({
      name: 'api_performance',
      properties: {
        endpoint,
        duration,
        status,
      },
    });
  },

  /**
   * Track component render time
   */
  trackComponentRender: (componentName: string, renderTime: number) => {
    trackEvent({
      name: 'component_performance',
      properties: {
        componentName,
        renderTime,
      },
    });
  },
};

/**
 * User session management
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';

  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Hook for tracking component visibility
 */
export function useVisibilityTracking(elementId: string, trackingName: string) {
  if (typeof window === 'undefined') return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          trackEvent({
            name: 'element_visible',
            properties: {
              elementId,
              trackingName,
            },
          });
        }
      });
    },
    { threshold: 0.5 }
  );

  const element = document.getElementById(elementId);
  if (element) {
    observer.observe(element);
  }

  return () => observer.disconnect();
}

/**
 * Privacy-respecting user identification
 * - No PII collected
 * - Anonymous user ID
 */
export function getAnonymousUserId(): string {
  if (typeof window === 'undefined') return 'server-user';

  let userId = localStorage.getItem('analytics_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('analytics_user_id', userId);
  }
  return userId;
}
