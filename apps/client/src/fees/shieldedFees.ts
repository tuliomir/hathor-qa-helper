/**
 * Shielded output fees and the rules that shape them, from wallet-lib's
 * own constants (`knowledge/shielded-semantics.md` §2).
 *
 * Every shielded output pays a flat HTR fee by mode, in one FeeHeader, so a
 * shielded send needs HTR even when it sends a custom token. A transaction
 * holds 0 or 2..32 shielded outputs: wallet-lib splits a lone output in two
 * halves (or shields the HTR change when the output is 1 base unit), which
 * adds one more output and its fee.
 */

import {
  FEE_PER_AMOUNT_SHIELDED_OUTPUT,
  FEE_PER_FULL_SHIELDED_OUTPUT,
  MAX_SHIELDED_OUTPUT_VALUE,
  MAX_SHIELDED_OUTPUTS,
} from '@hathor/wallet-lib/lib/constants';
import type { ShieldedOutputModeName } from '@qa-helper/shared/serverApi';

export const MIN_SHIELDED_OUTPUTS = 2;
export { MAX_SHIELDED_OUTPUTS, MAX_SHIELDED_OUTPUT_VALUE };

/** HTR base units each shielded output pays. Transparent outputs pay nothing (FEE-version tokens aside). */
export const SHIELDED_OUTPUT_FEE: Record<ShieldedOutputModeName, bigint> = {
  AMOUNT_SHIELDED: FEE_PER_AMOUNT_SHIELDED_OUTPUT,
  FULLY_SHIELDED: FEE_PER_FULL_SHIELDED_OUTPUT,
};

export interface ShieldedFeeInput {
  /** `TRANSPARENT` or a shielded mode. */
  privacy: 'TRANSPARENT' | ShieldedOutputModeName;
  /** Base units as a decimal string; '' while empty. */
  value: string;
}

/**
 * How wallet-lib makes up the second shielded output when there is only one:
 * `split` halves it (same address, mode and token), `change` shields the
 * HTR change instead (a 1-unit output cannot be split).
 */
export type ShieldedPadding = 'none' | 'split' | 'change';

export interface ShieldedFeeEstimate {
  /** Shielded outputs the caller asked for. */
  requested: number;
  /** Shielded outputs on chain before any shielded change: `requested`, plus one when padded. */
  onChain: number;
  padding: ShieldedPadding;
  /**
   * Lower bound of the HTR fee, in base units. Shielded change outputs add
   * their mode's fee on top; wallet-lib decides those.
   */
  minFee: bigint;
}

export function estimateShieldedFee(outputs: readonly ShieldedFeeInput[]): ShieldedFeeEstimate {
  const shielded = outputs.filter(
    (o): o is ShieldedFeeInput & { privacy: ShieldedOutputModeName } => o.privacy !== 'TRANSPARENT'
  );
  let minFee = shielded.reduce((sum, o) => sum + SHIELDED_OUTPUT_FEE[o.privacy], 0n);
  let padding: ShieldedPadding = 'none';
  if (shielded.length === 1) {
    const lone = shielded[0];
    padding = lone.value === '1' ? 'change' : 'split';
    // Either way one more output joins in the lone output's mode.
    minFee += SHIELDED_OUTPUT_FEE[lone.privacy];
  }
  return {
    requested: shielded.length,
    onChain: shielded.length + (padding === 'none' ? 0 : 1),
    padding,
    minFee,
  };
}

