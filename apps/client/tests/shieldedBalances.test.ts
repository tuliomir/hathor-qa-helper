import { describe, expect, it } from 'bun:test';
import { balanceBreakdown, clientBreakdown } from '../src/utils/shieldedBalances';

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
