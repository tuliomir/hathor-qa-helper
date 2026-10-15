/**
 * Wallet Transfers Slice
 * Remembers, for the current session, which transfers between the funding
 * and test wallets were sent back from the "Send between wallets" stage.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface WalletTransfersState {
  /** transferKey → hash of the transaction that sent it back. */
  sentBack: Record<string, string>;
}

const initialState: WalletTransfersState = {
  sentBack: {},
};

const walletTransfersSlice = createSlice({
  name: 'walletTransfers',
  initialState,
  reducers: {
    markSentBack: (state, action: PayloadAction<{ key: string; txHash: string }>) => {
      state.sentBack[action.payload.key] = action.payload.txHash;
    },
    clearSentBack: (state) => {
      state.sentBack = {};
    },
  },
});

export const { markSentBack, clearSentBack } = walletTransfersSlice.actions;
export default walletTransfersSlice.reducer;
