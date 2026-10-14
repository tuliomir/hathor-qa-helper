/**
 * Smoke tests for valuesUtils
 * Tests time formatting utilities
 */

import { describe, test, expect } from 'bun:test';
import { formatTimeUntil } from '../src/utils/valuesUtils';

describe('valuesUtils', () => {
  describe('formatTimeUntil', () => {
    test('returns empty string for null input', () => {
      const result = formatTimeUntil(null);
      expect(result).toBe('');
    });

    test('returns empty string for undefined input', () => {
      const result = formatTimeUntil(undefined);
      expect(result).toBe('');
    });

    test('returns "invalid date" for invalid date string', () => {
      const result = formatTimeUntil('not a date');
      expect(result).toBe('invalid date');
    });

    test('returns "expired" for past date', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const result = formatTimeUntil(pastDate);
      expect(result).toBe('expired');
    });

    test('formats seconds when less than a minute', () => {
      const futureDate = new Date(Date.now() + 45 * 1000).toISOString();
      const result = formatTimeUntil(futureDate);

      // Should show seconds format
      expect(result).toMatch(/\d+s/);
    });

    test('formats minutes and seconds', () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const result = formatTimeUntil(futureDate);

      // Should show minutes
      expect(result).toMatch(/\d+m/);
    });

    test('formats hours and minutes', () => {
      const futureDate = new Date(Date.now() + (2 * 60 + 30) * 60 * 1000).toISOString();
      const result = formatTimeUntil(futureDate);

      // Should show hours
      expect(result).toMatch(/\d+h/);
    });

    test('formats days, hours, and minutes', () => {
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const result = formatTimeUntil(futureDate);

      // Should show days
      expect(result).toMatch(/\d+d/);
    });

    test('returns valid string format', () => {
      const futureDate = new Date(Date.now() + 1000).toISOString();
      const result = formatTimeUntil(futureDate);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
