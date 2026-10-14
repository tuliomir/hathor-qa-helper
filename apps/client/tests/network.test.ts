/**
 * Tests for the client network configuration
 */

import { describe, test, expect } from 'bun:test';
import {
  NETWORK_CONFIG,
  DEFAULT_NETWORK,
  WALLET_CONFIG,
  WALLET_SCAN_POLICY,
  buildNetworkConfig,
  nextNetwork,
  type NetworkKey,
} from '../src/constants/network';
import { NETWORK_KEYS } from '@qa-helper/shared/networks';
import { SCANNING_POLICY } from '@hathor/wallet-lib/lib/types';

describe('network constants', () => {
  describe('NETWORK_CONFIG', () => {
    test('has exactly the three shared networks', () => {
      expect(Object.keys(NETWORK_CONFIG).sort()).toEqual(['MAINNET', 'SHIELDED_TESTNET', 'TESTNET']);
    });

    test('maps each network to its wallet-lib name', () => {
      expect(NETWORK_CONFIG.TESTNET.name).toBe('testnet');
      expect(NETWORK_CONFIG.MAINNET.name).toBe('mainnet');
      // The shielded node reports `testnet-shielded-outputs`; wallet-lib accepts it as `testnet`.
      expect(NETWORK_CONFIG.SHIELDED_TESTNET.name).toBe('testnet');
    });

    test('uses the raw fullnode URLs outside dev', () => {
      expect(NETWORK_CONFIG.TESTNET.fullNodeUrl).toBe('https://node1.testnet.hathor.network/v1a/');
      expect(NETWORK_CONFIG.SHIELDED_TESTNET.fullNodeUrl).toBe(
        'https://node1.shielded-outputs.testnet.hathor.network/v1a/'
      );
    });

    test('carries per-network explorer and tx-mining URLs', () => {
      expect(NETWORK_CONFIG.MAINNET.explorerUrl).toBe('https://explorer.hathor.network/');
      expect(NETWORK_CONFIG.SHIELDED_TESTNET.explorerUrl).toBe(
        'https://explorer.shielded-outputs.testnet.hathor.network/'
      );
      expect(NETWORK_CONFIG.SHIELDED_TESTNET.txMiningUrl).toBe(
        'https://txmining.shielded-outputs.testnet.hathor.network/'
      );
    });

    test('only the shielded testnet supports shielded outputs', () => {
      expect(NETWORK_CONFIG.SHIELDED_TESTNET.supportsShielded).toBe(true);
      expect(NETWORK_CONFIG.TESTNET.supportsShielded).toBe(false);
      expect(NETWORK_CONFIG.MAINNET.supportsShielded).toBe(false);
    });

    test('only testnet has the QA blueprints', () => {
      expect(NETWORK_CONFIG.TESTNET.blueprints?.bet).toMatch(/^[0-9a-f]{64}$/);
      expect(NETWORK_CONFIG.TESTNET.blueprints?.fee).toMatch(/^[0-9a-f]{64}$/);
      expect(NETWORK_CONFIG.TESTNET.blueprints?.authority).toMatch(/^[0-9a-f]{64}$/);
      expect(NETWORK_CONFIG.SHIELDED_TESTNET.blueprints).toBeUndefined();
      expect(NETWORK_CONFIG.MAINNET.blueprints).toBeUndefined();
    });
  });

  describe('buildNetworkConfig', () => {
    test('routes fullnodes through the dev proxy of the current origin in dev', () => {
      const config = buildNetworkConfig({ dev: true, origin: 'http://localhost:5176' });
      expect(config.TESTNET.fullNodeUrl).toBe('http://localhost:5176/hathor-node/testnet/v1a/');
      expect(config.MAINNET.fullNodeUrl).toBe('http://localhost:5176/hathor-node/mainnet/v1a/');
      expect(config.SHIELDED_TESTNET.fullNodeUrl).toBe('http://localhost:5176/hathor-node/shielded/v1a/');
    });

    test('dev proxy does not touch tx-mining or explorer URLs', () => {
      const config = buildNetworkConfig({ dev: true, origin: 'http://localhost:5176' });
      expect(config.SHIELDED_TESTNET.txMiningUrl).toBe('https://txmining.shielded-outputs.testnet.hathor.network/');
      expect(config.TESTNET.explorerUrl).toBe('https://explorer.testnet.hathor.network/');
    });
  });

  describe('nextNetwork', () => {
    test('cycles through every network and wraps around', () => {
      expect(nextNetwork('TESTNET')).toBe('MAINNET');
      expect(nextNetwork('MAINNET')).toBe('SHIELDED_TESTNET');
      expect(nextNetwork('SHIELDED_TESTNET')).toBe('TESTNET');
    });

    test('visits all NETWORK_KEYS once per cycle', () => {
      const seen: NetworkKey[] = [];
      let current: NetworkKey = 'TESTNET';
      for (let i = 0; i < NETWORK_KEYS.length; i++) {
        seen.push(current);
        current = nextNetwork(current);
      }
      expect(seen.sort()).toEqual([...NETWORK_KEYS].sort());
      expect(current).toBe('TESTNET');
    });
  });

  describe('DEFAULT_NETWORK', () => {
    test('is defined', () => {
      expect(DEFAULT_NETWORK).toBeDefined();
    });

    test('is TESTNET', () => {
      expect(DEFAULT_NETWORK).toBe('TESTNET');
    });

    test('points to a valid network config', () => {
      expect(NETWORK_CONFIG[DEFAULT_NETWORK]).toBeDefined();
    });
  });

  describe('WALLET_CONFIG', () => {
    test('has CONNECTION_TIMEOUT defined', () => {
      expect(WALLET_CONFIG.CONNECTION_TIMEOUT).toBeDefined();
      expect(typeof WALLET_CONFIG.CONNECTION_TIMEOUT).toBe('number');
      expect(WALLET_CONFIG.CONNECTION_TIMEOUT).toBeGreaterThan(0);
    });

    test('has DEFAULT_PASSWORD defined', () => {
      expect(WALLET_CONFIG.DEFAULT_PASSWORD).toBeDefined();
      expect(typeof WALLET_CONFIG.DEFAULT_PASSWORD).toBe('string');
      expect(WALLET_CONFIG.DEFAULT_PASSWORD.length).toBeGreaterThan(0);
    });

    test('has DEFAULT_PIN_CODE defined', () => {
      expect(WALLET_CONFIG.DEFAULT_PIN_CODE).toBeDefined();
      expect(typeof WALLET_CONFIG.DEFAULT_PIN_CODE).toBe('string');
      expect(WALLET_CONFIG.DEFAULT_PIN_CODE.length).toBeGreaterThan(0);
    });

    test('has SYNC_CHECK_INTERVAL defined', () => {
      expect(WALLET_CONFIG.SYNC_CHECK_INTERVAL).toBeDefined();
      expect(typeof WALLET_CONFIG.SYNC_CHECK_INTERVAL).toBe('number');
      expect(WALLET_CONFIG.SYNC_CHECK_INTERVAL).toBeGreaterThan(0);
    });

    test('all properties are readonly (const)', () => {
      // This test verifies the type is const, which is a compile-time check
      // At runtime, we just verify the object exists and has the expected structure
      const config = WALLET_CONFIG;

      expect(Object.keys(config)).toContain('CONNECTION_TIMEOUT');
      expect(Object.keys(config)).toContain('DEFAULT_PASSWORD');
      expect(Object.keys(config)).toContain('DEFAULT_PIN_CODE');
      expect(Object.keys(config)).toContain('SYNC_CHECK_INTERVAL');
    });
  });

  describe('WALLET_SCAN_POLICY', () => {
    // Regression guard: wallet-lib 3.0 changed the default scan policy to
    // SINGLE_ADDRESS, which would make app wallets watch only address 0 and
    // silently miss funds on freshly-derived addresses during test flows.
    // We force GAP_LIMIT to preserve the 2.x multi-address behavior.
    test('forces gap-limit scanning (not the 3.x single-address default)', () => {
      expect(WALLET_SCAN_POLICY.policy).toBe(SCANNING_POLICY.GAP_LIMIT);
      expect(WALLET_SCAN_POLICY.policy).not.toBe(SCANNING_POLICY.SINGLE_ADDRESS);
    });

    test('uses a positive gap limit so multiple addresses are scanned', () => {
      expect(typeof WALLET_SCAN_POLICY.gapLimit).toBe('number');
      expect(WALLET_SCAN_POLICY.gapLimit).toBeGreaterThan(0);
    });
  });
});
