/**
 * Smoke tests for walletConnect constants
 * Tests WalletConnect configuration values
 */

import { describe, test, expect, beforeAll } from 'bun:test';

// Mock window object before importing the module
beforeAll(() => {
  // @ts-expect-error - mocking window for test environment
  globalThis.window = {
    location: {
      origin: 'http://localhost:5173',
    },
  };
});

// Dynamic import to ensure window mock is set up first
const getConstants = async () => {
  const module = await import('../src/constants/walletConnect');
  return module;
};

describe('walletConnect constants', () => {
  describe('chain identifiers', () => {
    test('HATHOR_TESTNET_CHAIN is correctly formatted', async () => {
      const { HATHOR_TESTNET_CHAIN } = await getConstants();
      expect(HATHOR_TESTNET_CHAIN).toBe('hathor:testnet');
    });

    test('HATHOR_MAINNET_CHAIN is correctly formatted', async () => {
      const { HATHOR_MAINNET_CHAIN } = await getConstants();
      expect(HATHOR_MAINNET_CHAIN).toBe('hathor:mainnet');
    });

    test('chain identifiers follow namespace:reference format', async () => {
      const { HATHOR_TESTNET_CHAIN, HATHOR_MAINNET_CHAIN } = await getConstants();
      const chainPattern = /^[a-z]+:[a-z]+$/;

      expect(HATHOR_TESTNET_CHAIN).toMatch(chainPattern);
      expect(HATHOR_MAINNET_CHAIN).toMatch(chainPattern);
    });

    test('both chains have same namespace (hathor)', async () => {
      const { HATHOR_TESTNET_CHAIN, HATHOR_MAINNET_CHAIN } = await getConstants();
      const testnetNamespace = HATHOR_TESTNET_CHAIN.split(':')[0];
      const mainnetNamespace = HATHOR_MAINNET_CHAIN.split(':')[0];

      expect(testnetNamespace).toBe('hathor');
      expect(mainnetNamespace).toBe('hathor');
    });
  });

  describe('DEFAULT_PROJECT_ID', () => {
    test('is defined', async () => {
      const { DEFAULT_PROJECT_ID } = await getConstants();
      expect(DEFAULT_PROJECT_ID).toBeDefined();
    });

    test('is a non-empty string', async () => {
      const { DEFAULT_PROJECT_ID } = await getConstants();
      expect(typeof DEFAULT_PROJECT_ID).toBe('string');
      expect(DEFAULT_PROJECT_ID.length).toBeGreaterThan(0);
    });

    test('looks like a valid project ID', async () => {
      const { DEFAULT_PROJECT_ID } = await getConstants();
      // WalletConnect project IDs are hex strings
      expect(DEFAULT_PROJECT_ID).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('DEFAULT_RELAY_URL', () => {
    test('is defined', async () => {
      const { DEFAULT_RELAY_URL } = await getConstants();
      expect(DEFAULT_RELAY_URL).toBeDefined();
    });

    test('uses WebSocket secure protocol', async () => {
      const { DEFAULT_RELAY_URL } = await getConstants();
      expect(DEFAULT_RELAY_URL).toMatch(/^wss:\/\//);
    });

    test('points to WalletConnect relay', async () => {
      const { DEFAULT_RELAY_URL } = await getConstants();
      expect(DEFAULT_RELAY_URL).toContain('walletconnect');
    });

    test('has valid URL structure', async () => {
      const { DEFAULT_RELAY_URL } = await getConstants();
      // Should be able to construct a URL from it
      const url = new URL(DEFAULT_RELAY_URL);
      expect(url.protocol).toBe('wss:');
      expect(url.hostname).toContain('walletconnect');
    });
  });

  describe('DEFAULT_LOGGER', () => {
    test('is defined', async () => {
      const { DEFAULT_LOGGER } = await getConstants();
      expect(DEFAULT_LOGGER).toBeDefined();
    });

    test('is a string', async () => {
      const { DEFAULT_LOGGER } = await getConstants();
      expect(typeof DEFAULT_LOGGER).toBe('string');
    });

    test('is a valid log level', async () => {
      const { DEFAULT_LOGGER } = await getConstants();
      const validLogLevels = ['debug', 'info', 'warn', 'error', 'silent'];
      expect(validLogLevels).toContain(DEFAULT_LOGGER);
    });
  });

  describe('DEFAULT_APP_METADATA', () => {
    test('is defined with required fields', async () => {
      const { DEFAULT_APP_METADATA } = await getConstants();

      expect(DEFAULT_APP_METADATA).toBeDefined();
      expect(DEFAULT_APP_METADATA.name).toBe('Hathor QA Helper');
      expect(DEFAULT_APP_METADATA.description).toBeDefined();
      expect(DEFAULT_APP_METADATA.url).toBeDefined();
      expect(Array.isArray(DEFAULT_APP_METADATA.icons)).toBe(true);
    });
  });
});
