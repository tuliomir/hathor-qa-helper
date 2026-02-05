/**
 * Console error collector for smoke tests.
 * Captures console.error and uncaught page errors, then asserts
 * that no unexpected critical errors occurred.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Patterns that are expected / non-critical and should be ignored. */
const IGNORED_PATTERNS = [
  // WalletConnect noise
  /WalletConnect/i,
  /walletconnect/i,
  // CloudSync background errors
  /CloudSync/i,
  /cloud.*sync/i,
  // Missing wallet selection on first load
  /No wallet selected/i,
  /wallet.*not.*found/i,
  // QA progress loading from localStorage
  /QA progress/i,
  // React StrictMode double-render warnings
  /findDOMNode is deprecated/i,
  // Vite HMR noise
  /\[vite\]/i,
  // Network errors that are expected in test env (no real backend)
  /Failed to fetch/i,
  /NetworkError/i,
  /ERR_CONNECTION_REFUSED/i,
  /net::ERR_/i,
  // Service worker registration failures in test
  /service.*worker/i,
];

export interface ConsoleCollector {
  errors: string[];
  assertNoCriticalErrors: (label: string) => void;
}

/**
 * Attach listeners to a page and return a collector object.
 * Call this once after page creation.
 */
export function createConsoleCollector(page: Page): ConsoleCollector {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  return {
    errors,
    assertNoCriticalErrors(label: string) {
      const critical = errors.filter(
        (msg) => !IGNORED_PATTERNS.some((pattern) => pattern.test(msg))
      );

      // Clear collected errors for the next check
      errors.length = 0;

      expect(
        critical,
        `Unexpected console errors on "${label}":\n${critical.join('\n')}`
      ).toHaveLength(0);
    },
  };
}
