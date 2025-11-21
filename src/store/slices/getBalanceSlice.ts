/**
 * GetBalance Slice
 *
 * Manages getBalance RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface TokenBalanceInfo {
  tokenId: string;
  tokenSymbol: string;
  tokenName: string;
  balance: {
    unlocked: string;  // Store as string for Redux serialization
    locked: string;    // Store as string for Redux serialization
  };
  lockExpires: number | null;
  transactions: number;
}

export interface GetBalanceResponse {
  balances: TokenBalanceInfo[];
}

export interface GetBalanceState {
  request: {
    method: string;
    params: unknown;
  } | null;
  response: GetBalanceResponse | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
}

const initialState: GetBalanceState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
};

const getBalanceSlice = createSlice({
  name: 'getBalance',
  initialState,
  reducers: {
    setGetBalanceRequest: (
      state,
      action: PayloadAction<{ method: string; params: unknown; isDryRun: boolean }>
    ) => {
      state.request = { method: action.payload.method, params: action.payload.params };
      state.isDryRun = action.payload.isDryRun;
      state.timestamp = Date.now();
      state.response = null;
      state.rawResponse = null;
      state.error = null;
      state.duration = null;
    },
    setGetBalanceResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      // Response is already serialized (BigInt converted to strings) before dispatch
      state.rawResponse = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;

      // Parse the response into structured format
      try {
        if (action.payload.response && Array.isArray(action.payload.response)) {
          const balances: TokenBalanceInfo[] = action.payload.response.map((token: unknown) => {
            const tokenData = token as Record<string, unknown>;
            const balance = tokenData.balance as { unlocked?: string | number; locked?: string | number } | undefined;

            // Convert to string for Redux storage (handles both string and number)
            const convertToString = (val: string | number | undefined): string => {
              if (val === undefined || val === null) return '0';
              return typeof val === 'string' ? val : val.toString();
            };

            return {
              tokenId: (tokenData.tokenId || tokenData.token_id || '') as string,
              tokenSymbol: (tokenData.tokenSymbol || tokenData.token_symbol || '') as string,
              tokenName: (tokenData.tokenName || tokenData.token_name || '') as string,
              balance: {
                unlocked: convertToString(balance?.unlocked),
                locked: convertToString(balance?.locked),
              },
              lockExpires: (tokenData.lockExpires || tokenData.lock_expires || null) as number | null,
              transactions: (tokenData.transactions || 0) as number,
            };
          });

          state.response = { balances };
        }
      } catch (error) {
        console.error('Failed to parse getBalance response:', error);
        state.response = null;
      }
    },
    setGetBalanceError: (state, action: PayloadAction<{ error: string; duration: number }>) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    clearGetBalanceData: (state) => {
      state.request = null;
      state.response = null;
      state.rawResponse = null;
      state.error = null;
      state.timestamp = null;
      state.duration = null;
      state.isDryRun = false;
    },
  },
});

export const {
  setGetBalanceRequest,
  setGetBalanceResponse,
  setGetBalanceError,
  clearGetBalanceData,
} = getBalanceSlice.actions;

export default getBalanceSlice.reducer;
