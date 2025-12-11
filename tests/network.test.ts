/**
 * Smoke tests for network configuration
 * Tests that network constants are properly defined and accessible
 */

import { describe, test, expect } from 'bun:test';
import {
  NETWORK_CONFIG,
  DEFAULT_NETWORK,
  WALLET_CONFIG,
  type NetworkType,
} from '../src/constants/network';

describe('network constants', () => {
  describe('NETWORK_CONFIG', () => {
    test('has TESTNET configuration', () => {
      expect(NETWORK_CONFIG.TESTNET).toBeDefined();
      expect(NETWORK_CONFIG.TESTNET.name).toBe('testnet');
    });

    test('has MAINNET configuration', () => {
      expect(NETWORK_CONFIG.MAINNET).toBeDefined();
      expect(NETWORK_CONFIG.MAINNET.name).toBe('mainnet');
    });

    test('TESTNET has required properties', () => {
      const testnet = NETWORK_CONFIG.TESTNET;

      expect(testnet.name).toBeDefined();
      expect(testnet.fullNodeUrl).toBeDefined();
      expect(testnet.explorerUrl).toBeDefined();
      expect(testnet.betBlueprintId).toBeDefined();
      expect(testnet.authorityBlueprintId).toBeDefined();
    });

    test('MAINNET has required properties', () => {
      const mainnet = NETWORK_CONFIG.MAINNET;

      expect(mainnet.name).toBeDefined();
      expect(mainnet.fullNodeUrl).toBeDefined();
      expect(mainnet.explorerUrl).toBeDefined();
    });

    test('TESTNET URLs are valid', () => {
      const testnet = NETWORK_CONFIG.TESTNET;

      expect(testnet.fullNodeUrl).toMatch(/^https?:\/\//);
      expect(testnet.explorerUrl).toMatch(/^https?:\/\//);
    });

    test('MAINNET URLs are valid', () => {
      const mainnet = NETWORK_CONFIG.MAINNET;

      expect(mainnet.fullNodeUrl).toMatch(/^https?:\/\//);
      expect(mainnet.explorerUrl).toMatch(/^https?:\/\//);
    });

    test('blueprint IDs have correct format', () => {
      const testnet = NETWORK_CONFIG.TESTNET;

      // Blueprint IDs should be hex strings
      expect(testnet.betBlueprintId).toMatch(/^[0-9a-f]+$/);
      expect(testnet.authorityBlueprintId).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('DEFAULT_NETWORK', () => {
    test('is defined', () => {
      expect(DEFAULT_NETWORK).toBeDefined();
    });

    test('is either TESTNET or MAINNET', () => {
      expect(['TESTNET', 'MAINNET']).toContain(DEFAULT_NETWORK);
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

  describe('NetworkType', () => {
    test('network types can be used to access config', () => {
      const networks: NetworkType[] = ['TESTNET', 'MAINNET'];

      networks.forEach((network) => {
        expect(NETWORK_CONFIG[network]).toBeDefined();
        expect(NETWORK_CONFIG[network].name).toBeDefined();
      });
    });
  });
});
