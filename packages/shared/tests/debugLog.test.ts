import { describe, expect, test } from 'bun:test';
import { DEBUG_LOG_LIMITS, REDACTED, sanitize } from '../src/debugLog';

const MNEMONIC = Array.from({ length: 24 }, () => 'abandon').join(' ');

describe('sanitize', () => {
  test('redacts secret fields at any depth, keeping empty ones readable', () => {
    const wallet = {
      metadata: { id: 'w1', seedWords: MNEMONIC, network: 'TESTNET', pinCode: '123456' },
      password: '',
      xpriv: 'tnpr…',
    };
    expect(sanitize(wallet)).toEqual({
      metadata: { id: 'w1', seedWords: REDACTED, network: 'TESTNET', pinCode: REDACTED },
      password: '',
      xpriv: REDACTED,
    });
  });

  test('redacts a mnemonic in a field with an innocent name', () => {
    expect(sanitize({ mapping: 'kept', walletPin: '1', PIN: '2' })).toEqual({
      mapping: 'kept',
      walletPin: REDACTED,
      PIN: REDACTED,
    });
    expect(sanitize({ note: MNEMONIC, text: 'a short sentence of words' })).toEqual({
      note: REDACTED,
      text: 'a short sentence of words',
    });
  });

  test('makes bigints, errors and cycles JSON-safe', () => {
    const loop: Record<string, unknown> = { value: 10n };
    loop.self = loop;
    expect(sanitize(loop)).toEqual({ value: '10', self: '[cycle]' });
    expect(sanitize(new Error('boom'))).toMatchObject({ name: 'Error', message: 'boom' });
  });

  test('cuts long strings and arrays', () => {
    const long = sanitize('x'.repeat(DEBUG_LOG_LIMITS.stringLength + 5)) as string;
    expect(long.endsWith(`(${DEBUG_LOG_LIMITS.stringLength + 5} chars)`)).toBe(true);
    const list = sanitize(Array.from({ length: DEBUG_LOG_LIMITS.arrayLength + 3 }, (_, i) => i)) as unknown[];
    expect(list).toHaveLength(DEBUG_LOG_LIMITS.arrayLength + 1);
    expect(list.at(-1)).toBe('… 3 more');
  });
});
