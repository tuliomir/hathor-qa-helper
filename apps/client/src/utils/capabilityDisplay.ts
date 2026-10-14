/**
 * What CapabilityBadge shows. wallet-lib reports `full` for any wallet that
 * holds the spend key, but a context that can't create shielded outputs
 * (the browser's verifier-only WASM provider) can only decrypt: it shows
 * View, marked receive-only. Never trust `canSpend` here.
 */

import type { ShieldedCapabilityLevel } from '@qa-helper/shared/serverApi';

const MEANING: Record<ShieldedCapabilityLevel, string> = {
  none: 'No shielded support',
  watch: 'Sees that shielded outputs exist',
  view: 'Can decrypt shielded amounts',
  full: 'Can decrypt and spend shielded outputs',
};

const SEGMENTS: Record<ShieldedCapabilityLevel, number> = { none: 0, watch: 1, view: 2, full: 3 };

export interface CapabilityDisplay {
  level: ShieldedCapabilityLevel;
  segments: number;
  word: string;
  receiveOnly: boolean;
  title: string;
}

export function capabilityDisplay(
  reported: ShieldedCapabilityLevel | undefined,
  canCreateShieldedOutputs: boolean,
  /** wallet-lib's reason for a reduced level (e.g. `no-provider`), shown in the tooltip. */
  reason?: string | null
): CapabilityDisplay {
  const lib = reported ?? 'none';
  const receiveOnly = lib === 'full' && !canCreateShieldedOutputs;
  const level = receiveOnly ? 'view' : lib;
  return {
    level,
    segments: SEGMENTS[level],
    word: level[0].toUpperCase() + level.slice(1),
    receiveOnly,
    title: receiveOnly
      ? `${MEANING.view}. wallet-lib reports full, but this wallet can't create shielded outputs here; shielded sends go through the QA server.`
      : reason
        ? `${MEANING[level]} (${reason})`
        : MEANING[level],
  };
}
