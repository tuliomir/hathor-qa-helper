/**
 * Network helper utilities
 *
 * Handles case-insensitive network name resolution against NETWORK_CONFIG.
 */

import { NETWORK_CONFIG, DEFAULT_NETWORK, type NetworkKey } from '../constants/network';

/**
 * Resolve an explorer URL from a network name, case-insensitively.
 * Returns the default (testnet) explorer URL if the network is unknown.
 */
export function resolveExplorerUrl(network: string): string {
  if (!network) return NETWORK_CONFIG[DEFAULT_NETWORK].explorerUrl;

  const upper = network.toUpperCase() as NetworkKey;
  const config = NETWORK_CONFIG[upper];
  if (config) return config.explorerUrl;

  return NETWORK_CONFIG[DEFAULT_NETWORK].explorerUrl;
}
