/**
 * QA blueprint IDs per network. Only networks where the QA blueprints are
 * deployed have them; the shielded testnet has its own genesis, so the
 * testnet IDs do not exist there.
 */

import type { BlueprintIds } from '@qa-helper/shared/networks';
import { DEFAULT_NETWORK, NETWORK_CONFIG, type NetworkKey } from '../constants/network';
import { networkKeyOfChain, rpcChain } from '../constants/hathorChains';

export function blueprintIdFor(network: NetworkKey | null, kind: keyof BlueprintIds): string | null {
  if (!network) return null;
  return NETWORK_CONFIG[network].blueprints?.[kind] ?? null;
}

/** The network key of the snap's network name; the default while disconnected, null when unknown. */
export function snapNetworkKey(snapNetwork: string | null): NetworkKey | null {
  if (!snapNetwork) return DEFAULT_NETWORK;
  switch (snapNetwork) {
    case 'testnet':
      return 'TESTNET';
    case 'mainnet':
      return 'MAINNET';
    default:
      return null;
  }
}

/**
 * The network RPC requests act on, from the WalletConnect session's
 * approved chain (see rpcChain): `hathor:mainnet` → MAINNET,
 * `hathor:privatenet` → NEXT_TESTNET, testnet otherwise. Independent of the
 * test wallet's network.
 */
export function rpcNetworkKey(sessionChains: readonly string[]): NetworkKey {
  return networkKeyOfChain(rpcChain(sessionChains));
}
