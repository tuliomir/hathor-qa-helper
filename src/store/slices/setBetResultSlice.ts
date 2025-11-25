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
  // Form state
  ncId: string;
  addressIndex: number;
  result: string;
  oracleSignature: string;
  pushTx: boolean;
}

const initialState: SetBetResultState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
  // Form state
  ncId: '',
  addressIndex: 0,
  result: '',
  oracleSignature: '',
  pushTx: false,
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
    // Form state actions
    setSetBetResultFormData: (
      state,
      action: PayloadAction<{
        ncId?: string;
        addressIndex?: number;
        result?: string;
        oracleSignature?: string;
        pushTx?: boolean;
      }>
    ) => {
      if (action.payload.ncId !== undefined) state.ncId = action.payload.ncId;
      if (action.payload.addressIndex !== undefined) state.addressIndex = action.payload.addressIndex;
      if (action.payload.result !== undefined) state.result = action.payload.result;
      if (action.payload.oracleSignature !== undefined) state.oracleSignature = action.payload.oracleSignature;
      if (action.payload.pushTx !== undefined) state.pushTx = action.payload.pushTx;
    },
  },
});

export const {
  setSetBetResultRequest,
  setSetBetResultResponse,
  setSetBetResultError,
  clearSetBetResultData,
  setSetBetResultFormData,
} = setBetResultSlice.actions;

export default setBetResultSlice.reducer;
