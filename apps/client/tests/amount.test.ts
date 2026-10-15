import { describe, expect, test } from 'bun:test';
import { formatAmount, keyedAmount, parseAmount, pastedAmount } from '../src/utils/amount';

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

describe('keyedAmount', () => {
  // Types each character into the field, like a QA would.
  const type = (keys: string, decimals = 2, start = '') => {
    let text = start;
    for (const key of keys) text = keyedAmount(text, text + key, decimals).text;
    return text;
  };

  test('digits shift in from the right', () => {
    expect(type('500')).toBe('5.00');
    expect(type('30')).toBe('0.30');
    expect(type('1')).toBe('0.01');
    expect(type('123456')).toBe('1234.56');
  });

  test('reports base units', () => {
    expect(keyedAmount('', '500', 2)).toEqual({ text: '5.00', value: 500n });
    expect(keyedAmount('0.03', '0.030', 2)).toEqual({ text: '0.30', value: 30n });
  });

  test('ignores separators and other characters', () => {
    expect(type('5.00')).toBe('5.00');
    expect(type('1,5a')).toBe('0.15');
    expect(type('-5')).toBe('0.05');
  });

  test('leading zeros do not stack', () => {
    expect(type('0')).toBe('0.00');
    expect(type('005')).toBe('0.05');
  });

  test('backspace shifts digits back out', () => {
    expect(keyedAmount('5.00', '5.0', 2)).toEqual({ text: '0.50', value: 50n });
    expect(keyedAmount('0.50', '0.5', 2)).toEqual({ text: '0.05', value: 5n });
  });

  test('deleting down to zero empties the field', () => {
    expect(keyedAmount('0.05', '0.0', 2)).toEqual({ text: '', value: null });
    expect(keyedAmount('0.00', '0.0', 2)).toEqual({ text: '', value: null });
    expect(keyedAmount('5.00', '', 2)).toEqual({ text: '', value: null });
  });

  test('replacing a selection starts over', () => {
    expect(keyedAmount('12.34', '7', 2)).toEqual({ text: '0.07', value: 7n });
  });

  test('other precisions', () => {
    expect(type('5', 0)).toBe('5');
    expect(type('1', 18)).toBe('0.000000000000000001');
  });

  test('BigInt-safe', () => {
    expect(keyedAmount('', '900719925474099312345', 2).value).toBe(900719925474099312345n);
  });
});

describe('pastedAmount', () => {
  test('a pasted decimal is read as token units', () => {
    expect(pastedAmount('12.5', 2)).toBe(1250n);
    expect(pastedAmount(' 0.30 ', 2)).toBe(30n);
  });

  test('anything else is left to keyedAmount', () => {
    expect(pastedAmount('500', 2)).toBeNull();
    expect(pastedAmount('1.234', 2)).toBeNull();
    expect(pastedAmount('abc', 2)).toBeNull();
  });
});
