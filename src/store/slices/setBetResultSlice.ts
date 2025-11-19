/**
 * SetBetResult Slice
 *
 * Manages setBetResult RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface SetBetResultState {
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

const initialState: SetBetResultState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
};

const setBetResultSlice = createSlice({
  name: 'setBetResult',
  initialState,
  reducers: {
    setSetBetResultRequest: (
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
    setSetBetResultResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      state.rawResponse = action.payload.response;
      state.response = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;
    },
    setSetBetResultError: (state, action: PayloadAction<{ error: string; duration: number }>) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    clearSetBetResultData: (state) => {
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
  setSetBetResultRequest,
  setSetBetResultResponse,
  setSetBetResultError,
  clearSetBetResultData,
} = setBetResultSlice.actions;

export default setBetResultSlice.reducer;
