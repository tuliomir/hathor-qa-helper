/**
 * WalletConnect chain IDs of the Hathor networks.
 *
 * A chain is `hathor:<wallet-lib network name>`. The mobile wallet approves
 * only its own chain, so QA Helper offers every chain it can act on and
 * follows the one the wallet approved.
 */

import type { NetworkKey } from '@qa-helper/shared/networks';

export const HATHOR_TESTNET_CHAIN = 'hathor:testnet';
export const HATHOR_MAINNET_CHAIN = 'hathor:mainnet';

/** Every chain the session proposal offers. */
export const RPC_CHAINS = [HATHOR_TESTNET_CHAIN, HATHOR_MAINNET_CHAIN] as const;

export type RpcChain = (typeof RPC_CHAINS)[number];

/**
 * The chain RPC requests go to, from the session's approved chains. Testnet
 * when nothing known was approved (no session yet).
 */
export function rpcChain(sessionChains: readonly string[]): RpcChain {
  // Mainnet first: if it was approved at all, arming and warnings must follow it.
  const byPriority: RpcChain[] = [HATHOR_MAINNET_CHAIN, HATHOR_TESTNET_CHAIN];
  return byPriority.find((chain) => sessionChains.includes(chain)) ?? HATHOR_TESTNET_CHAIN;
}

/** The network name requests carry in `params.network`, e.g. `testnet`. */
export function rpcChainNetworkName(chain: RpcChain): string {
  return chain.slice('hathor:'.length);
}

/**
 * Which QA Helper network a chain acts on. A wallet on Next testnet
 * (testnet-juliet) approves `hathor:testnet` too, and nothing in the session
 * tells the two apart, so `hathor:testnet` follows the active network when it
 * is Next testnet.
 */
export function networkKeyOfChain(chain: RpcChain, activeNetwork?: NetworkKey): NetworkKey {
  if (chain === HATHOR_MAINNET_CHAIN) return 'MAINNET';
  return activeNetwork === 'NEXT_TESTNET' ? 'NEXT_TESTNET' : 'TESTNET';
}
