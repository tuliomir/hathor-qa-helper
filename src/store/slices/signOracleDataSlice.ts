/**
 * Sign Oracle Data Slice
 *
 * Manages state for signing oracle data RPC calls
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface SignOracleDataState {
  request: { method: string; params: unknown } | null;
  response: unknown | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
  signedData: string | null; // Extracted signed data for convenience
  // Form state
  ncId: string;
  addressIndex: number;
  data: string;
}

const initialState: SignOracleDataState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
  signedData: null,
  // Form state
  ncId: '',
  addressIndex: 0,
  data: '',
};

const signOracleDataSlice = createSlice({
  name: 'signOracleData',
  initialState,
  reducers: {
    setSignOracleDataRequest: (
      state,
      action: PayloadAction<{ method: string; params: unknown; isDryRun: boolean }>
    ) => {
      state.request = { method: action.payload.method, params: action.payload.params };
      state.isDryRun = action.payload.isDryRun;
      state.timestamp = Date.now();
    },
    setSignOracleDataResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      state.response = action.payload.response;
      state.rawResponse = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;

      // Extract signed data from response for convenience
      try {
        const parsedResponse = action.payload.response;
        if (parsedResponse?.response?.signedData) {
          state.signedData = parsedResponse.response.signedData;
        } else if (parsedResponse?.signedData) {
          state.signedData = parsedResponse.signedData;
        }
      } catch {
        // If extraction fails, signedData stays null
      }
    },
    setSignOracleDataError: (
      state,
      action: PayloadAction<{ error: string; duration: number }>
    ) => {
      state.error = action.payload.error;
      state.response = null;
      state.rawResponse = null;
      state.signedData = null;
      state.duration = action.payload.duration;
    },
    clearSignOracleDataData: (state) => {
      state.request = null;
      state.response = null;
      state.rawResponse = null;
      state.error = null;
      state.timestamp = null;
      state.duration = null;
      state.signedData = null;
    },
    // Form state actions
    setSignOracleDataFormData: (
      state,
      action: PayloadAction<{
        ncId?: string;
        addressIndex?: number;
        data?: string;
      }>
    ) => {
      if (action.payload.ncId !== undefined) state.ncId = action.payload.ncId;
      if (action.payload.addressIndex !== undefined) state.addressIndex = action.payload.addressIndex;
      if (action.payload.data !== undefined) state.data = action.payload.data;
    },
  },
});

export const {
  setSignOracleDataRequest,
  setSignOracleDataResponse,
  setSignOracleDataError,
  clearSignOracleDataData,
  setSignOracleDataFormData,
} = signOracleDataSlice.actions;

export default signOracleDataSlice.reducer;
