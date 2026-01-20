/**
 * Redux Toolkit Slice for Wallet Store
 * Manages wallet instances and metadata with LocalStorage persistence
 */

import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WalletMetadata } from '../../types/walletStore';
import type { WalletStatus } from '../../types/wallet';
import type { RootState } from '../index';
// @ts-expect-error - Hathor wallet lib doesn't have TypeScript definitions
import HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';
import Connection from '@hathor/wallet-lib/lib/new/connection.js';
import { NETWORK_CONFIG, type NetworkType, WALLET_CONFIG } from '../../constants/network';
import { treatSeedWords } from '../../utils/walletUtils';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';
import { addToken } from './tokensSlice';
import {
  deleteAddressesForWallet,
  storeAddresses,
  storeAddressesFromTransaction,
} from '../../services/addressDatabase';
import type { AddressEntry } from '../../types/addressDatabase';

const STORAGE_KEY = 'qa-helper-wallets';

/**
 * Wallet event captured from HathorWallet event emitter
 * BigInt values in data are converted to strings for Redux serializability
 */
export interface WalletEvent {
  id: string; // Unique event ID
  eventType: 'new-tx' | 'update-tx' | 'state' | 'more-addresses-loaded';
  timestamp: number; // Unix timestamp in milliseconds
  data: unknown; // Event payload from wallet-lib (BigInt values serialized to strings)
}

/**
 * Stored wallet information in Redux (balance as string for serializability)
 * This differs from WalletInfo which exposes balance as BigInt via selectors
 */
interface StoredWalletInfo {
  metadata: WalletMetadata;
  instance: null; // Always null in Redux state; actual instances in walletInstancesMap
  status: WalletStatus;
  firstAddress?: string;
  balance?: string; // Stored as string for Redux serializability
  tokenUids?: string[]; // Array of token UIDs for this wallet
  events: WalletEvent[]; // Event history for this wallet
  error?: string;
}

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
  wallets: Record<string, StoredWalletInfo>;
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
        events: [],
      };
      return acc;
    },
    {} as Record<string, StoredWalletInfo>
  ),
};

/**
 * Global wallet instances map (stored outside Redux as they are non-serializable)
 */
export const walletInstancesMap = new Map<string, HathorWallet | null>();

/**
 * Global map to store event handlers for each wallet (for cleanup)
 */
