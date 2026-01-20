/**
 * Redux Toolkit Slice for Tokens
 * Manages available tokens for transactions and balance tracking
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

export interface Token {
  uid: string;
  symbol: string;
  name: string;
  timestamp?: number;
}

interface TokensState {
  tokens: Token[];
  selectedTokenUid: string;
}

// Initialize with native HTR token
const initialState: TokensState = {
  tokens: [
    {
      uid: NATIVE_TOKEN_UID,
      symbol: DEFAULT_NATIVE_TOKEN_CONFIG.symbol,
      name: DEFAULT_NATIVE_TOKEN_CONFIG.name,
    },
  ],
  selectedTokenUid: NATIVE_TOKEN_UID,
};

const tokensSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {
    // Add a token to the store (or update if already exists with new data like timestamp)
    addToken: (state, action: PayloadAction<Token>) => {
      const token = action.payload;
      const existingIndex = state.tokens.findIndex((t) => t.uid === token.uid);
      if (existingIndex === -1) {
        state.tokens.push(token);
      } else {
        // Update existing token with new data (preserves name/symbol, adds timestamp if missing)
        state.tokens[existingIndex] = { ...state.tokens[existingIndex], ...token };
      }
    },
    removeToken: (state, action) => {
      const uid = action.payload;
      state.tokens = state.tokens.filter((t) => t.uid !== uid);
    },
    setSelectedToken: (state, action) => {
      const uid = action.payload;
      if (state.tokens.find((t) => t.uid === uid)) {
        state.selectedTokenUid = uid;
      }
    },
  },
});

export const { addToken, removeToken, setSelectedToken } = tokensSlice.actions;

export default tokensSlice.reducer;
