import { describe, expect, test } from 'bun:test';
import { HTR_OPTION, walletTokenOptions } from '../src/utils/walletTokenOptions';

const TKA = 'aa'.repeat(32);
const TKB = 'bb'.repeat(32);

describe('walletTokenOptions', () => {
  test('HTR alone for a wallet with no tokens, or not started', () => {
    expect(walletTokenOptions(undefined, [])).toEqual([HTR_OPTION]);
    expect(walletTokenOptions(['00'], [])).toEqual([HTR_OPTION]);
  });

  test('custom tokens follow HTR, named from the registry', () => {
    const options = walletTokenOptions(['00', TKA], [{ uid: TKA, symbol: 'TKA', name: 'Token A' }]);
    expect(options).toEqual([HTR_OPTION, { uid: TKA, symbol: 'TKA', name: 'Token A' }]);
  });

  test('tokens the registry lacks are kept under a short UID', () => {
    const [, tkb] = walletTokenOptions([TKB], []);
    expect(tkb).toEqual({ uid: TKB, symbol: 'bbbbbbbb…', name: TKB });
  });
});