const walletEventHandlers = new Map<string, Record<string, (...args: unknown[]) => void>>();

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

      // Populate address database with all known addresses (fire-and-forget)
      // Note: getAllAddresses() is an async generator, not a Promise
      (async () => {
        try {
          const addressEntries: AddressEntry[] = [];
          for await (const addr of walletInstance.getAllAddresses()) {
            addressEntries.push({
              address: addr.address,
              index: addr.index,
            });
          }
          await storeAddresses(walletId, addressEntries);
        } catch (err) {
          console.error('[AddressDB] Failed to populate initial addresses:', err);
        }
      })();

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

      // Update lastUsedAt timestamp
      dispatch(updateLastUsedAt(walletId));

      // Update balance
      dispatch(updateWalletBalance({ id: walletId, balance: balanceString }));

      // Get token UIDs
      const tokenUids = await walletInstance.getTokens();
      dispatch(updateWalletTokens({ id: walletId, tokenUids }));

      // Load token details for custom tokens (skip native token "00")
      for (const uid of tokenUids) {
        // Skip native token
        if (uid === NATIVE_TOKEN_UID) {
          continue;
        }

        try {
          const txData = await walletInstance.getTxById(uid);

          // Extract token info and store in Redux
          if (txData.success && txData.txTokens) {
            const tokenInfo = txData.txTokens.find((t: { tokenId: string; tokenName?: string; tokenSymbol?: string }) => t.tokenId === uid);
            if (tokenInfo && tokenInfo.tokenName && tokenInfo.tokenSymbol) {
              dispatch(addToken({
                uid,
                name: tokenInfo.tokenName,
                symbol: tokenInfo.tokenSymbol,
              }));
            }
          }
        } catch (err) {
          // Silently ignore errors for tokens without balance or other getTxById errors
          // This can happen when wallet has a token UID but no balance for that token
          console.debug(`Skipping token ${uid}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Set up event listeners for all wallet events
      // Handler for 'new-tx' event
      const handleNewTx = async (tx: unknown) => {
        console.log('New transaction received:', tx);

        // Store event in Redux
        dispatch(addWalletEvent({
          walletId,
          eventType: 'new-tx',
          data: tx as { tx_id?: string; txId?: string; tokenName?: string; tokenSymbol?: string },
        }));

        // Store addresses from transaction (fire-and-forget)
        storeAddressesFromTransaction(walletId, tx).catch(console.error);

        // Check if the transaction has tokenName and tokenSymbol (custom token transaction)
        if (tx && typeof tx === 'object' && 'tokenName' in tx && 'tokenSymbol' in tx) {
          console.log('Custom token transaction detected, refreshing tokens');
          // Refresh custom tokens for this wallet (with caching)
          dispatch(refreshWalletTokens(walletId));
        }

        // Always refresh balance on new transactions
        dispatch(refreshWalletBalance(walletId));
      };

      // Handler for 'update-tx' event
      const handleUpdateTx = async (tx: unknown) => {
        console.log('Transaction update received:', tx);

        // Store event in Redux
        dispatch(addWalletEvent({
          walletId,
          eventType: 'update-tx',
          data: tx,
        }));

        // Store addresses from transaction (fire-and-forget)
        storeAddressesFromTransaction(walletId, tx).catch(console.error);

        // Refresh balance on transaction updates
        dispatch(refreshWalletBalance(walletId));
      };

      // Handler for 'state' event
      const handleState = (state: unknown) => {
        console.log('Wallet state changed:', state);

        // Store event in Redux
        dispatch(addWalletEvent({
          walletId,
          eventType: 'state',
          data: state,
        }));
      };

      // Handler for 'more-addresses-loaded' event
      const handleMoreAddressesLoaded = (data: unknown) => {
        console.log('More addresses loaded:', data);

        // Store event in Redux
        dispatch(addWalletEvent({
          walletId,
          eventType: 'more-addresses-loaded',
          data,
        }));

        // Store newly loaded addresses (fire-and-forget)
        if (data && typeof data === 'object' && 'addresses' in data) {
          const addressData = data as { addresses: Array<{ address: string; index: number }> };
          const addressEntries: AddressEntry[] = addressData.addresses.map((a) => ({
            address: a.address,
            index: a.index,
          }));
          storeAddresses(walletId, addressEntries).catch(console.error);
        }
      };

      // Register all event listeners
      walletInstance.on('new-tx', handleNewTx);
      walletInstance.on('update-tx', handleUpdateTx);
      walletInstance.on('state', handleState);
      walletInstance.on('more-addresses-loaded', handleMoreAddressesLoaded);

      // Store all handlers in the global map for cleanup
      if (!walletEventHandlers.has(walletId)) {
        walletEventHandlers.set(walletId, {});
      }
      const handlers = walletEventHandlers.get(walletId)!;
      handlers['new-tx'] = handleNewTx;
      handlers['update-tx'] = handleUpdateTx;
      handlers['state'] = handleState;
      handlers['more-addresses-loaded'] = handleMoreAddressesLoaded;

      return { walletId, firstAddress, balance: balanceString };
    } catch (error) {
      // Cleanup on error
      const instance = walletInstancesMap.get(walletId);
      if (instance) {
	      await instance.stop().catch((err: unknown) => console.error('Error stopping wallet after failed start:', err));
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
        // Remove all event listeners
        const handlers = walletEventHandlers.get(walletId);
        if (handlers) {
          Object.entries(handlers).forEach(([event, handler]) => {
            instance.off(event, handler);
          });
          walletEventHandlers.delete(walletId);
        }

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

/**
 * Async Thunk: Refresh wallet tokens
 * Fetches custom tokens for a wallet with caching (only fetches tokens not already in the slice)
 */
export const refreshWalletTokens = createAsyncThunk(
  'walletStore/refreshWalletTokens',
  async (walletId: string, { dispatch, getState }) => {
    const instance = walletInstancesMap.get(walletId);

    if (!instance) {
      throw new Error(`Wallet instance ${walletId} not found`);
    }

    try {
      // Get token UIDs from the wallet
      const tokenUids = await instance.getTokens();
      dispatch(updateWalletTokens({ id: walletId, tokenUids }));

      // Get existing tokens from the store to use as cache
      const state = getState() as RootState;
      const existingTokens = state.tokens.tokens;

      // Load token details for custom tokens (skip native token "00")
      for (const uid of tokenUids) {
        // Skip native token
        if (uid === NATIVE_TOKEN_UID) {
          continue;
        }

        // Check if token is already in the cache
        const existingToken = existingTokens.find((t) => t.uid === uid);
        if (existingToken) {
          // Token already in cache, skip fetching
          continue;
        }

        try {
          const txData = await instance.getTxById(uid);

          // Extract token info and store in Redux
          if (txData.success && txData.txTokens) {
            const tokenInfo = txData.txTokens.find((t: { tokenId: string; tokenName?: string; tokenSymbol?: string }) => t.tokenId === uid);
            if (tokenInfo && tokenInfo.tokenName && tokenInfo.tokenSymbol) {
              dispatch(addToken({
                uid,
                name: tokenInfo.tokenName,
                symbol: tokenInfo.tokenSymbol,
              }));
            }
          }
        } catch (err) {
          // Silently ignore errors for tokens without balance or other getTxById errors
          console.debug(`Skipping token ${uid}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      return { walletId, tokenUids };
    } catch (error) {
      console.error(`Failed to refresh tokens for wallet ${walletId}:`, error);
      throw error;
    }
  }
);

/**
 * Async Thunk: Refresh wallet balance
 * Updates the balance for the currently selected token
 */
