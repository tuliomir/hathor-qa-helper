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
  // Validation state
  validationStatus: 'pending' | 'validating' | 'match' | 'mismatch' | null;
  localAddress: string | null;
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
  validationStatus: null,
  localAddress: null,
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
      state.validationStatus = 'pending'; // Start as pending validation

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
    setValidationStatus: (
      state,
      action: PayloadAction<{ status: 'pending' | 'validating' | 'match' | 'mismatch'; localAddress?: string }>
    ) => {
      state.validationStatus = action.payload.status;
      if (action.payload.localAddress !== undefined) {
        state.localAddress = action.payload.localAddress;
      }
    },
    clearGetAddressData: (state) => {
      state.request = null;
      state.response = null;
      state.rawResponse = null;
      state.error = null;
      state.timestamp = null;
      state.duration = null;
      state.isDryRun = false;
      state.validationStatus = null;
      state.localAddress = null;
    },
  },
});

export const {
  setGetAddressRequest,
  setGetAddressResponse,
  setGetAddressError,
  setRequestType,
  setIndexValue,
  setValidationStatus,
  clearGetAddressData,
} = getAddressSlice.actions;

export default getAddressSlice.reducer;
