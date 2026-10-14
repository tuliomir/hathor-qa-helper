/**
 * Tests for ExplorerLink network resolution
 *
 * The snap stages pass lowercase network names ("testnet") but
 * NETWORK_CONFIG keys are uppercase ("TESTNET"). The resolver
 * must handle both without crashing.
 */

import { describe, expect, test } from 'bun:test';
import { resolveExplorerUrl } from '../src/utils/networkHelpers';

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

  test('returns testnet URL for unknown network', () => {
    expect(resolveExplorerUrl('unknown')).toBe('https://explorer.testnet.hathor.network/');
  });

  test('returns testnet URL for undefined', () => {
    expect(resolveExplorerUrl(undefined as unknown as string)).toBe('https://explorer.testnet.hathor.network/');
  });
});
