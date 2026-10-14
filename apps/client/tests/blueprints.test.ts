/**
 * Tests for resolving QA blueprint IDs per network.
 */

import { describe, expect, test } from 'bun:test';
import { blueprintIdFor, snapNetworkKey } from '../src/utils/blueprints';

describe('blueprintIdFor', () => {
  test('testnet has the bet and fee blueprints', () => {
    expect(blueprintIdFor('TESTNET', 'bet')).toBe('0000019865eda743812c566ce6ad3ac49c5f90796b73aa2792a09b7655ac5a5e');
    expect(blueprintIdFor('TESTNET', 'fee')).toBe('00000000f9f4b9c025cfd757e1cbd662b3eefdc44e0a16cc54906ccf07f8ba8c');
  });

  test('networks without deployed blueprints return null', () => {
    expect(blueprintIdFor('SHIELDED_TESTNET', 'bet')).toBeNull();
    expect(blueprintIdFor('MAINNET', 'fee')).toBeNull();
  });

  test('an unknown network has no blueprints', () => {
    expect(blueprintIdFor(null, 'bet')).toBeNull();
  });
});

describe('snapNetworkKey', () => {
  test('maps the snap network names', () => {
    expect(snapNetworkKey('testnet')).toBe('TESTNET');
    expect(snapNetworkKey('mainnet')).toBe('MAINNET');
  });

  test('a disconnected snap falls back to the default network', () => {
    expect(snapNetworkKey(null)).toBe('TESTNET');
  });

  test('an unknown snap network has no network key', () => {
    expect(snapNetworkKey('dev-testnet')).toBeNull();
  });
});
