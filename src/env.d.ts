/// <reference types="astro/client" />

interface Window {
  /** GA4 event helper defined in Analytics.astro. No-ops when GA4 is absent (dev builds log to console). */
  track?: (name: string, params?: Record<string, unknown>) => void;
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}
