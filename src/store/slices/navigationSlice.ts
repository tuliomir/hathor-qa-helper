/**
 * Navigation Slice
 * Stores data to be passed between stages during navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface NavigationState {
  // Data for Sign Oracle Data stage (from Set Bet Result)
  signOracleData: {
    ncId: string | null;
    addressIndex: number | null;
    result: string | null;
  };

  // Data for Set Bet Result stage (from Sign Oracle Data)
  setBetResult: {
    ncId: string | null;
    addressIndex: number | null;
    result: string | null;
    oracleSignature: string | null;
  };

  // Data for Raw RPC Editor stage (from any RPC card)
  rawRpcEditor: {
    requestJson: string | null;
  };
}

const initialState: NavigationState = {
  signOracleData: {
    ncId: null,
    addressIndex: null,
    result: null,
  },
  setBetResult: {
    ncId: null,
    addressIndex: null,
    result: null,
    oracleSignature: null,
  },
  rawRpcEditor: {
    requestJson: null,
  },
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    // Navigate to Sign Oracle Data with data
    navigateToSignOracleData: (
      state,
      action: PayloadAction<{ ncId: string; addressIndex: number; result: string }>
    ) => {
      state.signOracleData.ncId = action.payload.ncId;
      state.signOracleData.addressIndex = action.payload.addressIndex;
      state.signOracleData.result = action.payload.result;
    },

    // Clear Sign Oracle Data navigation data
    clearSignOracleDataNavigation: (state) => {
      state.signOracleData.ncId = null;
      state.signOracleData.addressIndex = null;
      state.signOracleData.result = null;
    },

    // Navigate to Set Bet Result with data
    navigateToSetBetResult: (
      state,
      action: PayloadAction<{
        ncId: string;
        addressIndex: number;
        result: string;
        oracleSignature: string;
      }>
    ) => {
      state.setBetResult.ncId = action.payload.ncId;
      state.setBetResult.addressIndex = action.payload.addressIndex;
      state.setBetResult.result = action.payload.result;
      state.setBetResult.oracleSignature = action.payload.oracleSignature;
    },

    // Clear Set Bet Result navigation data
    clearSetBetResultNavigation: (state) => {
      state.setBetResult.ncId = null;
      state.setBetResult.addressIndex = null;
      state.setBetResult.result = null;
      state.setBetResult.oracleSignature = null;
    },

    // Navigate to Raw RPC Editor with request JSON
    navigateToRawRpcEditor: (
      state,
      action: PayloadAction<{ requestJson: string }>
    ) => {
      state.rawRpcEditor.requestJson = action.payload.requestJson;
    },

    // Clear Raw RPC Editor navigation data
    clearRawRpcEditorNavigation: (state) => {
      state.rawRpcEditor.requestJson = null;
    },
  },
});

export const {
  navigateToSignOracleData,
  clearSignOracleDataNavigation,
  navigateToSetBetResult,
  clearSetBetResultNavigation,
  navigateToRawRpcEditor,
  clearRawRpcEditorNavigation,
} = navigationSlice.actions;

export default navigationSlice.reducer;
