/**
 * Hook for scanning all wallets to find lost funds
 * Initializes wallets sequentially, collects balances, and manages scan state
 */

import { useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	startWallet,
	stopWallet,
	updateWalletInitDuration,
	walletInstancesMap,
} from '../store/slices/walletStoreSlice';
import {
	addScanError,
	addScanResult,
	completeScan,
	startScan,
	type TokenBalance,
	updateScanProgress,
} from '../store/slices/walletScanSlice';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

// Average init time to use when no historical data is available (15 seconds)
const DEFAULT_INIT_DURATION_MS = 15000;

/**
 * Hook that provides scan functionality for finding lost funds across all wallets
 */
export function useScanForLostFunds() {
  const dispatch = useAppDispatch();
  const wallets = useAppSelector((state) => state.walletStore.wallets);
  const fundingWalletId = useAppSelector((state) => state.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((state) => state.walletSelection.testWalletId);
  const isScanning = useAppSelector((state) => state.walletScan.isScanning);

  // Track wallets that were idle before scanning (to stop them afterward)
  const walletsToStopRef = useRef<Set<string>>(new Set());

  /**
   * Calculate estimated remaining time based on historical init durations
   */
  const calculateEstimatedTime = useCallback(
    (remainingWalletIds: string[]): number | null => {
      if (remainingWalletIds.length === 0) return null;

      let totalEstimate = 0;
      for (const walletId of remainingWalletIds) {
        const wallet = wallets[walletId];
        const duration = wallet?.metadata.lastInitDurationMs ?? DEFAULT_INIT_DURATION_MS;
        totalEstimate += duration;
      }

      return totalEstimate;
    },
    [wallets]
  );

  /**
   * Scan a single wallet for balances
   * Returns true if successful, false otherwise
   */
  const scanWallet = useCallback(
    async (walletId: string): Promise<boolean> => {
      const wallet = wallets[walletId];
      if (!wallet) return false;

      const wasIdle = wallet.status === 'idle' || wallet.status === 'error';
      const startTime = Date.now();

      try {
        // Start wallet if not already running
        if (wasIdle) {
          // Track this wallet for stopping later (unless it's fund/test wallet)
          const shouldStopAfter =
            walletId !== fundingWalletId && walletId !== testWalletId;
          if (shouldStopAfter) {
            walletsToStopRef.current.add(walletId);
          }

          await dispatch(startWallet(walletId)).unwrap();

          // Record init duration
          const initDuration = Date.now() - startTime;
          dispatch(updateWalletInitDuration({ id: walletId, durationMs: initDuration }));
        }

        // Get wallet instance
        const instance = walletInstancesMap.get(walletId);
        if (!instance) {
          throw new Error('Wallet instance not found after start');
        }

        // Fetch HTR balance
        const htrBalanceData = await instance.getBalance(NATIVE_TOKEN_UID);
        const htrBalance =
          htrBalanceData && htrBalanceData[0]
            ? htrBalanceData[0].balance.unlocked.toString()
            : '0';

        // Fetch all token UIDs
        const tokenUids: string[] = await instance.getTokens();

        // Fetch balances for custom tokens (non-HTR)
        const customTokenBalances: TokenBalance[] = [];
        for (const uid of tokenUids) {
          if (uid === NATIVE_TOKEN_UID) continue;

          try {
            const balanceData = await instance.getBalance(uid);
            const balance =
              balanceData && balanceData[0]
                ? balanceData[0].balance.unlocked
                : 0n;

            // Only include tokens with balance > 0
            if (balance > 0n) {
              customTokenBalances.push({
                uid,
                balance: balance.toString(),
              });
            }
          } catch (err) {
            // Silently skip tokens that fail to fetch
            console.debug(`Failed to fetch balance for token ${uid}:`, err);
          }
        }

        // Store scan result
        dispatch(
          addScanResult({
            walletId,
            htrBalance,
            customTokenBalances,
            scannedAt: Date.now(),
          })
        );

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        dispatch(addScanError({ walletId, error: errorMessage }));
        return false;
      }
    },
    [wallets, fundingWalletId, testWalletId, dispatch]
  );

  /**
   * Start scanning all wallets for lost funds
   */
  const startScanForLostFunds = useCallback(async () => {
    if (isScanning) return;

    // Get all wallet IDs
    const walletIds = Object.keys(wallets);
    if (walletIds.length === 0) return;

    // Reset tracking
    walletsToStopRef.current.clear();

    // Initialize scan state
    dispatch(startScan({ totalWallets: walletIds.length }));

    // Scan each wallet sequentially
    for (let i = 0; i < walletIds.length; i++) {
      const walletId = walletIds[i];
      const wallet = wallets[walletId];

      // Calculate remaining wallets for ETA
      const remainingWalletIds = walletIds.slice(i);
      const estimatedRemainingMs = calculateEstimatedTime(remainingWalletIds);

      // Update progress
      dispatch(
        updateScanProgress({
          currentWalletId: walletId,
          currentWalletName: wallet?.metadata.friendlyName || walletId,
          scannedCount: i,
          estimatedRemainingMs,
        })
      );

      // Scan the wallet
      await scanWallet(walletId);
    }

    // Stop wallets that were idle before scanning (excluding fund/test wallets)
    const walletsToStop = Array.from(walletsToStopRef.current);
    for (const walletId of walletsToStop) {
      try {
        await dispatch(stopWallet(walletId)).unwrap();
      } catch (err) {
        console.error(`Failed to stop wallet ${walletId}:`, err);
      }
    }

    // Mark scan complete
    dispatch(completeScan());
  }, [isScanning, wallets, dispatch, calculateEstimatedTime, scanWallet]);

  return {
    startScanForLostFunds,
    isScanning,
  };
}
