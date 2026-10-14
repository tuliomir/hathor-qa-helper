/**
 * Tests for ExplorerLink network resolution
 *
 * The snap stages pass lowercase network names ("testnet") but
 * NETWORK_CONFIG keys are uppercase ("TESTNET"). The resolver
 * must handle both without crashing.
 */

import { describe, expect, test } from 'bun:test';
import { buildExplorerUrl, resolveExplorerUrl, resolveNetworkKey } from '../src/utils/networkHelpers';

describe('resolveExplorerUrl', () => {
  test('resolves uppercase TESTNET', () => {
    expect(resolveExplorerUrl('TESTNET')).toBe('https://explorer.testnet.hathor.network/');
  });

  test('resolves uppercase MAINNET', () => {
    expect(resolveExplorerUrl('MAINNET')).toBe('https://explorer.hathor.network/');
  });

  test('resolves lowercase testnet', () => {
    expect(resolveExplorerUrl('testnet')).toBe('https://explorer.testnet.hathor.network/');
  });

  test('resolves lowercase mainnet', () => {
    expect(resolveExplorerUrl('mainnet')).toBe('https://explorer.hathor.network/');
  });

  test('resolves mixed case Testnet', () => {
    expect(resolveExplorerUrl('Testnet')).toBe('https://explorer.testnet.hathor.network/');
  });

  test('resolves SHIELDED_TESTNET to its own explorer', () => {
    expect(resolveExplorerUrl('SHIELDED_TESTNET')).toBe('https://explorer.shielded-outputs.testnet.hathor.network/');
  });

  test('resolves lowercase shielded_testnet', () => {
    expect(resolveExplorerUrl('shielded_testnet')).toBe('https://explorer.shielded-outputs.testnet.hathor.network/');
  });

  test('returns testnet URL for unknown network', () => {
    expect(resolveExplorerUrl('unknown')).toBe('https://explorer.testnet.hathor.network/');
  });

  test('returns testnet URL for undefined', () => {
    expect(resolveExplorerUrl(undefined as unknown as string)).toBe('https://explorer.testnet.hathor.network/');
  });
});

describe('buildExplorerUrl', () => {
  const hash = 'abc123';

  test('builds transaction URLs on every network', () => {
    expect(buildExplorerUrl('TESTNET', hash)).toBe('https://explorer.testnet.hathor.network/transaction/abc123');
    expect(buildExplorerUrl('MAINNET', hash)).toBe('https://explorer.hathor.network/transaction/abc123');
    expect(buildExplorerUrl('SHIELDED_TESTNET', hash)).toBe(
      'https://explorer.shielded-outputs.testnet.hathor.network/transaction/abc123'
    );
  });

  test('builds nano contract and token pages', () => {
    expect(buildExplorerUrl('MAINNET', hash, 'nc_detail')).toBe(
      'https://explorer.hathor.network/nano_contract/detail/abc123'
    );
    expect(buildExplorerUrl('SHIELDED_TESTNET', hash, 'token_detail')).toBe(
      'https://explorer.shielded-outputs.testnet.hathor.network/token_detail/abc123'
    );
  });

  test('accepts lib and snap network names', () => {
    expect(buildExplorerUrl('mainnet', hash)).toBe('https://explorer.hathor.network/transaction/abc123');
  });
});

describe('resolveNetworkKey', () => {
  test('resolves keys and names case-insensitively', () => {
    expect(resolveNetworkKey('TESTNET')).toBe('TESTNET');
    expect(resolveNetworkKey('mainnet')).toBe('MAINNET');
    expect(resolveNetworkKey('shielded_testnet')).toBe('SHIELDED_TESTNET');
  });

  test('returns null for unknown or empty names', () => {
    expect(resolveNetworkKey('dev-testnet')).toBeNull();
    expect(resolveNetworkKey(null)).toBeNull();
    expect(resolveNetworkKey(undefined)).toBeNull();
  });
});
