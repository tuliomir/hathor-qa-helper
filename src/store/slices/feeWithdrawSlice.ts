/**
 * FeeWithdraw Slice
 *
 * Manages feeWithdraw RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface FeeWithdrawState {
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
  address: string;
  amount: string;
  token: string;
  pushTx: boolean;
}

const initialState: FeeWithdrawState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
  address: '',
  amount: '10',
  token: '',
  pushTx: false,
};

const feeWithdrawSlice = createSlice({
  name: 'feeWithdraw',
  initialState,
  reducers: {
    setFeeWithdrawRequest: (
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
    setFeeWithdrawResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      state.rawResponse = action.payload.response;
      state.response = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;
    },
    setFeeWithdrawError: (state, action: PayloadAction<{ error: string; duration: number }>) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    setFeeWithdrawFormData: (
      state,
      action: PayloadAction<{ address?: string; amount?: string; token?: string; pushTx?: boolean }>
    ) => {
      if (action.payload.address !== undefined) state.address = action.payload.address;
      if (action.payload.amount !== undefined) state.amount = action.payload.amount;
      if (action.payload.token !== undefined) state.token = action.payload.token;
      if (action.payload.pushTx !== undefined) state.pushTx = action.payload.pushTx;
    },
    clearFeeWithdrawData: (state) => {
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
  setFeeWithdrawRequest,
  setFeeWithdrawResponse,
  setFeeWithdrawError,
  setFeeWithdrawFormData,
  clearFeeWithdrawData,
} = feeWithdrawSlice.actions;

export default feeWithdrawSlice.reducer;
