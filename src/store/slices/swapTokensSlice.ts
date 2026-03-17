/**
 * Swap Tokens Slice
 *
 * Fetches and caches the swap test token registry from the Hathor swap service.
 * These tokens are side-effects from swap tests and should never be melted —
 * during cleanup they are sent to the funding wallet instead.
 *
 * Source: https://wallet.swap.allowed-tokens.hathor.network/
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Proxied via Vite dev server to avoid CORS — see vite.config.ts /swap-tokens
const SWAP_TOKENS_URL = '/swap-tokens';

interface SwapTokensApiResponse {
  networks: {
    mainnet: { tokens: { uid: string; symbol: string; name: string }[] };
    testnet: { tokens: { uid: string; symbol: string; name: string }[] };
  };
}

interface SwapTokensState {
  /** Token UIDs per network (excluding native HTR uid "00") */
  mainnet: string[];
  testnet: string[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: SwapTokensState = {
  mainnet: [],
  testnet: [],
  status: 'idle',
  error: null,
};

export const fetchSwapTokens = createAsyncThunk(
  'swapTokens/fetch',
  async (_, { getState }) => {
    const state = getState() as RootState;
    // Skip fetch if already cached
    if (state.swapTokens.status === 'succeeded') {
      return null;
    }

    const response = await fetch(SWAP_TOKENS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch swap tokens: ${response.status}`);
    }
    const data: SwapTokensApiResponse = await response.json();
    return data;
  },
  {
    // Prevent concurrent fetches
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      return state.swapTokens.status !== 'loading' && state.swapTokens.status !== 'succeeded';
    },
  }
);

const swapTokensSlice = createSlice({
  name: 'swapTokens',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSwapTokens.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSwapTokens.fulfilled, (state, action) => {
        if (action.payload === null) return; // Was already cached
        const { networks } = action.payload;
        // Store UIDs excluding native HTR ("00")
        state.mainnet = networks.mainnet.tokens
          .map((t) => t.uid)
          .filter((uid) => uid !== '00');
        state.testnet = networks.testnet.tokens
          .map((t) => t.uid)
          .filter((uid) => uid !== '00');
        state.status = 'succeeded';
      })
      .addCase(fetchSwapTokens.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch swap tokens';
      });
  },
});

export default swapTokensSlice.reducer;
