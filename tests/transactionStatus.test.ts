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

    test('handles empty transaction object as Unconfirmed', () => {
      const tx = {};
      const result = getTransactionStatus(tx);

      expect(result).toBe('Unconfirmed');
    });

    // Bug scenario: TxStatus.tsx calls getTransactionStatus with only
    // { first_block, is_voided } (no nc_* fields) even for nano contract txs.
    // This must still return Unconfirmed when first_block is null.
    describe('called without nc_* fields (TxStatus.tsx code paths)', () => {
      test('returns Unconfirmed when first_block is null and is_voided is false', () => {
        const tx = { first_block: null, is_voided: false };
        const result = getTransactionStatus(tx);

        expect(result).toBe('Unconfirmed');
      });

      test('returns Unconfirmed when first_block is undefined and is_voided is false', () => {
        const tx = { is_voided: false };
        const result = getTransactionStatus(tx);

        expect(result).toBe('Unconfirmed');
      });

      test('returns Valid when first_block is present and is_voided is false', () => {
        const tx = { first_block: 'blockhash123', is_voided: false };
        const result = getTransactionStatus(tx);

        expect(result).toBe('Valid');
      });

      test('returns Voided when is_voided is true regardless of first_block', () => {
        expect(getTransactionStatus({ first_block: null, is_voided: true })).toBe('Voided');
        expect(getTransactionStatus({ first_block: 'blockhash', is_voided: true })).toBe('Voided');
      });
    });

    describe('non-nano regular transactions', () => {
      test('returns Unconfirmed for regular tx without first_block', () => {
        const tx = { voided: false };
        const result = getTransactionStatus(tx);

        expect(result).toBe('Unconfirmed');
      });

      test('returns Valid for regular tx with first_block', () => {
        const tx = { first_block: 'blockhash', voided: false };
        const result = getTransactionStatus(tx);

        expect(result).toBe('Valid');
      });
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
