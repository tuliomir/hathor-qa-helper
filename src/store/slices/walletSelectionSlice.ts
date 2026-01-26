/**
 * Redux Toolkit Slice for Wallet Selection
 * Manages the selected funding wallet and test wallet
 * Persists selection to localStorage
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

const STORAGE_KEY = 'qa-helper-wallet-selection';

interface WalletSelectionState {
  fundingWalletId: string | null;
  testWalletId: string | null;
}

/**
 * Load wallet selection from localStorage
 */
function loadSelectionFromStorage(): WalletSelectionState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { fundingWalletId: null, testWalletId: null };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load wallet selection from localStorage:', error);
    return { fundingWalletId: null, testWalletId: null };
  }
}

/**
 * Save wallet selection to localStorage
 */
function saveSelectionToStorage(state: WalletSelectionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save wallet selection to localStorage:', error);
  }
}

const initialState: WalletSelectionState = loadSelectionFromStorage();

const walletSelectionSlice = createSlice({
  name: 'walletSelection',
  initialState,
  reducers: {
    setFundingWallet: (state, action: PayloadAction<string | null>) => {
      state.fundingWalletId = action.payload;
      saveSelectionToStorage(state);
    },
    setTestWallet: (state, action: PayloadAction<string | null>) => {
      state.testWalletId = action.payload;
      saveSelectionToStorage(state);
    },
    clearWalletSelection: (state) => {
      state.fundingWalletId = null;
      state.testWalletId = null;
      saveSelectionToStorage(state);
    },
  },
});

export const { setFundingWallet, setTestWallet, clearWalletSelection } = walletSelectionSlice.actions;

export default walletSelectionSlice.reducer;