export const refreshWalletBalance = createAsyncThunk(
  'walletStore/refreshWalletBalance',
  async (walletId: string, { dispatch, getState }) => {
    const instance = walletInstancesMap.get(walletId);

    if (!instance) {
      throw new Error(`Wallet instance ${walletId} not found`);
    }

    try {
      // Get the selected token UID from state
      const state = getState() as RootState;
      const selectedTokenUid = state.tokens.selectedTokenUid;

      // Get the balance for the selected token
      const balanceData = await instance.getBalance(selectedTokenUid);
      const balanceBigInt = balanceData && balanceData[0] ? balanceData[0].balance.unlocked : 0n;

      // Convert BigInt to string for Redux storage
      const balanceString = balanceBigInt.toString();

      // Update balance in state
      dispatch(updateWalletBalance({ id: walletId, balance: balanceString }));

      return { walletId, balance: balanceString };
    } catch (error) {
      console.error(`Failed to refresh balance for wallet ${walletId}:`, error);
      throw error;
    }
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
          events: [],
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

      // Clean up addresses from IndexedDB (fire-and-forget)
      deleteAddressesForWallet(id).catch(console.error);

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

    updateNetwork: (state, action: PayloadAction<{ id: string; network: NetworkType }>) => {
      const { id, network } = action.payload;
      const walletInfo = state.wallets[id];

      if (walletInfo) {
        walletInfo.metadata.network = network;

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

    updateWalletTokens: (
      state,
      action: PayloadAction<{
        id: string;
        tokenUids: string[];
      }>
    ) => {
      const { id, tokenUids } = action.payload;
      const walletInfo = state.wallets[id];

      if (walletInfo) {
        walletInfo.tokenUids = tokenUids;
      }
    },

    updateLastUsedAt: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const walletInfo = state.wallets[id];

      if (walletInfo) {
        walletInfo.metadata.lastUsedAt = Date.now();

        // Sync to LocalStorage
        const metadataArray = Object.values(state.wallets).map((info) => info.metadata);
        saveWalletsToStorage(metadataArray);
      }
    },

    addWalletEvent: {
      reducer: (
        state,
        action: PayloadAction<{
          walletId: string;
          eventType: WalletEvent['eventType'];
          data: unknown;
        }>
      ) => {
        const { walletId, eventType, data } = action.payload;
        const walletInfo = state.wallets[walletId];

        if (walletInfo) {
          const event: WalletEvent = {
            id: `${walletId}-${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            eventType,
            timestamp: Date.now(),
            data,
          };
          walletInfo.events.push(event);
        }
      },
      prepare: ({ walletId, eventType, data }: {
        walletId: string;
        eventType: WalletEvent['eventType'];
        data: unknown;
      }) => {
        // Serialize BigInt values to strings for Redux storage
        // JSONBigInt.stringify converts BigInt → JSON string
        // JSONBigInt.parse converts back with BigInt values as strings
        const serializedData = JSONBigInt.parse(JSONBigInt.stringify(data));

        return {
          payload: {
            walletId,
            eventType,
            data: serializedData,
          },
        };
      },
    },
  },
});

export const {
  addWallet,
  removeWallet,
  updateFriendlyName,
  updateNetwork,
  updateWalletInstance,
  updateWalletStatus,
  updateWalletBalance,
  updateWalletTokens,
  updateLastUsedAt,
  addWalletEvent,
} = walletStoreSlice.actions;

export default walletStoreSlice.reducer;

/**
 * Selectors for wallet events
 */

/**
 * Get all events for a specific wallet
 */
export const selectWalletEvents = (state: RootState, walletId: string): WalletEvent[] => {
  const walletInfo = state.walletStore.wallets[walletId];
  return walletInfo?.events || [];
};

/**
 * Get all events across all wallets (useful for global event monitoring)
 * MEMOIZED: Returns same reference if wallet events haven't changed
 */
export const selectAllWalletEvents = createSelector(
  [(state: RootState) => state.walletStore.wallets],
  (wallets) => {
    const allEvents: Array<WalletEvent & { walletId: string }> = [];

    Object.entries(wallets).forEach(([walletId, walletInfo]) => {
      walletInfo.events.forEach((event) => {
        allEvents.push({ ...event, walletId });
      });
    });

    // Sort by timestamp, most recent first
    return allEvents.sort((a, b) => b.timestamp - a.timestamp);
  }
);

/**
 * Get all events that involve a specific transaction hash
 * Searches for tx_id or txId in the event data (handles both naming conventions)
 * MEMOIZED: Returns same reference if events haven't changed
 */
export const selectEventsByTxHash = createSelector(
  [
    (state: RootState) => selectAllWalletEvents(state),
    (_state: RootState, txHash: string) => txHash,
  ],
  (allEvents, txHash) => {
    return allEvents.filter((event) => {
      // Check if the event data contains this transaction hash
      if (event.data && typeof event.data === 'object') {
        const eventData = event.data as { tx_id?: string; txId?: string };
        const eventTxId = eventData.tx_id ?? eventData.txId;
        return eventTxId === txHash;
      }
      return false;
    });
  }
);

/**
 * Get the latest event for a specific transaction hash
 * MEMOIZED: Returns same reference if events haven't changed
 */
export const selectLatestEventForTx = createSelector(
  [
    (state: RootState, txHash: string) => selectEventsByTxHash(state, txHash),
  ],
  (events) => {
    return events.length > 0 ? events[0] : null;
  }
);
