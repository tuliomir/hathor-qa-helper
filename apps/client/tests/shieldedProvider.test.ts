/**
 * Tests for registering the browser shielded provider on wallet start.
 */

import { describe, expect, mock, test } from 'bun:test';
import type { IShieldedCryptoProvider } from '@hathor/wallet-lib';
import { enableShieldedProvider } from '../src/services/shieldedProvider';

function fakeWallet() {
  return { setShieldedCryptoProvider: mock((_provider: IShieldedCryptoProvider) => {}) };
}

describe('enableShieldedProvider', () => {
  test('registers the provider on a network that supports shielded outputs', async () => {
    const wallet = fakeWallet();
    const provider = { name: 'wasm' } as unknown as IShieldedCryptoProvider;
    const enabled = await enableShieldedProvider(wallet, 'SHIELDED_TESTNET', async () => provider);

    expect(enabled).toBe(true);
    expect(wallet.setShieldedCryptoProvider).toHaveBeenCalledWith(provider);
  });

  test('leaves wallets on transparent-only networks alone', async () => {
    const wallet = fakeWallet();
    const load = mock(async () => ({}) as IShieldedCryptoProvider);
    const enabled = await enableShieldedProvider(wallet, 'TESTNET', load);

    expect(enabled).toBe(false);
    expect(load).not.toHaveBeenCalled();
    expect(wallet.setShieldedCryptoProvider).not.toHaveBeenCalled();
  });
});
