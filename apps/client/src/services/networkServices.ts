/**
 * Single place that points wallet-lib's global services at a network.
 *
 * wallet-lib keeps the tx-mining URL in a process-wide singleton (`config`).
 * Without an explicit URL it derives one from the lib network name, and the
 * shielded testnet reports itself as `testnet`, so it would mine against the
 * regular testnet service. Call this before every wallet start and every
 * send, so switching between wallets on different networks stays correct.
 *
 * Caveat: mining polls the service after the send call returns. Sending from
 * two networks at the same moment can still race on the singleton.
 */

import { config } from '@hathor/wallet-lib';
import { isNetworkKey, type NetworkKey } from '@qa-helper/shared/networks';
import { NETWORK_CONFIG } from '../constants/network';

export function applyNetworkServices(network: NetworkKey): void {
  if (!isNetworkKey(network)) {
    throw new Error(`Unknown network: ${String(network)}`);
  }
  // The client config, not the raw registry: in dev some services go through the Vite proxy.
  config.setTxMiningUrl(NETWORK_CONFIG[network].txMiningUrl);
}
