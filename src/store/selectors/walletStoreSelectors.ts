/**
 * Selectors for wallet store
 */

import type { RootState } from '../index';
import type { WalletInfo } from '../../types/walletStore';
import { walletInstancesMap } from '../slices/walletStoreSlice';

/**
 * Get a wallet by ID
 */
export const selectWalletById = (state: RootState, id: string): WalletInfo | undefined => {
  const walletInfo = state.walletStore.wallets[id];
  if (!walletInfo) return undefined;

  // Return the wallet info with the current instance from the external map
  return {
    ...walletInfo,
    instance: walletInstancesMap.get(id) || null,
  };
};

/**
 * Get all wallets as an array
 */
export const selectAllWallets = (state: RootState): WalletInfo[] => {
  return Object.values(state.walletStore.wallets).map((walletInfo) => ({
    ...walletInfo,
    instance: walletInstancesMap.get(walletInfo.metadata.id) || null,
  }));
};

/**
 * Get wallets as a Map (for compatibility with old API)
 */
export const selectWalletsMap = (state: RootState): Map<string, WalletInfo> => {
  const map = new Map<string, WalletInfo>();
  Object.entries(state.walletStore.wallets).forEach(([id, walletInfo]) => {
    map.set(id, {
      ...walletInfo,
      instance: walletInstancesMap.get(id) || null,
    });
  });
  return map;
};
