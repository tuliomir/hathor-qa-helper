/**
 * Browser view of a wallet's shielded capability.
 *
 * The capability comes from `wallet.getShieldedCapability()` and the
 * `'shielded-capability'` event. It is reduced to a serializable summary
 * for Redux.
 */

import type { IShieldedCapability } from '@hathor/wallet-lib';

export interface ShieldedCapabilitySummary {
  level: IShieldedCapability['level'];
  reason: IShieldedCapability['reason'];
  cause: IShieldedCapability['cause'];
  canReceive: boolean;
  /** As reported by wallet-lib. Misleading in the browser: see canCreateShieldedOutputs. */
  canSpend: boolean;
  historyComplete: boolean;
  undecoded: { txCount: number; locked: number; unreadable: number; error: number };
}

export function summarizeShieldedCapability(capability: IShieldedCapability): ShieldedCapabilitySummary {
  const { level, reason, cause, canReceive, canSpend, historyComplete, undecoded } = capability;
  return {
    level,
    reason,
    cause,
    canReceive,
    canSpend,
    historyComplete,
    undecoded: {
      txCount: undecoded.txIds.length,
      locked: undecoded.locked,
      unreadable: undecoded.unreadable,
      error: undecoded.error,
    },
  };
}

/**
 * Whether the browser crypto provider can build shielded outputs. False for
 * `@hathor/ct-crypto-wasm`, which is verifier-only: signing, RNG, surjection
 * proofs and balancing blinding factors all throw. Flip it only when a WASM
 * prover ships.
 */
const BROWSER_PROVIDER_CAN_PROVE = false;

/**
 * Whether this client can create shielded outputs or spend shielded UTXOs.
 * Under WASM wallet-lib still reports `level: 'full', canSpend: true`,
 * because `canSpend` only checks that the record holds the spend key, not
 * what the provider can do. Never gate a client-side shielded send on
 * `canSpend`; shielded sends go through the QA server.
 */
export function canCreateShieldedOutputs(capability: ShieldedCapabilitySummary | undefined): boolean {
  return BROWSER_PROVIDER_CAN_PROVE && !!capability?.canSpend;
}
