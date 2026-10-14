import { describe, expect, test } from 'bun:test';
import { formatAmount, parseAmount } from '../src/utils/amount';

describe('parseAmount', () => {
  test('decimal to base units with 2 decimals', () => {
    expect(parseAmount('12.50', 2)).toEqual({ ok: true, value: 1250n });
    expect(parseAmount('12.5', 2)).toEqual({ ok: true, value: 1250n });
    expect(parseAmount('12', 2)).toEqual({ ok: true, value: 1200n });
    expect(parseAmount('0.01', 2)).toEqual({ ok: true, value: 1n });
    expect(parseAmount('.5', 2)).toEqual({ ok: true, value: 50n });
    expect(parseAmount('5.', 2)).toEqual({ ok: true, value: 500n });
    expect(parseAmount(' 3.00 ', 2)).toEqual({ ok: true, value: 300n });
  });

  test('zero parses to 0n', () => {
    expect(parseAmount('0', 2)).toEqual({ ok: true, value: 0n });
  });

  test('BigInt-safe beyond Number.MAX_SAFE_INTEGER', () => {
    expect(parseAmount('90071992547409931234.56', 2)).toEqual({ ok: true, value: 9007199254740993123456n });
  });

  test('18-decimal tokens', () => {
    expect(parseAmount('1', 18)).toEqual({ ok: true, value: 10n ** 18n });
    expect(parseAmount('0.000000000000000001', 18)).toEqual({ ok: true, value: 1n });
    expect(parseAmount('123456789.123456789123456789', 18)).toEqual({
      ok: true,
      value: 123456789123456789123456789n,
    });
  });

  test('0 decimals', () => {
    expect(parseAmount('42', 0)).toEqual({ ok: true, value: 42n });
    expect(parseAmount('42.1', 0)).toMatchObject({ ok: false, error: 'decimals' });
  });

  test('errors', () => {
    expect(parseAmount('', 2)).toMatchObject({ ok: false, error: 'empty' });
    expect(parseAmount('abc', 2)).toMatchObject({ ok: false, error: 'invalid', message: 'Not a number' });
    expect(parseAmount('1,000', 2)).toMatchObject({ ok: false, error: 'invalid' });
    expect(parseAmount('1e3', 2)).toMatchObject({ ok: false, error: 'invalid' });
    expect(parseAmount('1.2.3', 2)).toMatchObject({ ok: false, error: 'invalid' });
    expect(parseAmount('.', 2)).toMatchObject({ ok: false, error: 'invalid' });
    expect(parseAmount('-1', 2)).toMatchObject({ ok: false, error: 'negative' });
    expect(parseAmount('1.234', 2)).toMatchObject({
      ok: false,
      error: 'decimals',
      message: 'Too many decimals: at most 2',
    });
  });
});

describe('formatAmount', () => {
  test('base units to decimal string', () => {
    expect(formatAmount(1250n, 2)).toBe('12.50');
    expect(formatAmount(1n, 2)).toBe('0.01');
    expect(formatAmount(0n, 2)).toBe('0.00');
    expect(formatAmount('500', 2)).toBe('5.00');
  });

  test('negative values', () => {
    expect(formatAmount(-5n, 2)).toBe('-0.05');
  });

  test('0 and 18 decimals', () => {
    expect(formatAmount(42n, 0)).toBe('42');
    expect(formatAmount(10n ** 18n, 18)).toBe('1.000000000000000000');
    expect(formatAmount(1n, 18)).toBe('0.000000000000000001');
  });

  test('BigInt-safe', () => {
    expect(formatAmount(9007199254740993123456n, 2)).toBe('90071992547409931234.56');
  });

  test('optional thousands grouping', () => {
    expect(formatAmount(123456789n, 2, { grouping: true })).toBe('1,234,567.89');
    expect(formatAmount(-100000n, 2, { grouping: true })).toBe('-1,000.00');
  });

  test('round trips with parseAmount', () => {
    for (const v of [0n, 1n, 99n, 100n, 123456789012345678901234567890n]) {
      expect(parseAmount(formatAmount(v, 2), 2)).toEqual({ ok: true, value: v });
      expect(parseAmount(formatAmount(v, 18), 18)).toEqual({ ok: true, value: v });
    }
  });
});
