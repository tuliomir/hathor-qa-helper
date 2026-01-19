/**
 * React hook for address database lookups
 *
 * Provides convenient access to address database queries
 * with loading states for async operations.
 */

import { useCallback, useState } from 'react';
import { findWalletByAddress, getAddressesForWallet, getAllAddresses, } from '../services/addressDatabase';
import type { AddressRecord } from '../types/addressDatabase';

interface UseAddressLookupResult {
  /** Find which wallet owns an address */
  lookupWallet: (address: string) => Promise<string | null>;
  /** Get all addresses for a specific wallet */
  getWalletAddresses: (walletId: string) => Promise<AddressRecord[]>;
  /** Get all stored addresses */
  getAllStoredAddresses: () => Promise<AddressRecord[]>;
  /** Loading state for async operations */
  isLoading: boolean;
}

/**
 * Hook for querying the address database
 *
 * @example
 * ```tsx
 * const { lookupWallet, isLoading } = useAddressLookup();
 *
 * const handleCheck = async (address: string) => {
 *   const walletId = await lookupWallet(address);
 *   if (walletId) {
 *     console.log(`Address belongs to wallet: ${walletId}`);
 *   }
 * };
 * ```
 */
export function useAddressLookup(): UseAddressLookupResult {
  const [isLoading, setIsLoading] = useState(false);

  const lookupWallet = useCallback(async (address: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      return await findWalletByAddress(address);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getWalletAddresses = useCallback(async (walletId: string): Promise<AddressRecord[]> => {
    setIsLoading(true);
    try {
      return await getAddressesForWallet(walletId);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAllStoredAddresses = useCallback(async (): Promise<AddressRecord[]> => {
    setIsLoading(true);
    try {
      return await getAllAddresses();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    lookupWallet,
    getWalletAddresses,
    getAllStoredAddresses,
    isLoading,
  };
}
