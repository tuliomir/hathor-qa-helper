/**
 * WalletConnect configuration constants
 */

export const HATHOR_TESTNET_CHAIN = 'hathor:testnet';
export const HATHOR_MAINNET_CHAIN = 'hathor:mainnet';

// WalletConnect Project ID - use environment variable or default
export const DEFAULT_PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '8264fff563181da658ce64ee80e80458';

// WalletConnect Relay URL
export const DEFAULT_RELAY_URL = 'wss://relay.walletconnect.com';

// Default logger level
export const DEFAULT_LOGGER = 'debug';

// App metadata for WalletConnect
export const DEFAULT_APP_METADATA = {
  name: 'Hathor QA Helper',
  description: 'QA testing tool for Hathor wallets and RPC servers',
  url: window.location.origin,
  icons: ['https://hathor-public-files.s3.amazonaws.com/hathor-demo-icon.png'],
};
