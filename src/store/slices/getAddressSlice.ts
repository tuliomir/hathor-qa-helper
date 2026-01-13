/**
 * Get Address Slice
 *
 * Manages get address RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type AddressRequestType = 'first_empty' | 'index' | 'client';

export interface GetAddressResponse {
  address: string;
  index: number;
  addressPath: string;
}

export interface GetAddressState {
  request: {
    method: string;
    params: unknown;
  } | null;
  response: GetAddressResponse | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
  // Form state
  requestType: AddressRequestType;
  indexValue: number;
}

const initialState: GetAddressState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
  requestType: 'first_empty',
  indexValue: 0,
};

const getAddressSlice = createSlice({
  name: 'getAddress',
  initialState,
  reducers: {
    setGetAddressRequest: (
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
    setGetAddressResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      state.rawResponse = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;

      // Parse the response into structured format
      try {
        const responseData = action.payload.response as { response?: GetAddressResponse };
        if (responseData?.response) {
          state.response = {
            address: responseData.response.address || '',
            index: responseData.response.index ?? 0,
            addressPath: responseData.response.addressPath || '',
          };
        }
      } catch (error) {
        console.error('Failed to parse get address response:', error);
        state.response = null;
      }
    },
    setGetAddressError: (
      state,
      action: PayloadAction<{ error: string; duration: number }>
    ) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    setRequestType: (state, action: PayloadAction<AddressRequestType>) => {
      state.requestType = action.payload;
    },
    setIndexValue: (state, action: PayloadAction<number>) => {
      state.indexValue = action.payload;
    },
    clearGetAddressData: (state) => {
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
  setGetAddressRequest,
  setGetAddressResponse,
  setGetAddressError,
  setRequestType,
  setIndexValue,
  clearGetAddressData,
} = getAddressSlice.actions;

export default getAddressSlice.reducer;
