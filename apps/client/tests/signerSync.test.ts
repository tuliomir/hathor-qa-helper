import { describe, expect, test } from 'bun:test';
import type { WalletSession } from '@qa-helper/shared/serverApi';
import { planSignerSync, type SignerSyncInput, type SignerWallet } from '../src/utils/signerSync';

const wallet = (id: string, patch: Partial<SignerWallet> = {}): SignerWallet => ({
  id,
  network: 'SHIELDED_TESTNET',
  kind: 'seed',
  status: 'ready',
  firstAddress: `W${id}`,
  ...patch,
});

const session = (id: string): WalletSession => ({
  id,
  network: 'SHIELDED_TESTNET',
  state: 'ready',
  capability: null,
  legacyAddress0: id,
  shieldedAddress0: `K3${id}`,
});

const plan = (patch: Partial<SignerSyncInput>) =>
  planSignerSync({ wallets: [], sessions: [], owners: {}, busy: new Set(), failed: new Set(), ...patch });

describe('planSignerSync', () => {
  test('starts a signer for a ready seed wallet on a shielded network', () => {
    expect(plan({ wallets: [wallet('a')] }).start).toEqual(['a']);
  });

  test('ignores other networks, address-only wallets and wallets not ready', () => {
    const wallets = [
      wallet('t', { network: 'TESTNET' }),
      wallet('x', { kind: 'address' }),
      wallet('l', { status: 'syncing', firstAddress: undefined }),
    ];
    expect(plan({ wallets }).start).toEqual([]);
  });

  test('does not start twice or retry a failed start on its own', () => {
    expect(plan({ wallets: [wallet('a')], busy: new Set(['a']) }).start).toEqual([]);
    expect(plan({ wallets: [wallet('a')], failed: new Set(['a']) }).start).toEqual([]);
  });

  test('keeps a running signer', () => {
    const p = plan({ wallets: [wallet('a')], sessions: [session('Wa')], owners: { Wa: 'a' } });
    expect(p).toEqual({ start: [], stop: [], adopt: [] });
  });

  test('adopts a running session of its own wallet', () => {
    expect(plan({ wallets: [wallet('a')], sessions: [session('Wa')] }).adopt).toEqual([
      { sessionId: 'Wa', walletId: 'a' },
    ]);
  });

  test('stops the signer of a stopped, removed or moved wallet', () => {
    const sessions = [session('Wa'), session('Wb'), session('Wc')];
    const owners = { Wa: 'a', Wb: 'b', Wc: 'c' };
    const wallets = [wallet('a', { status: 'idle', firstAddress: undefined }), wallet('c', { network: 'TESTNET' })];
    expect(plan({ wallets, sessions, owners }).stop).toEqual(['Wa', 'Wb', 'Wc']);
  });

  test('keeps the signer of a wallet still loading after a reload', () => {
    const wallets = [wallet('a', { status: 'syncing', firstAddress: undefined })];
    expect(plan({ wallets, sessions: [session('Wa')], owners: { Wa: 'a' } }).stop).toEqual([]);
  });

  test('leaves sessions other clients started alone', () => {
    expect(plan({ sessions: [session('Wz')] }).stop).toEqual([]);
  });
});
