/**
 * Selectors for wallet store
 * These selectors handle conversion from stored strings to BigInt for app usage
 */

import type { RootState } from '../index';
import type { WalletInfo } from '../../types/walletStore';
import { walletInstancesMap } from '../slices/walletStoreSlice';

/**
 * Stored wallet info type (internal to Redux)
 * Balance is string for serializability
 */
interface StoredWalletInfo {
  metadata: WalletInfo['metadata'];
  status: WalletInfo['status'];
  firstAddress?: string;
  balance?: string; // Stored as string in Redux
  error?: string;
  instance: null;
}

/**
 * Converts stored wallet data to WalletInfo with BigInt balance
 * @param walletData - Wallet data from Redux (balance as string)
 * @param instance - Wallet instance from external map
 * @returns WalletInfo with balance as BigInt
 */
function convertWalletData(
  walletData: StoredWalletInfo,
  instance: WalletInfo['instance']
): WalletInfo {
  return {
    ...walletData,
    instance,
    // Convert string balance to BigInt
    balance: walletData.balance ? BigInt(walletData.balance) : undefined,
  };
}

/**
 * Get a wallet by ID
 */
export const selectWalletById = (state: RootState, id: string): WalletInfo | undefined => {
  const walletInfo = state.walletStore.wallets[id];
  if (!walletInfo) return undefined;

  // Return the wallet info with instance from external map and balance as BigInt
  return convertWalletData(
    walletInfo,
    walletInstancesMap.get(id) || null
  );
};

/**
 * Get all wallets as an array
 */
export const selectAllWallets = (state: RootState): WalletInfo[] => {
  return Object.values(state.walletStore.wallets).map((walletInfo) =>
    convertWalletData(
      walletInfo,
      walletInstancesMap.get(walletInfo.metadata.id) || null
    )
  );
};

/**
 * Get wallets as a Map (for compatibility with old API)
 */
export const selectWalletsMap = (state: RootState): Map<string, WalletInfo> => {
  const map = new Map<string, WalletInfo>();
  Object.entries(state.walletStore.wallets).forEach(([id, walletInfo]) => {
    map.set(
      id,
      convertWalletData(
        walletInfo,
        walletInstancesMap.get(id) || null
      )
    );
  });
  return map;
};
