/**
 * Network configuration constants for Hathor wallet
 */

import { SCANNING_POLICY, type IGapLimitAddressScanPolicy } from '@hathor/wallet-lib/lib/types';
import { GAP_LIMIT } from '@hathor/wallet-lib/lib/constants';
import {
  NETWORKS,
  NETWORK_KEYS,
  type LibNetworkName,
  type NetworkDefinition,
  type NetworkKey,
} from '@qa-helper/shared/networks';

export { NETWORK_KEYS };
export type { NetworkKey };

/**
 * Visual category of a network. UI decisions (rail, chips, mainnet warnings)
 * key off the kind, so a new network only has to declare which one it is.
 */
export type NetworkKind = 'test' | 'shielded-test' | 'main';

const NETWORK_KINDS: Record<NetworkKey, NetworkKind> = {
  TESTNET: 'test',
  SHIELDED_TESTNET: 'shielded-test',
  MAINNET: 'main',
};

/** Compact names for narrow screens. */
const SHORT_LABELS: Record<NetworkKey, string> = {
  TESTNET: 'Test',
  SHIELDED_TESTNET: 'Shielded',
  MAINNET: 'Main',
};

export function networkKind(key: NetworkKey): NetworkKind {
  return NETWORK_KINDS[key];
}

export interface ClientNetworkConfig extends NetworkDefinition {
  /** wallet-lib network name (alias of `libName`). */
  name: LibNetworkName;
  kind: NetworkKind;
  shortLabel: string;
}

/** Path segment of each network's Vite dev proxy (see vite.config.ts). */
const DEV_PROXY_SLUG: Record<NetworkKey, string> = {
  TESTNET: 'testnet',
  MAINNET: 'mainnet',
  SHIELDED_TESTNET: 'shielded',
};

/**
 * Client view of the shared network registry. In dev, fullnode traffic goes
 * through the Vite proxy on the page's own origin.
 */
export function buildNetworkConfig({ dev, origin }: { dev: boolean; origin?: string }) {
  const config = {} as Record<NetworkKey, ClientNetworkConfig>;
  for (const key of NETWORK_KEYS) {
    const network = NETWORKS[key];
    config[key] = {
      ...network,
      name: network.libName,
      kind: NETWORK_KINDS[key],
      shortLabel: SHORT_LABELS[key],
      fullNodeUrl: dev ? `${origin}/hathor-node/${DEV_PROXY_SLUG[key]}/v1a/` : network.fullNodeUrl,
    };
  }
  return config;
}

export const NETWORK_CONFIG = buildNetworkConfig({
  dev: Boolean(import.meta.env?.DEV),
  origin: globalThis.location?.origin ?? 'http://localhost:5173',
});

// Default network for the application
export const DEFAULT_NETWORK: NetworkKey = 'TESTNET';

/** The network after `current` in NETWORK_KEYS order, wrapping around. */
export function nextNetwork(current: NetworkKey): NetworkKey {
  const index = NETWORK_KEYS.indexOf(current);
  return NETWORK_KEYS[(index + 1) % NETWORK_KEYS.length];
}

// Wallet configuration constants
export const WALLET_CONFIG = {
  CONNECTION_TIMEOUT: 30000,
  DEFAULT_PASSWORD: 'test-password',
  DEFAULT_PIN_CODE: '123456',
  SYNC_CHECK_INTERVAL: 100,
} as const;

/**
 * Address scan policy for every wallet this app creates.
 *
 * wallet-lib 3.0 changed the default scan policy to SINGLE_ADDRESS (with a
 * first-connection auto-upgrade to gap-limit only when the wallet already has
 * transaction history beyond address 0). As a QA tool we force GAP_LIMIT so
 * every wallet scans multiple addresses exactly as it did under wallet-lib
 * 2.x, regardless of history — this avoids silently "missing" funds on
 * freshly-derived addresses (address 1+) during test flows.
 */
export const WALLET_SCAN_POLICY: IGapLimitAddressScanPolicy = {
  policy: SCANNING_POLICY.GAP_LIMIT,
  gapLimit: GAP_LIMIT,
};

/**
 * Cloud API URL for wallet synchronization
 */
export const CLOUD_API_URL = 'https://tuliomir.com/qa-helper/wallets-api.php';

/**
 * The endpoint above is gone. Cloud sync stays off until it is rebuilt on the
 * QA server (apps/server).
 */
export const CLOUD_SYNC_ENABLED = false;
