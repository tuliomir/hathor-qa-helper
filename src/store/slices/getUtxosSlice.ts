/**
 * Get UTXOs Slice
 *
 * Manages get UTXOs RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface UtxoData {
  address: string;
  amount: string;
  tx_id: string;
  locked: boolean;
  index: number;
}

export interface GetUtxosResponse {
  total_amount_available: string;
  total_utxos_available: string;
  total_amount_locked: string;
  total_utxos_locked: string;
  utxos: UtxoData[];
}

export interface GetUtxosState {
  request: {
    method: string;
    params: unknown;
  } | null;
  response: GetUtxosResponse | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
  // Form state
  tokenUid: string;
  maxUtxos: number;
  amountSmallerThan: number | null;
  amountBiggerThan: number | null;
}

const initialState: GetUtxosState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
  tokenUid: '00', // Default to HTR
  maxUtxos: 10,
  amountSmallerThan: null,
  amountBiggerThan: null,
};

const getUtxosSlice = createSlice({
  name: 'getUtxos',
  initialState,
  reducers: {
    setGetUtxosRequest: (
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
    setGetUtxosResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      state.rawResponse = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;

      // Parse the response into structured format
      try {
        const responseData = action.payload.response as { response?: GetUtxosResponse };
        if (responseData?.response) {
          state.response = responseData.response;
        }
      } catch (error) {
        console.error('Failed to parse get UTXOs response:', error);
        state.response = null;
      }
    },
    setGetUtxosError: (
      state,
      action: PayloadAction<{ error: string; duration: number }>
    ) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    setGetUtxosFormData: (
      state,
      action: PayloadAction<{
        tokenUid: string;
        maxUtxos: number;
        amountSmallerThan: number | null;
        amountBiggerThan: number | null;
      }>
    ) => {
      state.tokenUid = action.payload.tokenUid;
      state.maxUtxos = action.payload.maxUtxos;
      state.amountSmallerThan = action.payload.amountSmallerThan;
      state.amountBiggerThan = action.payload.amountBiggerThan;
    },
    clearGetUtxosData: (state) => {
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
  setGetUtxosRequest,
  setGetUtxosResponse,
  setGetUtxosError,
  setGetUtxosFormData,
  clearGetUtxosData,
} = getUtxosSlice.actions;

export default getUtxosSlice.reducer;
