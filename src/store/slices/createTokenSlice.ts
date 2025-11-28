/**
 * CreateToken Slice
 *
 * Manages createToken RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface CreateTokenState {
  request: {
    method: string;
    params: unknown;
  } | null;
  response: unknown | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
}

const initialState: CreateTokenState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
};

const createTokenSlice = createSlice({
  name: 'createToken',
  initialState,
  reducers: {
    setCreateTokenRequest: (
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
    setCreateTokenResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      // Store raw response (BigInt already converted to strings)
      state.rawResponse = action.payload.response;
      state.response = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;
    },
    setCreateTokenError: (state, action: PayloadAction<{ error: string; duration: number }>) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    clearCreateTokenData: (state) => {
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
  setCreateTokenRequest,
  setCreateTokenResponse,
  setCreateTokenError,
  clearCreateTokenData,
} = createTokenSlice.actions;

export default createTokenSlice.reducer;
