/**
 * Global Wallet Store Context
 * Manages wallet instances and metadata with LocalStorage persistence
 */

import { createContext, useState, useRef, useCallback, useEffect } from 'react';
import type { WalletMetadata, WalletInfo, WalletStoreContextValue } from '../types/walletStore';
import type { WalletStatus } from '../types/wallet';
// @ts-expect-error - Hathor wallet lib doesn't have TypeScript definitions
import type HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';

const STORAGE_KEY = 'qa-helper-wallets';

// eslint-disable-next-line react-refresh/only-export-components
export const WalletStoreContext = createContext<WalletStoreContextValue | null>(null);

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

export function WalletStoreProvider({ children }: { children: React.ReactNode }) {
  // Use a ref to store wallet instances (non-serializable)
  const walletInstancesRef = useRef<Map<string, HathorWallet | null>>(new Map());

  // Use state for wallet metadata and status (triggers re-renders)
  const [walletsMap, setWalletsMap] = useState<Map<string, WalletInfo>>(() => {
    const initialMap = new Map<string, WalletInfo>();
    const storedWallets = loadWalletsFromStorage();

    // Initialize from LocalStorage
    storedWallets.forEach((metadata) => {
      initialMap.set(metadata.id, {
        metadata,
        instance: null,
        status: 'idle',
      });
    });

    return initialMap;
  });

  // Sync to LocalStorage whenever wallets change
  useEffect(() => {
    const metadataArray = Array.from(walletsMap.values()).map((info) => info.metadata);
    saveWalletsToStorage(metadataArray);
  }, [walletsMap]);

  /**
   * Add a new wallet to the store
   */
  const addWallet = useCallback((metadata: Omit<WalletMetadata, 'id' | 'createdAt'>): string => {
    const id = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullMetadata: WalletMetadata = {
      ...metadata,
      id,
      createdAt: Date.now(),
    };

    setWalletsMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, {
        metadata: fullMetadata,
        instance: null,
        status: 'idle',
      });
      return newMap;
    });

    return id;
  }, []);

  /**
   * Remove a wallet from the store
   */
  const removeWallet = useCallback((id: string): void => {
    // Stop the wallet instance if it exists
    const instance = walletInstancesRef.current.get(id);
    if (instance) {
      instance.stop().catch(console.error);
      walletInstancesRef.current.delete(id);
    }

    setWalletsMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  /**
   * Get a wallet by ID
   */
  const getWallet = useCallback((id: string): WalletInfo | undefined => {
    const walletInfo = walletsMap.get(id);
    if (!walletInfo) return undefined;

    // Return the wallet info with the current instance from the ref
    return {
      ...walletInfo,
      instance: walletInstancesRef.current.get(id) || null,
    };
  }, [walletsMap]);

  /**
   * Update a wallet's friendly name
   */
  const updateFriendlyName = useCallback((id: string, friendlyName: string): void => {
    setWalletsMap((prev) => {
      const walletInfo = prev.get(id);
      if (!walletInfo) return prev;

      const newMap = new Map(prev);
      newMap.set(id, {
        ...walletInfo,
        metadata: {
          ...walletInfo.metadata,
          friendlyName,
        },
      });
      return newMap;
    });
  }, []);

  /**
   * Update a wallet's instance
   */
  const updateWalletInstance = useCallback((id: string, instance: HathorWallet | null): void => {
    walletInstancesRef.current.set(id, instance);

    // Trigger a re-render by updating the map
    setWalletsMap((prev) => {
      const walletInfo = prev.get(id);
      if (!walletInfo) return prev;

      const newMap = new Map(prev);
      newMap.set(id, {
        ...walletInfo,
        instance,
      });
      return newMap;
    });
  }, []);

  /**
   * Update a wallet's status
   */
  const updateWalletStatus = useCallback(
    (id: string, status: WalletStatus, firstAddress?: string, error?: string): void => {
      setWalletsMap((prev) => {
        const walletInfo = prev.get(id);
        if (!walletInfo) return prev;

        const newMap = new Map(prev);
        newMap.set(id, {
          ...walletInfo,
          status,
          firstAddress: firstAddress || walletInfo.firstAddress,
          error,
        });
        return newMap;
      });
    },
    []
  );

  /**
   * Get all wallets as an array
   */
  const getAllWallets = useCallback((): WalletInfo[] => {
    return Array.from(walletsMap.values()).map((walletInfo) => ({
      ...walletInfo,
      instance: walletInstancesRef.current.get(walletInfo.metadata.id) || null,
    }));
  }, [walletsMap]);

  const value: WalletStoreContextValue = {
    wallets: walletsMap,
    addWallet,
    removeWallet,
    getWallet,
    updateFriendlyName,
    updateWalletInstance,
    updateWalletStatus,
    getAllWallets,
  };

  return <WalletStoreContext.Provider value={value}>{children}</WalletStoreContext.Provider>;
}
