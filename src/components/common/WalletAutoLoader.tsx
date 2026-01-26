/**
 * Wallet Auto Loader Component
 * Automatically starts selected wallets when the app loads
 * Place this at the app root to ensure wallets are ready on any route
 */

import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import { startWallet } from '../../store/slices/walletStoreSlice';

/**
 * WalletAutoLoader - Invisible component that auto-starts selected wallets
 *
 * This component:
 * 1. Checks if funding/test wallet IDs are selected in Redux
 * 2. If a wallet exists but is 'idle', automatically starts it
 * 3. Prevents duplicate start attempts with a ref
 */
export default function WalletAutoLoader() {
  const dispatch = useAppDispatch();
  const { getAllWallets } = useWalletStore();

  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);

  // Track which wallets we've already attempted to start
  const startingWallets = useRef<Set<string>>(new Set());

  const wallets = getAllWallets();

  // Debug log on mount
  useEffect(() => {
    console.log('[WalletAutoLoader] Mounted', {
      fundingWalletId,
      testWalletId,
      walletsCount: wallets.length,
      walletIds: wallets.map((w) => ({ id: w.metadata.id, status: w.status, name: w.metadata.friendlyName })),
    });
  }, []);

  useEffect(() => {
    const autoStartWallet = async (walletId: string | null, label: string) => {
      if (!walletId) {
        console.log(`[WalletAutoLoader] No ${label} selected`);
        return;
      }

      // Check if we're already starting this wallet
      if (startingWallets.current.has(walletId)) {
        console.log(`[WalletAutoLoader] ${label} already starting, skipping`);
        return;
      }

      // Find the wallet in the store
      const wallet = wallets.find((w) => w.metadata.id === walletId);
      if (!wallet) {
        console.log(`[WalletAutoLoader] ${label} not found in store (id: ${walletId})`);
        return;
      }

      // Only start if wallet is idle (not already connecting/syncing/ready/error)
      if (wallet.status !== 'idle') {
        console.log(`[WalletAutoLoader] ${label} not idle (status: ${wallet.status})`);
        return;
      }

      console.log(`[WalletAutoLoader] Auto-starting ${label}: ${wallet.metadata.friendlyName}`);

      // Mark as starting to prevent duplicate attempts
      startingWallets.current.add(walletId);

      try {
        await dispatch(startWallet(walletId)).unwrap();
        console.log(`[WalletAutoLoader] ${label} started successfully`);
      } catch (error) {
        console.error(`[WalletAutoLoader] Failed to start ${label}:`, error);
        // Remove from starting set so it can be retried
        startingWallets.current.delete(walletId);
      }
    };

    // Auto-start funding wallet
    autoStartWallet(fundingWalletId, 'Funding Wallet');

    // Auto-start test wallet
    autoStartWallet(testWalletId, 'Test Wallet');
  }, [fundingWalletId, testWalletId, wallets, dispatch]);

  // This component renders nothing - it's purely for side effects
  return null;
}
