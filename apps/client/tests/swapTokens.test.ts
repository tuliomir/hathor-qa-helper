/**
 * Tests for picking the swap test token registry of a wallet's network.
 */

import { describe, expect, test } from 'bun:test';
import { swapTokenUidsForNetwork } from '../src/store/slices/swapTokensSlice';

const registry = { testnet: ['aa'], mainnet: ['bb'] };

describe('swapTokenUidsForNetwork', () => {
  test('testnet and mainnet use their own lists', () => {
    expect(swapTokenUidsForNetwork(registry, 'TESTNET')).toEqual(['aa']);
    expect(swapTokenUidsForNetwork(registry, 'MAINNET')).toEqual(['bb']);
  });

  test('shielded testnet has its own genesis, so no testnet swap token exists there', () => {
    expect(swapTokenUidsForNetwork(registry, 'SHIELDED_TESTNET')).toEqual([]);
  });
});
