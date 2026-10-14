/**
 * Request building and presets for the Shielded send stage. Rows come from
 * OutputEditor; `toSendOutputs` validates and maps them onto the QA server's
 * `SendRequest`.
 */

import type { ChangeOutputModeName, SendRequest } from '@qa-helper/shared/serverApi';
import { newOutputRow, toSendOutputs, type OutputRow } from './outputRows';

/** `AUTO` leaves `changeShieldedMode` out, so wallet-lib's change rules decide. */
export type ChangeModeChoice = 'AUTO' | ChangeOutputModeName;

export const CHANGE_MODE_OPTIONS: { value: ChangeModeChoice; label: string; hint: string }[] = [
  { value: 'AUTO', label: 'Automatic', hint: 'wallet-lib decides (sent without changeShieldedMode)' },
  { value: 'AMOUNT_SHIELDED', label: 'Amount shielded', hint: 'Change amount hidden; token public' },
  { value: 'FULLY_SHIELDED', label: 'Fully shielded', hint: 'Change amount and token hidden' },
  { value: 'TRANSPARENT', label: 'Transparent', hint: 'Change is a public output' },
];

export function buildShieldedSendRequest(rows: readonly OutputRow[], changeMode: ChangeModeChoice): SendRequest {
  const request: SendRequest = { outputs: toSendOutputs(rows) };
  if (changeMode !== 'AUTO') request.changeShieldedMode = changeMode;
  return request;
}

export type ShieldedPresetId = 'shield-amount' | 'shield-full' | 'unshield' | 'shielded-to-shielded';

export interface ShieldedPreset {
  id: ShieldedPresetId;
  label: string;
  description: string;
}

export const SHIELDED_PRESETS: ShieldedPreset[] = [
  {
    id: 'shield-amount',
    label: 'Shield (amount)',
    description: 'Transparent funds to an amount-shielded output on the shielded address',
  },
  {
    id: 'shield-full',
    label: 'Shield (full)',
    description: 'Transparent funds to a fully shielded output on the shielded address',
  },
  {
    id: 'unshield',
    label: 'Unshield',
    description: 'Spend shielded funds to a transparent output on the legacy address',
  },
  {
    id: 'shielded-to-shielded',
    label: 'Shielded to shielded',
    description: 'An amount-shielded output with shielded change',
  },
];

export interface PresetTarget {
  /** Transparent (legacy) recipient. */
  legacyAddress: string | null;
  /** Shielded (`K3…`) recipient. */
  shieldedAddress: string | null;
  /** Base units, decimal string. */
  value: string;
}

/** Rows and change mode for a preset. Recipients default to the given addresses (a self-send). */
export function applyShieldedPreset(
  id: ShieldedPresetId,
  { legacyAddress, shieldedAddress, value }: PresetTarget
): { rows: OutputRow[]; changeMode: ChangeModeChoice } {
  const shieldedRow = (privacy: 'AMOUNT_SHIELDED' | 'FULLY_SHIELDED') =>
    newOutputRow({ address: shieldedAddress ?? '', value, privacy });
  switch (id) {
    case 'shield-amount':
      return { rows: [shieldedRow('AMOUNT_SHIELDED')], changeMode: 'AUTO' };
    case 'shield-full':
      return { rows: [shieldedRow('FULLY_SHIELDED')], changeMode: 'AUTO' };
    case 'unshield':
      return {
        rows: [newOutputRow({ address: legacyAddress ?? '', value, privacy: 'TRANSPARENT' })],
        changeMode: 'AUTO',
      };
    case 'shielded-to-shielded':
      return { rows: [shieldedRow('AMOUNT_SHIELDED')], changeMode: 'AMOUNT_SHIELDED' };
  }
}
