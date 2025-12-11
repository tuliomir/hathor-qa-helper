/**
 * Smoke tests for transactionStatus utilities
 * Tests transaction status determination and styling
 */

import { describe, test, expect } from 'bun:test';
import {
  getTransactionStatus,
  getStatusColorClass,
  type TransactionStatus,
} from '../src/utils/transactionStatus';

describe('transactionStatus', () => {
  describe('getTransactionStatus', () => {
    test('returns "Voided" when transaction is voided', () => {
      const tx = { voided: true, firstBlock: 100 };
      const result = getTransactionStatus(tx);

      expect(result).toBe('Voided');
    });

    test('returns "Voided" when transaction is_voided is true', () => {
      const tx = { is_voided: true, first_block: 100 };
      const result = getTransactionStatus(tx);

      expect(result).toBe('Voided');
    });

    test('returns "Valid" for non-nano confirmed transaction', () => {
      const tx = { firstBlock: 100, voided: false };
      const result = getTransactionStatus(tx);

      expect(result).toBe('Valid');
    });

    test('returns "Unconfirmed" for nano transaction without firstBlock', () => {
      const tx = { nc_id: 'some-id', voided: false };
      const result = getTransactionStatus(tx);

      expect(result).toBe('Unconfirmed');
    });

    test('returns "Valid" for nano transaction with firstBlock', () => {
      const tx = { nc_id: 'some-id', firstBlock: 100, voided: false };
      const result = getTransactionStatus(tx);

      expect(result).toBe('Valid');
    });

    test('detects nano transaction by nc_blueprint_id', () => {
      const tx = { nc_blueprint_id: 'blueprint-id', voided: false };
      const result = getTransactionStatus(tx);

      expect(result).toBe('Unconfirmed');
    });

    test('detects nano transaction by nc_method', () => {
      const tx = { nc_method: 'some-method', voided: false };
      const result = getTransactionStatus(tx);

      expect(result).toBe('Unconfirmed');
    });

    test('handles empty transaction object', () => {
      const tx = {};
      const result = getTransactionStatus(tx);

      expect(result).toBe('Valid');
    });
  });

  describe('getStatusColorClass', () => {
    test('returns success class for Valid status', () => {
      const result = getStatusColorClass('Valid');

      expect(result).toBe('bg-success/10 text-success');
    });

    test('returns warning class for Unconfirmed status', () => {
      const result = getStatusColorClass('Unconfirmed');

      expect(result).toBe('bg-warning/10 text-warning');
    });

    test('returns danger class for Voided status', () => {
      const result = getStatusColorClass('Voided');

      expect(result).toBe('bg-danger/10 text-danger');
    });

    test('returns default class for Unknown status', () => {
      const result = getStatusColorClass('Unknown');

      expect(result).toBe('bg-gray-100 text-gray-600');
    });

    test('returns string for all valid statuses', () => {
      const statuses: TransactionStatus[] = ['Valid', 'Unconfirmed', 'Voided', 'Unknown'];

      statuses.forEach((status) => {
        const result = getStatusColorClass(status);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
