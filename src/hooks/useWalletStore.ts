/**
 * Hook to access the wallet store (now using Redux)
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addWallet as addWalletAction,
  removeWallet as removeWalletAction,
  updateFriendlyName as updateFriendlyNameAction,
  updateWalletInstance as updateWalletInstanceAction,
  updateWalletStatus as updateWalletStatusAction,
} from '../store/slices/walletStoreSlice';
import { selectWalletsMap } from '../store/selectors/walletStoreSelectors';
import type { WalletStoreContextValue } from '../types/walletStore';

export function useWalletStore(): WalletStoreContextValue {
  const dispatch = useAppDispatch();
  const walletsMap = useAppSelector(selectWalletsMap);

  const addWallet = useCallback(
    (metadata: Parameters<WalletStoreContextValue['addWallet']>[0]) => {
      const action = dispatch(addWalletAction(metadata));
      // The ID is generated in the prepare callback and included in the payload
      return action.payload.id;
    },
    [dispatch]
  );

  const removeWallet = useCallback(
    (id: string) => {
      dispatch(removeWalletAction(id));
    },
    [dispatch]
  );

  const getWallet = useCallback(
    (id: string) => {
      return walletsMap.get(id);
    },
    [walletsMap]
  );

  const updateFriendlyName = useCallback(
    (id: string, friendlyName: string) => {
      dispatch(updateFriendlyNameAction({ id, friendlyName }));
    },
    [dispatch]
  );

  const updateWalletInstance = useCallback(
    (id: string, instance: Parameters<WalletStoreContextValue['updateWalletInstance']>[1]) => {
      dispatch(updateWalletInstanceAction({ id, instance }));
    },
    [dispatch]
  );

  const updateWalletStatus = useCallback(
    (id: string, status: Parameters<WalletStoreContextValue['updateWalletStatus']>[1], firstAddress?: string, error?: string) => {
      dispatch(updateWalletStatusAction({ id, status, firstAddress, error }));
    },
    [dispatch]
  );

  const getAllWallets = useCallback(() => {
    return Array.from(walletsMap.values());
  }, [walletsMap]);

  return {
    wallets: walletsMap,
    addWallet,
    removeWallet,
    getWallet,
    updateFriendlyName,
    updateWalletInstance,
    updateWalletStatus,
    getAllWallets,
  };
}
