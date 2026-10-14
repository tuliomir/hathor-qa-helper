/**
 * Scatter Funds Algorithm
 *
 * Splits a balance into multiple outputs with distinct ascending amounts.
 * Used to create UTXOs for testing filters (amountBiggerThan / amountSmallerThan).
 *
 * Strategy: outputs are [1, 2, 3, ..., n] with any remainder added to the
 * last output. This ensures every UTXO has a unique amount for filter testing.
 * Amounts are base units: 1, 2, 3 are 0.01, 0.02, 0.03 HTR.
 */

import { DECIMAL_PLACES } from '@hathor/wallet-lib/lib/constants';
import { formatAmount } from './amount';

/** Max outputs per transaction (255 minus 1 for potential change) */
export const MAX_SCATTER_OUTPUTS = 254;

/** Minimum balance needed: sum(1+2+3) = 6 for at least 3 distinct UTXOs */
export const MIN_SCATTER_BALANCE = 6n;

/**
 * Compute output amounts that sum to `balance` with each amount unique.
 *
 * @param balance Total balance to scatter (in smallest unit)
 * @returns Array of output amounts sorted ascending, or empty if balance too small
 */
export function computeScatterOutputs(balance: bigint): bigint[] {
  if (balance < MIN_SCATTER_BALANCE) return [];

  // Find max n where sum(1..n) = n*(n+1)/2 <= balance, capped at MAX_SCATTER_OUTPUTS
  let n = 0;
  let sum = 0n;
  while (n < MAX_SCATTER_OUTPUTS) {
    const next = BigInt(n + 1);
    const nextSum = sum + next;
    if (nextSum > balance) break;
    n++;
    sum = nextSum;
  }

  // Need at least 3 outputs
  if (n < 3) return [];

  // Build outputs [1, 2, 3, ..., n]
  const outputs: bigint[] = [];
  for (let i = 1; i <= n; i++) {
    outputs.push(BigInt(i));
  }

  // Add remainder to the last output to keep the total exact
  const remainder = balance - sum;
  if (remainder > 0n) {
    outputs[outputs.length - 1] += remainder;
  }

  return outputs;
}

const htr = (v: bigint) => formatAmount(v, DECIMAL_PLACES);

/** Scatter outcome in the amount filters' unit (HTR), with base units alongside. */
export function scatterResultMessage(amounts: bigint[]): string {
  const [a, b] = amounts;
  const last = amounts[amounts.length - 1];
  return (
    `Scattered into ${amounts.length} UTXOs: ${htr(a)}, ${htr(b)}, … ${htr(last)} HTR ` +
    `(${a}, ${b}, … ${last} base units).`
  );
}

export function scatterShortfallMessage(available: bigint): string {
  return (
    `Not enough balance to scatter. Need at least ${htr(MIN_SCATTER_BALANCE)} HTR ` +
    `(${MIN_SCATTER_BALANCE} base units), have ${htr(available)} HTR (${available} base units).`
  );
}
