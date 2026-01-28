/**
 * Redux Toolkit Slice for Wallet Scan
 * Manages the state of the "Scan for Lost Funds" feature
 * This is ephemeral state - not persisted to localStorage
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

/**
 * Balance for a single token
 */
export interface TokenBalance {
  uid: string;
  balance: string; // BigInt as string for Redux serializability
}

/**
 * Scan result for a single wallet
 */
export interface WalletScanResult {
  walletId: string;
  htrBalance: string; // BigInt as string
  customTokenBalances: TokenBalance[];
  scannedAt: number; // Timestamp
}

/**
 * Error encountered during scanning a wallet
 */
export interface ScanError {
  walletId: string;
  error: string;
}

/**
 * State for the wallet scan feature
 */
interface WalletScanState {
  results: Record<string, WalletScanResult>;
  isScanning: boolean;
  currentWalletId: string | null;
  currentWalletName: string | null;
  progress: number; // 0-100
  estimatedRemainingMs: number | null;
  totalWallets: number;
  scannedCount: number;
  filterHasBalance: boolean;
  sortByBalance: boolean;
  errors: ScanError[];
}

const initialState: WalletScanState = {
  results: {},
  isScanning: false,
  currentWalletId: null,
  currentWalletName: null,
  progress: 0,
  estimatedRemainingMs: null,
  totalWallets: 0,
  scannedCount: 0,
  filterHasBalance: false,
  sortByBalance: false,
  errors: [],
};

const walletScanSlice = createSlice({
  name: 'walletScan',
  initialState,
  reducers: {
    /**
     * Start a new scan - resets state and sets total wallets
     */
    startScan: (state, action: PayloadAction<{ totalWallets: number }>) => {
      state.results = {};
      state.isScanning = true;
      state.currentWalletId = null;
      state.currentWalletName = null;
      state.progress = 0;
      state.estimatedRemainingMs = null;
      state.totalWallets = action.payload.totalWallets;
      state.scannedCount = 0;
      state.errors = [];
    },

    /**
     * Update scan progress with current wallet info and ETA
     */
    updateScanProgress: (
      state,
      action: PayloadAction<{
        currentWalletId: string;
        currentWalletName: string;
        scannedCount: number;
        estimatedRemainingMs: number | null;
      }>
    ) => {
      const { currentWalletId, currentWalletName, scannedCount, estimatedRemainingMs } = action.payload;
      state.currentWalletId = currentWalletId;
      state.currentWalletName = currentWalletName;
      state.scannedCount = scannedCount;
      state.estimatedRemainingMs = estimatedRemainingMs;
      state.progress = state.totalWallets > 0
        ? Math.round((scannedCount / state.totalWallets) * 100)
        : 0;
    },

    /**
     * Store scan result for a wallet
     */
    addScanResult: (state, action: PayloadAction<WalletScanResult>) => {
      const result = action.payload;
      state.results[result.walletId] = result;
    },

    /**
     * Track errors during scan
     */
    addScanError: (state, action: PayloadAction<ScanError>) => {
      state.errors.push(action.payload);
    },

    /**
     * Mark scan as complete
     */
    completeScan: (state) => {
      state.isScanning = false;
      state.currentWalletId = null;
      state.currentWalletName = null;
      state.progress = 100;
      state.estimatedRemainingMs = null;
    },

    /**
     * Toggle filter to show only wallets with balance
     */
    toggleFilterHasBalance: (state) => {
      state.filterHasBalance = !state.filterHasBalance;
    },

    /**
     * Toggle sort by total balance
     */
    toggleSortByBalance: (state) => {
      state.sortByBalance = !state.sortByBalance;
    },

    /**
     * Clear all scan data
     */
    clearScanResults: (state) => {
      state.results = {};
      state.isScanning = false;
      state.currentWalletId = null;
      state.currentWalletName = null;
      state.progress = 0;
      state.estimatedRemainingMs = null;
      state.totalWallets = 0;
      state.scannedCount = 0;
      state.filterHasBalance = false;
      state.sortByBalance = false;
      state.errors = [];
    },
  },
});

export const {
  startScan,
  updateScanProgress,
  addScanResult,
  addScanError,
  completeScan,
  toggleFilterHasBalance,
  toggleSortByBalance,
  clearScanResults,
} = walletScanSlice.actions;

export default walletScanSlice.reducer;

// Selectors
export const selectWalletScanState = (state: RootState) => state.walletScan;
export const selectScanResults = (state: RootState) => state.walletScan.results;
export const selectIsScanning = (state: RootState) => state.walletScan.isScanning;
export const selectScanProgress = (state: RootState) => ({
  isScanning: state.walletScan.isScanning,
  progress: state.walletScan.progress,
  currentWalletName: state.walletScan.currentWalletName,
  estimatedRemainingMs: state.walletScan.estimatedRemainingMs,
  scannedCount: state.walletScan.scannedCount,
  totalWallets: state.walletScan.totalWallets,
});
export const selectFilterHasBalance = (state: RootState) => state.walletScan.filterHasBalance;
export const selectSortByBalance = (state: RootState) => state.walletScan.sortByBalance;
export const selectScanErrors = (state: RootState) => state.walletScan.errors;

/**
 * Calculate total value for a scan result
 * Formula: 100 custom token units = 1 HTR unit
 * (HTR has 2 decimals, so 100 = 1.00 HTR)
 */
export function calculateTotalValue(result: WalletScanResult): bigint {
  const htrBalance = BigInt(result.htrBalance || '0');
  const customTokenTotal = result.customTokenBalances.reduce(
    (sum, token) => sum + BigInt(token.balance || '0'),
    0n
  );
  // 100 custom token units = 1 HTR unit
  return htrBalance + (customTokenTotal / 100n);
}
