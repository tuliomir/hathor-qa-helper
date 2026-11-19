/**
 * Network helper utilities
 *
 * Handles case-insensitive network name resolution against NETWORK_CONFIG.
 */

import { NETWORK_CONFIG, NETWORK_KEYS, DEFAULT_NETWORK, type NetworkKey } from '../constants/network';

/**
 * Resolve a network key from a key (`TESTNET`), a wallet-lib / snap name
 * (`testnet`) or any casing of either. Returns null when unknown.
 */
export function resolveNetworkKey(network: string | null | undefined): NetworkKey | null {
  if (!network) return null;
  const upper = network.toUpperCase();
  if (upper in NETWORK_CONFIG) return upper as NetworkKey;
  // A wallet-lib name only one network uses (`privatenet` → NEXT_TESTNET).
  const byLibName = NETWORK_KEYS.filter((key) => NETWORK_CONFIG[key].name === network.toLowerCase());
  return byLibName.length === 1 ? byLibName[0] : null;
}

/**
 * Resolve an explorer URL from a network name, case-insensitively.
 * Unknown networks get the default (testnet) explorer; a network without an
 * explorer (Next testnet) gets null.
 */
export function resolveExplorerUrl(network: string): string | null {
  return NETWORK_CONFIG[resolveNetworkKey(network) ?? DEFAULT_NETWORK].explorerUrl ?? null;
}

export type ExplorerPage = 'nc_detail' | 'token_detail';

const EXPLORER_PATHS: Record<ExplorerPage | 'transaction', string> = {
  transaction: 'transaction/',
  nc_detail: 'nano_contract/detail/',
  token_detail: 'token_detail/',
};

/** Full explorer URL for a transaction, nano contract or token on a network. */
export function buildExplorerUrl(network: string, hash: string, page?: ExplorerPage): string | null {
  const base = resolveExplorerUrl(network);
  return base ? `${base}${EXPLORER_PATHS[page ?? 'transaction']}${hash}` : null;
}
