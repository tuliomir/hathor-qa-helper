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
 * Whether this client can create shielded outputs or spend shielded UTXOs.
 * Always false: the only browser provider, `@hathor/ct-crypto-wasm`, is
 * verifier-only and throws on signing, RNG, surjection proofs and balancing
 * blinding factors. wallet-lib still reports `level: 'full', canSpend: true`
 * because `canSpend` only checks that the record holds the spend key, not
 * what the provider can do. Shielded sends go through the QA server.
 */
export function canCreateShieldedOutputs(_capability: ShieldedCapabilitySummary | undefined): false {
  return false;
}

export function shieldedCapabilityBadge(
  capability: ShieldedCapabilitySummary | undefined
): { label: string; className: string; title: string } | null {
  if (!capability) return null;
  const title = `wallet-lib level: ${capability.level}${capability.reason ? ` (${capability.reason})` : ''}`;
  switch (capability.level) {
    case 'full':
    case 'view':
      // Never "full": the browser cannot spend shielded UTXOs (see above).
      return { label: 'Shielded: receive-only', className: 'badge-info', title };
    case 'watch':
      return { label: 'Shielded: watch-only', className: 'badge-warning', title };
    default:
      return { label: `Shielded: off (${capability.reason ?? 'unknown'})`, className: 'badge-ghost', title };
  }
}
