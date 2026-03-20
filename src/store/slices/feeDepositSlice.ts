/**
 * FeeDeposit Slice
 *
 * Manages feeDeposit RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface FeeDepositState {
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
  // Form state for prepopulating withdraw
  ncId: string;
  amount: string;
  token: string;
  addressIndex: number;
}

const initialState: FeeDepositState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
  ncId: '',
  amount: '10',
  token: '',
  addressIndex: 0,
};

const feeDepositSlice = createSlice({
  name: 'feeDeposit',
  initialState,
  reducers: {
    setFeeDepositRequest: (state, action: PayloadAction<{ method: string; params: unknown; isDryRun: boolean }>) => {
      state.request = { method: action.payload.method, params: action.payload.params };
      state.isDryRun = action.payload.isDryRun;
      state.timestamp = Date.now();
      state.response = null;
      state.rawResponse = null;
      state.error = null;
      state.duration = null;
    },
    setFeeDepositResponse: (state, action: PayloadAction<{ response: unknown; duration: number }>) => {
      state.rawResponse = action.payload.response;
      state.response = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;
    },
    setFeeDepositError: (state, action: PayloadAction<{ error: string; duration: number }>) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    setFeeDepositFormData: (
      state,
      action: PayloadAction<{ ncId?: string; amount?: string; token?: string; addressIndex?: number }>
    ) => {
      if (action.payload.ncId !== undefined) state.ncId = action.payload.ncId;
      if (action.payload.amount !== undefined) state.amount = action.payload.amount;
      if (action.payload.token !== undefined) state.token = action.payload.token;
      if (action.payload.addressIndex !== undefined) state.addressIndex = action.payload.addressIndex;
    },
    clearFeeDepositData: (state) => {
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
  setFeeDepositRequest,
  setFeeDepositResponse,
  setFeeDepositError,
  setFeeDepositFormData,
  clearFeeDepositData,
} = feeDepositSlice.actions;

export default feeDepositSlice.reducer;
