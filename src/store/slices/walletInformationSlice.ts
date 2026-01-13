/**
 * WalletInformation Slice
 *
 * Manages wallet information RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface WalletInformationResponse {
  network: string;
  address0: string;
}

export interface WalletInformationState {
  request: {
    method: string;
    params: unknown;
  } | null;
  response: WalletInformationResponse | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
}

const initialState: WalletInformationState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
};

const walletInformationSlice = createSlice({
  name: 'walletInformation',
  initialState,
  reducers: {
    setWalletInformationRequest: (
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
    setWalletInformationResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      state.rawResponse = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;

      // Parse the response into structured format
      try {
        const responseData = action.payload.response as { response?: WalletInformationResponse };
        if (responseData?.response) {
          state.response = {
            network: responseData.response.network || '',
            address0: responseData.response.address0 || '',
          };
        }
      } catch (error) {
        console.error('Failed to parse wallet information response:', error);
        state.response = null;
      }
    },
    setWalletInformationError: (
      state,
      action: PayloadAction<{ error: string; duration: number }>
    ) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    clearWalletInformationData: (state) => {
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
  setWalletInformationRequest,
  setWalletInformationResponse,
  setWalletInformationError,
  clearWalletInformationData,
} = walletInformationSlice.actions;

export default walletInformationSlice.reducer;
