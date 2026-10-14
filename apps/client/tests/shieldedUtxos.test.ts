/**
 * Tests for splitting a wallet's available UTXOs into what the browser can
 * sweep (transparent) and what it cannot (shielded, needs a prover).
 */

import { describe, expect, test } from 'bun:test';
import { shieldedSweepNotice, splitAvailableUtxos } from '../src/services/shieldedUtxos';

/** Mimics wallet-lib 4.2 getUtxos: `shielded: true` lists only shielded UTXOs, the default only transparent ones. */
function fakeWallet(utxos: { token: string; value: bigint; shielded?: boolean; locked?: boolean }[]) {
  return {
    async getUtxos(options: { token?: string; shielded?: boolean }) {
      const picked = utxos.filter(
        (u) => u.token === (options.token ?? '00') && !!u.shielded === (options.shielded ?? false)
      );
      const available = picked.filter((u) => !u.locked);
      return {
        total_amount_available: available.reduce((sum, u) => sum + u.value, 0n),
        total_utxos_available: BigInt(available.length),
        total_amount_locked: 0n,
        total_utxos_locked: 0n,
        utxos: [],
      };
    },
  };
}

describe('splitAvailableUtxos', () => {
  test('separates transparent from shielded available UTXOs of a token', async () => {
    const wallet = fakeWallet([
      { token: '00', value: 10n },
      { token: '00', value: 5n },
      { token: '00', value: 7n, shielded: true },
      { token: '00', value: 100n, locked: true },
      { token: 'aa', value: 3n, shielded: true },
    ]);

    expect(await splitAvailableUtxos(wallet, '00')).toEqual({
      token: '00',
      transparent: { amount: 15n, count: 2 },
      shielded: { amount: 7n, count: 1 },
    });
  });

  test('a wallet with only shielded funds has nothing transparent to sweep', async () => {
    const wallet = fakeWallet([{ token: '00', value: 50n, shielded: true }]);
    const split = await splitAvailableUtxos(wallet, '00');

    expect(split.transparent).toEqual({ amount: 0n, count: 0 });
    expect(split.shielded).toEqual({ amount: 50n, count: 1 });
  });
});

describe('shieldedSweepNotice', () => {
  const none = { amount: 0n, count: 0 };

  test('no notice without shielded UTXOs', () => {
    expect(shieldedSweepNotice([{ token: '00', transparent: { amount: 1n, count: 1 }, shielded: none }])).toBeNull();
  });

  test('counts shielded UTXOs across tokens and points to the QA server', () => {
    const notice = shieldedSweepNotice([
      { token: '00', transparent: none, shielded: { amount: 7n, count: 2 } },
      { token: 'aa', transparent: none, shielded: { amount: 3n, count: 1 } },
    ]);
    expect(notice).toBe('3 shielded UTXOs not sweepable from the browser — use the QA server');
  });

  test('uses the singular for one UTXO', () => {
    const notice = shieldedSweepNotice([{ token: '00', transparent: none, shielded: { amount: 7n, count: 1 } }]);
    expect(notice).toBe('1 shielded UTXO not sweepable from the browser — use the QA server');
  });
});
