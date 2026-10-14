/**
 * Balance breakdown for the Shielded balances stage: the token balance next
 * to the transparent and shielded UTXO totals.
 *
 * wallet-lib 4.2.0 credits decoded shielded outputs to the same balance as
 * transparent ones, and its UTXO listing filters strictly (`shielded: true`
 * lists shielded only), so the shielded share has to come from the UTXOs.
 */

import type { BalanceResponse, UtxoEntry } from '@qa-helper/shared/serverApi';

export interface UtxoSum {
  amount: bigint;
  count: number;
}

export interface BalanceBreakdown {
  /** unlocked + locked. */
  total: bigint;
  unlocked: bigint;
  locked: bigint;
  transparent: UtxoSum;
  shielded: UtxoSum;
  /** Shielded share of the listed UTXOs, 0–100 with one decimal; null without UTXOs. */
  shieldedSharePct: number | null;
  /** Balance not covered by the listed UTXOs (e.g. spent-but-unconfirmed, or a decoding gap). */
  unaccounted: bigint;
}

function sum(utxos: readonly { value: bigint }[]): UtxoSum {
  return { amount: utxos.reduce((acc, u) => acc + u.value, 0n), count: utxos.length };
}

export function balanceBreakdown(
  balance: { unlocked: bigint; locked: bigint },
  transparentUtxos: readonly { value: bigint }[],
  shieldedUtxos: readonly { value: bigint }[]
): BalanceBreakdown {
  const transparent = sum(transparentUtxos);
  const shielded = sum(shieldedUtxos);
  const listed = transparent.amount + shielded.amount;
  const total = balance.unlocked + balance.locked;
  return {
    total,
    unlocked: balance.unlocked,
    locked: balance.locked,
    transparent,
    shielded,
    shieldedSharePct: listed === 0n ? null : Number((shielded.amount * 1000n) / listed) / 10,
    unaccounted: total - listed,
  };
}

export function serverBreakdown(
  balance: BalanceResponse,
  transparent: readonly UtxoEntry[],
  shielded: readonly UtxoEntry[]
): BalanceBreakdown {
  const toValues = (list: readonly UtxoEntry[]) => list.map((u) => ({ value: BigInt(u.value) }));
  return balanceBreakdown(
    { unlocked: BigInt(balance.unlocked), locked: BigInt(balance.locked) },
    toValues(transparent),
    toValues(shielded)
  );
}

/** Shape of `HathorWallet.getBalance(token)` entries that matters here. */
interface LibBalanceEntry {
  balance: { unlocked: bigint; locked: bigint };
}

/** Shape of `HathorWallet.getUtxos()` that matters here. */
interface LibUtxoDetails {
  utxos: readonly { amount: bigint }[];
}

export function clientBreakdown(
  balance: readonly LibBalanceEntry[],
  transparent: LibUtxoDetails,
  shielded: LibUtxoDetails
): BalanceBreakdown {
  const entry = balance[0]?.balance ?? { unlocked: 0n, locked: 0n };
  const toValues = (d: LibUtxoDetails) => d.utxos.map((u) => ({ value: u.amount }));
  return balanceBreakdown(entry, toValues(transparent), toValues(shielded));
}
