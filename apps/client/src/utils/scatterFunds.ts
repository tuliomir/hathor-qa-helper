/**
 * Scatter Funds Algorithm
 *
 * Splits a balance into multiple outputs with distinct ascending amounts.
 * Used to create UTXOs for testing filters (amountBiggerThan / amountSmallerThan).
 *
 * Strategy: outputs are [1, 2, 3, ..., n] with any remainder added to the
 * last output. This ensures every UTXO has a unique amount for filter testing.
 */

/** Max outputs per transaction (255 minus 1 for potential change) */
export const MAX_SCATTER_OUTPUTS = 254;

/** Minimum balance needed: sum(1+2+3) = 6 for at least 3 distinct UTXOs */
const MIN_BALANCE = 6n;

/**
 * Compute output amounts that sum to `balance` with each amount unique.
 *
 * @param balance Total balance to scatter (in smallest unit)
 * @returns Array of output amounts sorted ascending, or empty if balance too small
 */
export function computeScatterOutputs(balance: bigint): bigint[] {
  if (balance < MIN_BALANCE) return [];

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
