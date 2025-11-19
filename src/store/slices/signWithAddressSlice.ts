/**
 * SignWithAddress Slice
 *
 * Manages signWithAddress RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface SignWithAddressResponse {
  message: string;
  signature: string;
  address: {
    address: string;
    index: number;
    addressPath: string;
  };
}

export interface SignWithAddressState {
  request: {
    method: string;
    params: unknown;
  } | null;
  response: SignWithAddressResponse | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
}

const initialState: SignWithAddressState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
};

const signWithAddressSlice = createSlice({
  name: 'signWithAddress',
  initialState,
  reducers: {
    setSignWithAddressRequest: (
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
    setSignWithAddressResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      state.rawResponse = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;

      // Parse the response into structured format
      try {
        const responseData = action.payload.response as Record<string, unknown>;

        if (
          responseData &&
          responseData.message &&
          responseData.signature &&
          responseData.address
        ) {
          const addressData = responseData.address as Record<string, unknown>;

          state.response = {
            message: responseData.message as string,
            signature: responseData.signature as string,
            address: {
              address: (addressData.address || '') as string,
              index: (addressData.index || 0) as number,
              addressPath: (addressData.addressPath || '') as string,
            },
          };
        }
      } catch (error) {
        console.error('Failed to parse signWithAddress response:', error);
        state.response = null;
      }
    },
    setSignWithAddressError: (state, action: PayloadAction<{ error: string; duration: number }>) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    clearSignWithAddressData: (state) => {
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
  setSignWithAddressRequest,
  setSignWithAddressResponse,
  setSignWithAddressError,
  clearSignWithAddressData,
} = signWithAddressSlice.actions;

export default signWithAddressSlice.reducer;
