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

  // Snap: Set Bet Result → Snap Sign Oracle Data
  snapSignOracleData: {
    ncId: string | null;
    result: string | null;
  };

  // Snap: Sign Oracle Data → Snap Set Bet Result
  snapSetBetResult: {
    ncId: string | null;
    result: string | null;
    oracleSignedData: string | null;
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
  snapSignOracleData: {
    ncId: null,
    result: null,
  },
  snapSetBetResult: {
    ncId: null,
    result: null,
    oracleSignedData: null,
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

    // Snap: Navigate to Snap Sign Oracle Data with data
    navigateToSnapSignOracleData: (
      state,
      action: PayloadAction<{ ncId: string; result: string }>
    ) => {
      state.snapSignOracleData.ncId = action.payload.ncId;
      state.snapSignOracleData.result = action.payload.result;
    },

    clearSnapSignOracleDataNavigation: (state) => {
      state.snapSignOracleData.ncId = null;
      state.snapSignOracleData.result = null;
    },

    // Snap: Navigate to Snap Set Bet Result with signed data
    navigateToSnapSetBetResult: (
      state,
      action: PayloadAction<{ ncId: string; result: string; oracleSignedData: string }>
    ) => {
      state.snapSetBetResult.ncId = action.payload.ncId;
      state.snapSetBetResult.result = action.payload.result;
      state.snapSetBetResult.oracleSignedData = action.payload.oracleSignedData;
    },

    clearSnapSetBetResultNavigation: (state) => {
      state.snapSetBetResult.ncId = null;
      state.snapSetBetResult.result = null;
      state.snapSetBetResult.oracleSignedData = null;
    },

    // Navigate to Raw RPC Editor with request JSON
    navigateToRawRpcEditor: (state, action: PayloadAction<{ requestJson: string }>) => {
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
  navigateToSnapSignOracleData,
  clearSnapSignOracleDataNavigation,
  navigateToSnapSetBetResult,
  clearSnapSetBetResultNavigation,
  navigateToRawRpcEditor,
  clearRawRpcEditorNavigation,
} = navigationSlice.actions;

export default navigationSlice.reducer;
