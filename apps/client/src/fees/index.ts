/**
 * Fee rules in one place. Token fees (FEE-version tokens) and shielded
 * output fees both settle in HTR; read `knowledge/shielded-semantics.md`
 * and `knowledge/tx-template.md` before changing them.
 */

export { isFeeToken, isFeeTokenOnNode } from './tokenFees';
export {
  MAX_SHIELDED_OUTPUT_VALUE,
  MAX_SHIELDED_OUTPUTS,
  MIN_SHIELDED_OUTPUTS,
  SHIELDED_OUTPUT_FEE,
  estimateShieldedFee,
  type ShieldedFeeEstimate,
  type ShieldedFeeInput,
  type ShieldedPadding,
} from './shieldedFees';
