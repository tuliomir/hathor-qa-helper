/**
 * Push Notifications Slice
 * Tracks tokens sent from funding wallet to test wallet during the current session
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface SentToken {
  tokenId: string;
  tokenSymbol: string;
  amount: string; // String to handle BigInt serialization
  timestamp: number;
  txHash?: string; // Optional, populated when transaction is sent
}

export interface PushNotificationsState {
  sentTokens: SentToken[];
}

const initialState: PushNotificationsState = {
  sentTokens: [],
};

const pushNotificationsSlice = createSlice({
  name: 'pushNotifications',
  initialState,
  reducers: {
    addSentToken: (state, action: PayloadAction<SentToken>) => {
      state.sentTokens.push(action.payload);
    },
    updateSentTokenTxHash: (state, action: PayloadAction<{ timestamp: number; txHash: string }>) => {
      const token = state.sentTokens.find((t) => t.timestamp === action.payload.timestamp);
      if (token) {
        token.txHash = action.payload.txHash;
      }
    },
    clearSentTokens: (state) => {
      state.sentTokens = [];
    },
  },
});

export const { addSentToken, updateSentTokenTxHash, clearSentTokens } = pushNotificationsSlice.actions;
export default pushNotificationsSlice.reducer;
