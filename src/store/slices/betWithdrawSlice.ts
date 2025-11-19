/**
 * BetWithdraw Slice
 *
 * Manages betWithdraw RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface BetWithdrawState {
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

const initialState: BetWithdrawState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
};

const betWithdrawSlice = createSlice({
  name: 'betWithdraw',
  initialState,
  reducers: {
    setBetWithdrawRequest: (
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
    setBetWithdrawResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      state.rawResponse = action.payload.response;
      state.response = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;
    },
    setBetWithdrawError: (state, action: PayloadAction<{ error: string; duration: number }>) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    clearBetWithdrawData: (state) => {
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
  setBetWithdrawRequest,
  setBetWithdrawResponse,
  setBetWithdrawError,
  clearBetWithdrawData,
} = betWithdrawSlice.actions;

export default betWithdrawSlice.reducer;
