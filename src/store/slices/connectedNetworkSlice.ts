/**
 * Connected Network Slice
 *
 * Manages connected network RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ConnectedNetworkResponse {
  network: string;
  genesisHash: string;
}

export interface ConnectedNetworkState {
  request: {
    method: string;
    params: unknown;
  } | null;
  response: ConnectedNetworkResponse | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
}

const initialState: ConnectedNetworkState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
};

const connectedNetworkSlice = createSlice({
  name: 'connectedNetwork',
  initialState,
  reducers: {
    setConnectedNetworkRequest: (
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
    setConnectedNetworkResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      state.rawResponse = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;

      // Parse the response into structured format
      try {
        const responseData = action.payload.response as { response?: ConnectedNetworkResponse };
        if (responseData?.response) {
          state.response = {
            network: responseData.response.network || '',
            genesisHash: responseData.response.genesisHash || '',
          };
        }
      } catch (error) {
        console.error('Failed to parse connected network response:', error);
        state.response = null;
      }
    },
    setConnectedNetworkError: (
      state,
      action: PayloadAction<{ error: string; duration: number }>
    ) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    clearConnectedNetworkData: (state) => {
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
  setConnectedNetworkRequest,
  setConnectedNetworkResponse,
  setConnectedNetworkError,
  clearConnectedNetworkData,
} = connectedNetworkSlice.actions;

export default connectedNetworkSlice.reducer;
