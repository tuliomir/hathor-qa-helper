/**
 * Redux Toolkit Slice for Wallet Store
 * Manages wallet instances and metadata with LocalStorage persistence
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WalletMetadata, WalletInfo } from '../../types/walletStore';
import type { WalletStatus } from '../../types/wallet';
// @ts-expect-error - Hathor wallet lib doesn't have TypeScript definitions
import type HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';

const STORAGE_KEY = 'qa-helper-wallets';

/**
 * Load wallet metadata from LocalStorage
 */
function loadWalletsFromStorage(): WalletMetadata[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load wallets from LocalStorage:', error);
    return [];
  }
}

/**
 * Save wallet metadata to LocalStorage
 */
function saveWalletsToStorage(wallets: WalletMetadata[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
  } catch (error) {
    console.error('Failed to save wallets to LocalStorage:', error);
  }
}

/**
 * State type for the wallet store slice
 */
interface WalletStoreState {
  wallets: Record<string, WalletInfo>;
}

/**
 * Initialize state from LocalStorage
 */
const initialState: WalletStoreState = {
  wallets: loadWalletsFromStorage().reduce(
    (acc, metadata) => {
      acc[metadata.id] = {
        metadata,
        instance: null,
        status: 'idle',
      };
      return acc;
    },
    {} as Record<string, WalletInfo>
  ),
};

/**
 * Global wallet instances map (stored outside Redux as they are non-serializable)
 */
export const walletInstancesMap = new Map<string, HathorWallet | null>();

const walletStoreSlice = createSlice({
  name: 'walletStore',
  initialState,
  reducers: {
    addWallet: {
      reducer: (state, action: PayloadAction<{ metadata: WalletMetadata; id: string }>) => {
        const { metadata, id } = action.payload;

        state.wallets[id] = {
          metadata,
          instance: null,
          status: 'idle',
        };

        // Sync to LocalStorage
        const metadataArray = Object.values(state.wallets).map((info) => info.metadata);
        saveWalletsToStorage(metadataArray);
      },
      prepare: (metadata: Omit<WalletMetadata, 'id' | 'createdAt'>) => {
        const id = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const fullMetadata: WalletMetadata = {
          ...metadata,
          id,
          createdAt: Date.now(),
        };
        return { payload: { metadata: fullMetadata, id } };
      },
    },

    removeWallet: (state, action: PayloadAction<string>) => {
      const id = action.payload;

      // Stop the wallet instance if it exists
      const instance = walletInstancesMap.get(id);
      if (instance) {
        instance.stop().catch(console.error);
        walletInstancesMap.delete(id);
      }

      delete state.wallets[id];

      // Sync to LocalStorage
      const metadataArray = Object.values(state.wallets).map((info) => info.metadata);
      saveWalletsToStorage(metadataArray);
    },

    updateFriendlyName: (state, action: PayloadAction<{ id: string; friendlyName: string }>) => {
      const { id, friendlyName } = action.payload;
      const walletInfo = state.wallets[id];

      if (walletInfo) {
        walletInfo.metadata.friendlyName = friendlyName;

        // Sync to LocalStorage
        const metadataArray = Object.values(state.wallets).map((info) => info.metadata);
        saveWalletsToStorage(metadataArray);
      }
    },

    updateWalletInstance: (
      state,
      action: PayloadAction<{ id: string; instance: HathorWallet | null }>
    ) => {
      const { id, instance } = action.payload;
      const walletInfo = state.wallets[id];

      if (walletInfo) {
        // Store instance in the external map (non-serializable)
        walletInstancesMap.set(id, instance);

        // Update state to trigger re-render (but instance remains null in state)
        walletInfo.instance = null; // We don't store instances in Redux state
      }
    },

    updateWalletStatus: (
      state,
      action: PayloadAction<{
        id: string;
        status: WalletStatus;
        firstAddress?: string;
        error?: string;
      }>
    ) => {
      const { id, status, firstAddress, error } = action.payload;
      const walletInfo = state.wallets[id];

      if (walletInfo) {
        walletInfo.status = status;
        if (firstAddress) {
          walletInfo.firstAddress = firstAddress;
        }
        if (error !== undefined) {
          walletInfo.error = error;
        }
      }
    },
  },
});

export const {
  addWallet,
  removeWallet,
  updateFriendlyName,
  updateWalletInstance,
  updateWalletStatus,
} = walletStoreSlice.actions;

export default walletStoreSlice.reducer;