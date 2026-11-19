/**
 * WalletConnect chain IDs of the Hathor networks.
 *
 * A chain is `hathor:<network name the wallet reports>`. The mobile wallet
 * approves only its own chain, so QA Helper offers every chain it can act on
 * and follows the one the wallet approved.
 */

import type { NetworkKey } from '@qa-helper/shared/networks';

export const HATHOR_TESTNET_CHAIN = 'hathor:testnet';
export const HATHOR_MAINNET_CHAIN = 'hathor:mainnet';
/** Hathor Next devnet: its node reports `privatenet`. */
export const HATHOR_PRIVATENET_CHAIN = 'hathor:privatenet';

/** Every chain the session proposal offers. */
export const RPC_CHAINS = [HATHOR_TESTNET_CHAIN, HATHOR_PRIVATENET_CHAIN, HATHOR_MAINNET_CHAIN] as const;

export type RpcChain = (typeof RPC_CHAINS)[number];

/** Which QA Helper network each chain acts on. */
const NETWORK_OF_CHAIN: Record<RpcChain, NetworkKey> = {
  [HATHOR_TESTNET_CHAIN]: 'TESTNET',
  [HATHOR_PRIVATENET_CHAIN]: 'NEXT_TESTNET',
  [HATHOR_MAINNET_CHAIN]: 'MAINNET',
};

/**
 * The chain RPC requests go to, from the session's approved chains. Testnet
 * when nothing known was approved (no session yet).
 */
export function rpcChain(sessionChains: readonly string[]): RpcChain {
  // Mainnet first: if it was approved at all, arming and warnings must follow it.
  const byPriority: RpcChain[] = [HATHOR_MAINNET_CHAIN, HATHOR_PRIVATENET_CHAIN, HATHOR_TESTNET_CHAIN];
  return byPriority.find((chain) => sessionChains.includes(chain)) ?? HATHOR_TESTNET_CHAIN;
}

/** The network name requests carry in `params.network`, e.g. `privatenet`. */
export function rpcChainNetworkName(chain: RpcChain): string {
  return chain.slice('hathor:'.length);
}

export function networkKeyOfChain(chain: RpcChain): NetworkKey {
  return NETWORK_OF_CHAIN[chain];
}
