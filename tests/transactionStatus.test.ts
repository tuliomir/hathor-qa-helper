/**
 * Tests for transactionStatus utilities
 *
 * Domain rule: Regular transactions are Valid as soon as they exist.
 * Nano contract transactions require a first_block to be considered confirmed.
 */

import { describe, test, expect } from 'bun:test';
import {
  getTransactionStatus,
  getStatusColorClass,
  type TransactionStatus,
} from '../src/utils/transactionStatus';

describe('transactionStatus', () => {
  describe('getTransactionStatus', () => {
    describe('voided transactions (highest priority)', () => {
      test('returns Voided when is_voided is true', () => {
        expect(getTransactionStatus({ is_voided: true })).toBe('Voided');
      });

      test('returns Voided when voided is true (alternate naming)', () => {
        expect(getTransactionStatus({ voided: true, firstBlock: 100 })).toBe('Voided');
      });

      test('returns Voided even with first_block present', () => {
        expect(getTransactionStatus({ first_block: 'abc', is_voided: true })).toBe('Voided');
      });

      test('returns Voided for nano tx when voided', () => {
        expect(getTransactionStatus({
          nc_id: '00dead',
          first_block: 'abc',
          is_voided: true,
        })).toBe('Voided');
      });
    });

    describe('regular (non-nano) transactions', () => {
      test('returns Valid without first_block', () => {
        expect(getTransactionStatus({ voided: false })).toBe('Valid');
      });

      test('returns Valid with first_block', () => {
        expect(getTransactionStatus({ first_block: 'abc', voided: false })).toBe('Valid');
      });

      test('returns Valid for empty transaction object', () => {
        expect(getTransactionStatus({})).toBe('Valid');
      });

      test('returns Valid with firstBlock (camelCase)', () => {
        expect(getTransactionStatus({ firstBlock: 100, voided: false })).toBe('Valid');
      });
    });

    describe('nano contract transactions', () => {
      test('returns Unconfirmed when nc_id present and no first_block', () => {
        expect(getTransactionStatus({ nc_id: '00dead' })).toBe('Unconfirmed');
      });

      test('returns Unconfirmed when nc_blueprint_id present and no first_block', () => {
        expect(getTransactionStatus({ nc_blueprint_id: '00beef' })).toBe('Unconfirmed');
      });

      test('returns Unconfirmed when nc_method present and no first_block', () => {
        expect(getTransactionStatus({ nc_method: 'initialize' })).toBe('Unconfirmed');
      });

      test('returns Unconfirmed when nc_args present and no first_block', () => {
        expect(getTransactionStatus({ nc_args: ['arg1'] })).toBe('Unconfirmed');
      });

      test('returns Unconfirmed when nc_address present and no first_block', () => {
        expect(getTransactionStatus({ nc_address: 'addr123' })).toBe('Unconfirmed');
      });

      test('returns Unconfirmed when nc_context present and no first_block', () => {
        expect(getTransactionStatus({ nc_context: {} })).toBe('Unconfirmed');
      });

      test('returns Valid when nc_id present and first_block exists', () => {
        expect(getTransactionStatus({
          nc_id: '00dead',
          first_block: 'blockhash',
        })).toBe('Valid');
      });

      test('returns Valid when multiple nc_* fields present and first_block exists', () => {
        expect(getTransactionStatus({
          nc_id: '00dead',
          nc_method: 'initialize',
          nc_blueprint_id: '00beef',
          first_block: 'blockhash',
        })).toBe('Valid');
      });

      test('returns Unconfirmed when nc_id present and first_block is null', () => {
        expect(getTransactionStatus({
          nc_id: '00dead',
          first_block: null,
          is_voided: false,
        })).toBe('Unconfirmed');
      });
    });

    // This is the exact bug scenario: TxStatus.tsx calls getTransactionStatus
    // with only { first_block, is_voided } (no nc_* fields) for nano txs.
    // Without nc_* fields, isNano is false and the function returns Valid.
    describe('bug: called without nc_* fields for nano txs (TxStatus.tsx code paths)', () => {
      test('returns Valid when no nc_* fields even if first_block is null', () => {
        // This is the CURRENT (buggy) behavior from TxStatus.tsx perspective:
        // it strips nc_* fields, so getTransactionStatus sees a "regular" tx
        expect(getTransactionStatus({
          first_block: null,
          is_voided: false,
        })).toBe('Valid');
      });

      test('returns Valid when no nc_* fields and first_block is undefined', () => {
        expect(getTransactionStatus({ is_voided: false })).toBe('Valid');
      });
    });
  });

  describe('getStatusColorClass', () => {
    test('returns success class for Valid status', () => {
      expect(getStatusColorClass('Valid')).toBe('bg-success/10 text-success');
    });

    test('returns warning class for Unconfirmed status', () => {
      expect(getStatusColorClass('Unconfirmed')).toBe('bg-warning/10 text-warning');
    });

    test('returns danger class for Voided status', () => {
      expect(getStatusColorClass('Voided')).toBe('bg-danger/10 text-danger');
    });

    test('returns default class for Unknown status', () => {
      expect(getStatusColorClass('Unknown')).toBe('bg-gray-100 text-gray-600');
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
