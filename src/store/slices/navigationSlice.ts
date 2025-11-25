/**
 * Navigation Slice
 * Stores data to be passed between stages during navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface NavigationState {
  // Data for Sign Oracle Data stage (from Set Bet Result)
  signOracleData_resultData: string | null;

  // Data for Set Bet Result stage (from Sign Oracle Data)
  setBetResult_oracleSignature: string | null;
}

const initialState: NavigationState = {
  signOracleData_resultData: null,
  setBetResult_oracleSignature: null,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    // Store result data for Sign Oracle Data stage
    setSignOracleDataResult: (state, action: PayloadAction<string>) => {
      state.signOracleData_resultData = action.payload;
    },

    // Clear result data for Sign Oracle Data stage
    clearSignOracleDataResult: (state) => {
      state.signOracleData_resultData = null;
    },

    // Store oracle signature for Set Bet Result stage
    setSetBetResultOracleSignature: (state, action: PayloadAction<string>) => {
      state.setBetResult_oracleSignature = action.payload;
    },

    // Clear oracle signature for Set Bet Result stage
    clearSetBetResultOracleSignature: (state) => {
      state.setBetResult_oracleSignature = null;
    },
  },
});

export const {
  setSignOracleDataResult,
  clearSignOracleDataResult,
  setSetBetResultOracleSignature,
  clearSetBetResultOracleSignature,
} = navigationSlice.actions;

export default navigationSlice.reducer;
