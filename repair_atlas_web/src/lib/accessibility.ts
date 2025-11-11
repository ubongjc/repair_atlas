/**
 * Accessibility Utilities
 * - WCAG 2.1 AA compliant helpers
 * - Focus management
 * - Keyboard navigation
 * - Screen reader utilities
 */

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  return true;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  return elements.filter(isFocusable);
}

/**
 * Move focus to an element and scroll it into view
 */
export function focusElement(element: HTMLElement, options?: ScrollIntoViewOptions) {
  element.focus();
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    ...options,
  });
}

/**
 * Trap focus within a container
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();

  return () => document.removeEventListener('keydown', handleKeyDown);
}

/**
 * Announce a message to screen readers
 */
export function announceToScreenReader(
  message: string,
  politeness: 'polite' | 'assertive' = 'polite'
) {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', politeness);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  document.body.appendChild(liveRegion);

  // Small delay to ensure screen reader picks it up
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
}

/**
 * Generate a unique ID for accessibility relationships
 */
let idCounter = 0;
export function generateAriaId(prefix = 'aria'): string {
  idCounter++;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Get color contrast ratio between two colors
 * - WCAG 2.1 requires 4.5:1 for normal text
 * - WCAG 2.1 requires 3:1 for large text
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string) => {
    // Simplified luminance calculation
    // In production, use a proper color library
    return 0.5; // Placeholder
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Keyboard event handlers
 */
export const KeyboardHandlers = {
  onEnterOrSpace: (callback: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  },

  onEscape: (callback: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      callback();
    }
  },

  onArrowKeys: (callbacks: {
    onUp?: () => void;
    onDown?: () => void;
    onLeft?: () => void;
    onRight?: () => void;
  }) => (e: React.KeyboardEvent) => {
    const { onUp, onDown, onLeft, onRight } = callbacks;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onUp?.();
        break;
      case 'ArrowDown':
        e.preventDefault();
        onDown?.();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onLeft?.();
        break;
      case 'ArrowRight':
        e.preventDefault();
        onRight?.();
        break;
    }
  },
};

/**
 * ARIA attributes helpers
 */
export const AriaHelpers = {
  /**
   * Create ARIA attributes for a button that controls a disclosure (expandable content)
   */
  disclosureButton: (isExpanded: boolean, controlsId: string) => ({
    'aria-expanded': isExpanded,
    'aria-controls': controlsId,
  }),

  /**
   * Create ARIA attributes for a disclosure panel
   */
  disclosurePanel: (isExpanded: boolean, id: string) => ({
    id,
    hidden: !isExpanded,
    'aria-hidden': !isExpanded,
  }),

  /**
   * Create ARIA attributes for a tab button
   */
  tabButton: (isSelected: boolean, controlsId: string, id: string) => ({
    role: 'tab',
    'aria-selected': isSelected,
    'aria-controls': controlsId,
    id,
    tabIndex: isSelected ? 0 : -1,
  }),

  /**
   * Create ARIA attributes for a tab panel
   */
  tabPanel: (isSelected: boolean, labelledById: string, id: string) => ({
    role: 'tabpanel',
    'aria-labelledby': labelledById,
    id,
    hidden: !isSelected,
    tabIndex: 0,
  }),
};
