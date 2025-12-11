/**
 * Smoke tests for balanceUtils
 * Tests basic balance formatting functionality
 */

import { describe, test, expect } from 'bun:test';
import { formatBalance } from '../src/utils/balanceUtils';

describe('balanceUtils', () => {
  describe('formatBalance', () => {
    test('formats bigint balance correctly', () => {
      const balance = BigInt(123456);
      const result = formatBalance(balance, 2);

      // Should format with decimal places (123456 with 2 decimals = 1234.56)
      expect(result).toContain('1,234.56');
    });

    test('formats string balance correctly', () => {
      const balance = '123456';
      const result = formatBalance(balance, 2);

      expect(result).toContain('1,234.56');
    });

    test('handles undefined balance', () => {
      const result = formatBalance(undefined, 2);

      expect(result).toBe('0.00');
    });

    test('handles zero balance', () => {
      const balance = BigInt(0);
      const result = formatBalance(balance, 2);

      expect(result).toContain('0.00');
    });

    test('uses default decimal places when not specified', () => {
      const balance = BigInt(100);
      const result = formatBalance(balance);

      // Should use default DECIMAL_PLACES constant
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    // Edge case: very large balance
    test('handles large balance values', () => {
      const balance = BigInt('999999999999999');
      const result = formatBalance(balance, 2);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
