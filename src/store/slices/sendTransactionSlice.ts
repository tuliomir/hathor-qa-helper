/**
 * SendTransaction Slice
 *
 * Manages sendTransaction RPC request/response data with persistence across navigation
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export type SendTransactionOutputType = 'token' | 'data';

export interface SendTransactionOutput {
  type: SendTransactionOutputType;
  // Token output fields
  address?: string;
  value?: string;
  token?: string; // Token UID (default '00' for HTR)
  // Data output fields
  data?: string; // Max 255 characters
}

export interface SendTransactionFormData {
  pushTx: boolean;
  outputs: SendTransactionOutput[];
}

export interface SendTransactionState {
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
  formData: SendTransactionFormData;
}

const initialState: SendTransactionState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
  formData: {
    pushTx: false,
    outputs: [{ type: 'token', address: '', value: '', token: '00' }],
  },
};

const sendTransactionSlice = createSlice({
  name: 'sendTransaction',
  initialState,
  reducers: {
    setSendTransactionRequest: (
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
    setSendTransactionResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      // Store raw response
      state.rawResponse = action.payload.response;
      state.response = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;
    },
    setSendTransactionError: (
      state,
      action: PayloadAction<{ error: string; duration: number }>
    ) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    setSendTransactionFormData: (
      state,
      action: PayloadAction<SendTransactionFormData>
    ) => {
      state.formData = action.payload;
    },
    clearSendTransactionData: (state) => {
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
  setSendTransactionRequest,
  setSendTransactionResponse,
  setSendTransactionError,
  setSendTransactionFormData,
  clearSendTransactionData,
} = sendTransactionSlice.actions;

export default sendTransactionSlice.reducer;
