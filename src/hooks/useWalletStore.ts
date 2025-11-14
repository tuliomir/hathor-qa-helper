/**
 * Hook to access the wallet store
 */

import { useContext } from 'react';
import { WalletStoreContext } from '../contexts/WalletStoreContext';
import type { WalletStoreContextValue } from '../types/walletStore';

export function useWalletStore(): WalletStoreContextValue {
  const context = useContext(WalletStoreContext);
  if (!context) {
    throw new Error('useWalletStore must be used within a WalletStoreProvider');
  }
  return context;
}
