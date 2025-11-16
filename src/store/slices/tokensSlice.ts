/**
 * Redux Toolkit Slice for Tokens
 * Manages available tokens for transactions and balance tracking
 */

import { createSlice } from '@reduxjs/toolkit';
import { NATIVE_TOKEN_UID, DEFAULT_NATIVE_TOKEN_CONFIG } from '@hathor/wallet-lib/lib/constants';

interface Token {
  uid: string;
  symbol: string;
  name: string;
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
    // Placeholder reducers for future token management
    addToken: (state, action) => {
      const token = action.payload;
      if (!state.tokens.find((t) => t.uid === token.uid)) {
        state.tokens.push(token);
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
