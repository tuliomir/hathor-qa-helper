/**
 * Tests for applyNetworkServices: wallet-lib's tx-mining URL is a global
 * singleton, so it must follow whichever network is about to start or send.
 */

import { describe, expect, test } from 'bun:test';
import { config } from '@hathor/wallet-lib';
import { applyNetworkServices } from '../src/services/networkServices';

describe('applyNetworkServices', () => {
  test('points tx-mining at the shielded testnet service', () => {
    applyNetworkServices('SHIELDED_TESTNET');
    expect(config.getTxMiningUrl()).toBe('https://txmining.shielded-outputs.testnet.hathor.network/');
  });

  test('switching back to testnet re-applies the regular testnet service', () => {
    applyNetworkServices('SHIELDED_TESTNET');
    applyNetworkServices('TESTNET');
    expect(config.getTxMiningUrl()).toBe('https://txmining.testnet.hathor.network/');
  });

  test('mainnet uses the mainnet service', () => {
    applyNetworkServices('MAINNET');
    expect(config.getTxMiningUrl()).toBe('https://txmining.mainnet.hathor.network/');
  });

  test('rejects an unknown network instead of keeping a stale URL', () => {
    expect(() => applyNetworkServices('DEVNET' as never)).toThrow(/Unknown network/);
  });
});
