import { describe, expect, test } from 'bun:test';
import reducer, { addWallet, updateShieldedCapability, updateWalletStatus } from '../src/store/slices/walletStoreSlice';
import type { ShieldedCapabilitySummary } from '../src/services/shieldedCapability';

const capability = { level: 'full', canReceive: true, canSpend: true } as ShieldedCapabilitySummary;

function startedWallet() {
  let state = reducer(undefined, { type: 'init' });
  const add = addWallet({ friendlyName: 'Captain', seedWords: 'a b c', network: 'SHIELDED_TESTNET' });
  state = reducer(state, add);
  const id = add.payload.id;
  state = reducer(state, updateWalletStatus({ id, status: 'connecting' }));
  state = reducer(state, updateShieldedCapability({ id, capability }));
  return { state, id };
}

describe('wallet status transitions', () => {
  test('a failed start drops the capability reported while starting', () => {
    const { state, id } = startedWallet();
    const failed = reducer(state, updateWalletStatus({ id, status: 'error', error: 'timeout of 10000ms exceeded' }));
    expect(failed.wallets[id].shieldedCapability).toBeUndefined();
    expect(failed.wallets[id].error).toBe('timeout of 10000ms exceeded');
  });

  test('retrying clears the previous error', () => {
    const { state, id } = startedWallet();
    const failed = reducer(state, updateWalletStatus({ id, status: 'error', error: 'boom' }));
    const retry = reducer(failed, updateWalletStatus({ id, status: 'connecting' }));
    expect(retry.wallets[id].error).toBeUndefined();
  });

  test('syncing keeps the capability', () => {
    const { state, id } = startedWallet();
    const syncing = reducer(state, updateWalletStatus({ id, status: 'syncing' }));
    expect(syncing.wallets[id].shieldedCapability).toEqual(capability);
  });
});
