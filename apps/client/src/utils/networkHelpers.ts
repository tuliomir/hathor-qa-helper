/**
 * Network helper utilities
 *
 * Handles case-insensitive network name resolution against NETWORK_CONFIG.
 */

import { NETWORK_CONFIG, DEFAULT_NETWORK, type NetworkKey } from '../constants/network';

/**
 * Resolve a network key from a key (`TESTNET`), a wallet-lib / snap name
 * (`testnet`) or any casing of either. Returns null when unknown.
 */
export function resolveNetworkKey(network: string | null | undefined): NetworkKey | null {
  if (!network) return null;
  const upper = network.toUpperCase();
  return upper in NETWORK_CONFIG ? (upper as NetworkKey) : null;
}

/**
 * Resolve an explorer URL from a network name, case-insensitively.
 * Returns the default (testnet) explorer URL if the network is unknown.
 */
export function resolveExplorerUrl(network: string): string {
  return NETWORK_CONFIG[resolveNetworkKey(network) ?? DEFAULT_NETWORK].explorerUrl;
}

export type ExplorerPage = 'nc_detail' | 'token_detail';

const EXPLORER_PATHS: Record<ExplorerPage | 'transaction', string> = {
  transaction: 'transaction/',
  nc_detail: 'nano_contract/detail/',
  token_detail: 'token_detail/',
};

/** Full explorer URL for a transaction, nano contract or token on a network. */
export function buildExplorerUrl(network: string, hash: string, page?: ExplorerPage): string {
  return `${resolveExplorerUrl(network)}${EXPLORER_PATHS[page ?? 'transaction']}${hash}`;
}
