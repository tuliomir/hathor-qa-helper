/**
 * Tests for the browser view of a wallet's shielded capability.
 */

import { describe, expect, test } from 'bun:test';
import type { IShieldedCapability } from '@hathor/wallet-lib';
import {
  canCreateShieldedOutputs,
  shieldedCapabilityBadge,
  summarizeShieldedCapability,
} from '../src/services/shieldedCapability';

// What a WASM-backed wallet reports right after start (see research probe).
const wasmFull: IShieldedCapability = {
  level: 'full',
  reason: null,
  cause: null,
  canReceive: true,
  canSpend: true,
  historyComplete: true,
  undecoded: { txIds: ['aa', 'bb'], locked: 1, unreadable: 0, error: 0 },
};

describe('summarizeShieldedCapability', () => {
  test('keeps the flags and replaces the undecoded tx list with a count', () => {
    expect(summarizeShieldedCapability(wasmFull)).toEqual({
      level: 'full',
      reason: null,
      cause: null,
      canReceive: true,
      canSpend: true,
      historyComplete: true,
      undecoded: { txCount: 2, locked: 1, unreadable: 0, error: 0 },
    });
  });

  test('is JSON-serializable for Redux', () => {
    const summary = summarizeShieldedCapability(wasmFull);
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });
});

describe('canCreateShieldedOutputs', () => {
  test('is false for a browser wallet even when the lib reports canSpend', () => {
    expect(canCreateShieldedOutputs(summarizeShieldedCapability(wasmFull))).toBe(false);
  });

  test('is false without a capability', () => {
    expect(canCreateShieldedOutputs(undefined)).toBe(false);
  });
});

describe('shieldedCapabilityBadge', () => {
  test('no badge without a capability', () => {
    expect(shieldedCapabilityBadge(undefined)).toBeNull();
  });

  test('a full WASM capability is shown as receive-only, never as spendable', () => {
    expect(shieldedCapabilityBadge(summarizeShieldedCapability(wasmFull))?.label).toBe('Shielded: receive-only');
  });

  test('a wallet without a provider shows the reason', () => {
    const badge = shieldedCapabilityBadge(
      summarizeShieldedCapability({ ...wasmFull, level: 'none', reason: 'no-provider', canReceive: false })
    );
    expect(badge?.label).toBe('Shielded: off (no-provider)');
  });

  test('a locked scan key is shown as watch-only', () => {
    const badge = shieldedCapabilityBadge(
      summarizeShieldedCapability({ ...wasmFull, level: 'watch', reason: 'locked', canReceive: false })
    );
    expect(badge?.label).toBe('Shielded: watch-only');
  });
});
