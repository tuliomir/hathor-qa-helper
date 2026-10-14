/**
 * Splits a wallet's available UTXOs into what the browser can spend and what
 * it cannot.
 *
 * Since wallet-lib 4.x, getUtxos() lists transparent UTXOs only by default,
 * and `{ shielded: true }` lists shielded ones only. getBalance() counts both.
 * A browser wallet cannot spend shielded UTXOs: unshielding needs a balancing
 * blinding factor, which the verifier-only WASM provider cannot compute. So
 * sweeps must send the transparent amount only and report the rest.
 */

interface UtxoTotalsSource {
  total_amount_available: bigint;
  total_utxos_available: bigint;
}

interface UtxoLister {
  getUtxos(options: { token: string; only_available_utxos: boolean; shielded: boolean }): Promise<UtxoTotalsSource>;
}

export interface UtxoTotals {
  amount: bigint;
  count: number;
}

export interface TokenUtxoSplit {
  token: string;
  /** Spendable from the browser. */
  transparent: UtxoTotals;
  /** Needs a prover: only the QA server can spend these. */
  shielded: UtxoTotals;
}

function totals(details: UtxoTotalsSource): UtxoTotals {
  return { amount: details.total_amount_available, count: Number(details.total_utxos_available) };
}

export async function splitAvailableUtxos(wallet: UtxoLister, token: string): Promise<TokenUtxoSplit> {
  const [transparent, shielded] = await Promise.all([
    wallet.getUtxos({ token, only_available_utxos: true, shielded: false }),
    wallet.getUtxos({ token, only_available_utxos: true, shielded: true }),
  ]);
  return { token, transparent: totals(transparent), shielded: totals(shielded) };
}

export function shieldedSweepNotice(splits: TokenUtxoSplit[]): string | null {
  const count = splits.reduce((sum, split) => sum + split.shielded.count, 0);
  if (count === 0) return null;
  return `${count} shielded UTXO${count === 1 ? '' : 's'} not sweepable from the browser — use the QA server`;
}
