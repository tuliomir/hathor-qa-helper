/**
 * Network configuration constants for Hathor wallet
 */

export const NETWORK_CONFIG = {
  TESTNET: {
    name: 'testnet',
    fullNodeUrl: 'https://node1.testnet.hathor.network/v1a/',
    explorerUrl: 'https://explorer.testnet.hathor.network/',
  },
  MAINNET: {
    name: 'mainnet',
    fullNodeUrl: 'https://node1.mainnet.hathor.network/v1a/',
    explorerUrl: 'https://explorer.hathor.network/',
  },
} as const;

export type NetworkType = keyof typeof NETWORK_CONFIG;

// Default network for the application
export const DEFAULT_NETWORK: NetworkType = 'TESTNET';

// Wallet configuration constants
export const WALLET_CONFIG = {
  CONNECTION_TIMEOUT: 30000,
  DEFAULT_PASSWORD: 'test-password',
  DEFAULT_PIN_CODE: '123456',
  SYNC_CHECK_INTERVAL: 100,
} as const;
