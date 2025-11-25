/**
 * Sign Oracle Data Slice
 *
 * Manages state for signing oracle data RPC calls
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface SignOracleDataState {
  request: { method: string; params: any } | null;
  response: any | null;
  rawResponse: any | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
  signedData: string | null; // Extracted signed data for convenience
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
};

const signOracleDataSlice = createSlice({
  name: 'signOracleData',
  initialState,
  reducers: {
    setSignOracleDataRequest: (
      state,
      action: PayloadAction<{ method: string; params: any; isDryRun: boolean }>
    ) => {
      state.request = { method: action.payload.method, params: action.payload.params };
      state.isDryRun = action.payload.isDryRun;
      state.timestamp = Date.now();
    },
    setSignOracleDataResponse: (
      state,
      action: PayloadAction<{ response: any; duration: number }>
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
      } catch (e) {
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
  },
});

export const {
  setSignOracleDataRequest,
  setSignOracleDataResponse,
  setSignOracleDataError,
  clearSignOracleDataData,
} = signOracleDataSlice.actions;

export default signOracleDataSlice.reducer;
