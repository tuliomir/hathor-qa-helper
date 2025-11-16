/**
 * Redux Toolkit Slice for Wallet Store
 * Manages wallet instances and metadata with LocalStorage persistence
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { WalletMetadata, WalletInfo } from '../../types/walletStore';
import type { WalletStatus } from '../../types/wallet';
import type { RootState } from '../index';
// @ts-expect-error - Hathor wallet lib doesn't have TypeScript definitions
import HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';
import Connection from '@hathor/wallet-lib/lib/new/connection.js';
import { NETWORK_CONFIG, WALLET_CONFIG } from '../../constants/network';
import { treatSeedWords } from '../../utils/walletUtils';

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

/**
 * Async Thunk: Start a wallet
 * Initializes a wallet instance and updates its status through the lifecycle
 */
export const startWallet = createAsyncThunk(
  'walletStore/startWallet',
  async (walletId: string, { getState, dispatch }) => {
    const state = getState() as RootState;
    const walletInfo = state.walletStore.wallets[walletId];

    if (!walletInfo) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const { seedWords, network } = walletInfo.metadata;

    // Validate seed phrase
    const { valid, error, treatedWords } = treatSeedWords(seedWords);
    if (!valid) {
      throw new Error(`Invalid seed phrase: ${error}`);
    }

    // Update status to connecting
    dispatch(updateWalletStatus({ id: walletId, status: 'connecting' }));

    try {
      // Get network configuration
      const networkConfig = NETWORK_CONFIG[network];
      if (!networkConfig) {
        throw new Error(`Invalid network: ${network}`);
      }

      // Create connection to Hathor network
      const connection = new Connection({
        network: networkConfig.name,
        servers: [networkConfig.fullNodeUrl],
        connectionTimeout: WALLET_CONFIG.CONNECTION_TIMEOUT,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Create and configure the wallet
      const walletInstance = new HathorWallet({
        seed: treatedWords,
        connection,
        password: WALLET_CONFIG.DEFAULT_PASSWORD,
        pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
      });

      // Store instance in the external map
      walletInstancesMap.set(walletId, walletInstance);
      dispatch(updateWalletInstance({ id: walletId, instance: walletInstance }));

      // Start the wallet
      await walletInstance.start();

      // Update status to syncing
      dispatch(updateWalletStatus({ id: walletId, status: 'syncing' }));

      // Wait for wallet to be ready
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (walletInstance && walletInstance.isReady()) {
            resolve();
          } else {
            setTimeout(checkReady, WALLET_CONFIG.SYNC_CHECK_INTERVAL);
          }
        };
        checkReady();
      });

      // Get the first address
      const firstAddress = await walletInstance.getAddressAtIndex(0);

      // Get the selected token UID from state
      const state = getState() as RootState;
      const selectedTokenUid = state.tokens.selectedTokenUid;

      // Get the balance for the selected token
      const balanceData = await walletInstance.getBalance(selectedTokenUid);
      const balanceBigInt = balanceData && balanceData[0] ? balanceData[0].balance.unlocked : 0n;

      // Convert BigInt to string for Redux storage (maintains serializability)
      const balanceString = balanceBigInt.toString();

      // Update status to ready
      dispatch(updateWalletStatus({ id: walletId, status: 'ready', firstAddress }));

      // Update balance
      dispatch(updateWalletBalance({ id: walletId, balance: balanceString }));

      return { walletId, firstAddress, balance: balanceString };
    } catch (error) {
      // Cleanup on error
      const instance = walletInstancesMap.get(walletId);
      if (instance) {
        await instance.stop().catch(console.error);
        walletInstancesMap.delete(walletId);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      dispatch(updateWalletStatus({ id: walletId, status: 'error', error: errorMessage }));
      throw error;
    }
  }
);

/**
 * Async Thunk: Stop a wallet
 * Stops a running wallet instance and cleans up resources
 */
export const stopWallet = createAsyncThunk(
  'walletStore/stopWallet',
  async (walletId: string, { dispatch }) => {
    const instance = walletInstancesMap.get(walletId);

    if (instance) {
      try {
        await instance.stop();
        walletInstancesMap.delete(walletId);
        dispatch(updateWalletInstance({ id: walletId, instance: null }));
        dispatch(updateWalletStatus({ id: walletId, status: 'idle' }));
      } catch (error) {
        console.error(`Failed to stop wallet ${walletId}:`, error);
        throw error;
      }
    }

    return { walletId };
  }
);

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

    updateWalletBalance: (
      state,
      action: PayloadAction<{
        id: string;
        balance: string;
      }>
    ) => {
      const { id, balance } = action.payload;
      const walletInfo = state.wallets[id];

      if (walletInfo) {
        walletInfo.balance = balance;
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
  updateWalletBalance,
} = walletStoreSlice.actions;

export default walletStoreSlice.reducer;