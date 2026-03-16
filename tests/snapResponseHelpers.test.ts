/**
 * Tests for snap response display helpers
 *
 * Verifies that helpers safely handle unexpected response shapes
 * from the snap — objects where strings are expected, BigInts,
 * nested structures, null/undefined fields, etc.
 */

import { describe, expect, test } from 'bun:test';
import {
  parseSnapResponse,
  isSnapEnvelope,
  isTransactionLike,
  safeDisplayValue,
} from '../src/utils/snapResponseHelpers';

describe('parseSnapResponse', () => {
  test('parses JSON string into object', () => {
    expect(parseSnapResponse('{"type":2,"response":{"address":"W1"}}')).toEqual({
      type: 2,
      response: { address: 'W1' },
    });
  });

  test('returns original string if not valid JSON', () => {
    expect(parseSnapResponse('not json')).toBe('not json');
  });

  test('passes through non-string values unchanged', () => {
    const obj = { type: 2, response: {} };
    expect(parseSnapResponse(obj)).toBe(obj);
  });

  test('handles null and undefined', () => {
    expect(parseSnapResponse(null)).toBeNull();
    expect(parseSnapResponse(undefined)).toBeUndefined();
  });
});

describe('isSnapEnvelope', () => {
  test('detects valid envelope', () => {
    expect(isSnapEnvelope({ type: 2, response: { address: 'W1' } })).toBe(true);
  });

  test('rejects missing type', () => {
    expect(isSnapEnvelope({ response: {} })).toBe(false);
  });

  test('rejects string type', () => {
    expect(isSnapEnvelope({ type: 'two', response: {} })).toBe(false);
  });

  test('rejects missing response', () => {
    expect(isSnapEnvelope({ type: 2 })).toBe(false);
  });

  test('accepts null response value (envelope with null inner)', () => {
    expect(isSnapEnvelope({ type: 2, response: null })).toBe(true);
  });

  test('rejects null', () => {
    expect(isSnapEnvelope(null)).toBe(false);
  });

  test('rejects primitives', () => {
    expect(isSnapEnvelope(42)).toBe(false);
    expect(isSnapEnvelope('string')).toBe(false);
  });
});

describe('isTransactionLike', () => {
  test('detects transaction with hash and inputs', () => {
    expect(isTransactionLike({ hash: 'abc', inputs: [] })).toBe(true);
  });

  test('detects transaction with hash and outputs', () => {
    expect(isTransactionLike({ hash: 'abc', outputs: [] })).toBe(true);
  });

  test('detects nested transaction in envelope', () => {
    expect(isTransactionLike({ type: 8, response: { hash: 'abc', inputs: [] } })).toBe(true);
  });

  test('rejects non-transaction objects', () => {
    expect(isTransactionLike({ address: 'W1' })).toBe(false);
  });

  test('rejects null', () => {
    expect(isTransactionLike(null)).toBe(false);
  });
});

describe('safeDisplayValue', () => {
  // The core lesson from the signWithAddress crash:
  // Any response field could be an unexpected type

  test('passes through strings', () => {
    expect(safeDisplayValue('hello')).toBe('hello');
  });

  test('converts numbers to string', () => {
    expect(safeDisplayValue(42)).toBe('42');
  });

  test('converts boolean to string', () => {
    expect(safeDisplayValue(true)).toBe('true');
  });

  test('converts null to N/A', () => {
    expect(safeDisplayValue(null)).toBe('N/A');
  });

  test('converts undefined to N/A', () => {
    expect(safeDisplayValue(undefined)).toBe('N/A');
  });

  test('JSON-stringifies plain objects', () => {
    const result = safeDisplayValue({ address: 'W1', index: 0, addressPath: "m/44'/280'/0'/0/0" });
    expect(result).toContain('"address"');
    expect(result).toContain('W1');
  });

  test('JSON-stringifies arrays', () => {
    const result = safeDisplayValue([1, 2, 3]);
    expect(result).toBe('[1,2,3]');
  });

  test('converts BigInt to string', () => {
    expect(safeDisplayValue(BigInt(1000))).toBe('1000');
  });

  test('handles nested objects', () => {
    const result = safeDisplayValue({ token: { id: '00', name: 'HTR' } });
    expect(result).toContain('HTR');
  });

  test('uses fallback for empty string', () => {
    expect(safeDisplayValue('', 'fallback')).toBe('fallback');
  });

  test('does not use fallback for non-empty string', () => {
    expect(safeDisplayValue('value', 'fallback')).toBe('value');
  });
});
