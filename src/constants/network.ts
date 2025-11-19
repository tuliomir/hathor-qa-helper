/**
 * Network configuration constants for Hathor wallet
 */

export const NETWORK_CONFIG = {
  TESTNET: {
    name: 'testnet',
    fullNodeUrl: 'https://node1.testnet.hathor.network/v1a/',
    explorerUrl: 'https://explorer.testnet.hathor.network/',
	  betBlueprintId: '0000019865eda743812c566ce6ad3ac49c5f90796b73aa2792a09b7655ac5a5e',
	  authorityBlueprintId: '00000478ac24158fb576d7eb77cdce19cb7facf43838b71f7e0bf6421bc12977',
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
