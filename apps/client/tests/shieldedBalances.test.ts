import { describe, expect, it } from 'bun:test';
import type { UtxoEntry } from '@qa-helper/shared/serverApi';
import { balanceBreakdown, clientBreakdown, serverBreakdown } from '../src/utils/shieldedBalances';

const utxo = (value: string, shielded: boolean, locked = false): UtxoEntry => ({
  txId: 't',
  index: 0,
  token: '00',
  address: 'W',
  value,
  shielded,
  locked,
});

describe('balanceBreakdown', () => {
  it('sums each kind and computes the shielded share', () => {
    const b = balanceBreakdown({ unlocked: 100n, locked: 0n }, [{ value: 30n }, { value: 10n }], [{ value: 60n }]);
    expect(b.total).toBe(100n);
    expect(b.transparent).toEqual({ amount: 40n, count: 2 });
    expect(b.shielded).toEqual({ amount: 60n, count: 1 });
    expect(b.shieldedSharePct).toBe(60);
    expect(b.unaccounted).toBe(0n);
  });

  it('has no share when there are no UTXOs', () => {
    const b = balanceBreakdown({ unlocked: 0n, locked: 0n }, [], []);
    expect(b.shieldedSharePct).toBeNull();
  });

  it('reports what the balance holds beyond the listed UTXOs', () => {
    const b = balanceBreakdown({ unlocked: 90n, locked: 10n }, [{ value: 50n }], []);
    expect(b.total).toBe(100n);
    expect(b.unaccounted).toBe(50n);
  });

  it('rounds the share to one decimal', () => {
    const b = balanceBreakdown({ unlocked: 3n, locked: 0n }, [{ value: 2n }], [{ value: 1n }]);
    expect(b.shieldedSharePct).toBe(33.3);
  });
});

describe('serverBreakdown', () => {
  it('reads decimal strings from the contract', () => {
    const b = serverBreakdown(
      { token: '00', unlocked: '700', locked: '0' },
      [utxo('300', false), utxo('100', false, true)],
      [utxo('300', true)]
    );
    expect(b.total).toBe(700n);
    expect(b.transparent).toEqual({ amount: 400n, count: 2 });
    expect(b.shielded).toEqual({ amount: 300n, count: 1 });
  });
});

describe('clientBreakdown', () => {
  it('reads wallet-lib balance and UtxoDetails', () => {
    const b = clientBreakdown(
      [{ token: { id: '00' }, balance: { unlocked: 15n, locked: 5n } }],
      { utxos: [{ amount: 10n }] },
      { utxos: [{ amount: 10n }] }
    );
    expect(b.total).toBe(20n);
    expect(b.shieldedSharePct).toBe(50);
  });

  it('treats a missing balance entry as zero', () => {
    const b = clientBreakdown([], { utxos: [] }, { utxos: [] });
    expect(b.total).toBe(0n);
  });
});
