/**
 * Redux Toolkit Slice for Wallet Selection
 * Manages the selected funding wallet and test wallet
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface WalletSelectionState {
  fundingWalletId: string | null;
  testWalletId: string | null;
}

const initialState: WalletSelectionState = {
  fundingWalletId: null,
  testWalletId: null,
};

const walletSelectionSlice = createSlice({
  name: 'walletSelection',
  initialState,
  reducers: {
    setFundingWallet: (state, action: PayloadAction<string | null>) => {
      state.fundingWalletId = action.payload;
    },
    setTestWallet: (state, action: PayloadAction<string | null>) => {
      state.testWalletId = action.payload;
    },
    clearWalletSelection: (state) => {
      state.fundingWalletId = null;
      state.testWalletId = null;
    },
  },
});

export const { setFundingWallet, setTestWallet, clearWalletSelection } = walletSelectionSlice.actions;

export default walletSelectionSlice.reducer;