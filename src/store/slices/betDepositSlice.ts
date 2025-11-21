/**
 * BetDeposit Slice
 *
 * Manages betDeposit (placeBet) RPC request/response data with persistence across navigation
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface BetDepositState {
  request: {
    method: string;
    params: unknown;
  } | null;
  response: unknown | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
  betChoice: string | null; // Store the bet choice for later redemption
}

const initialState: BetDepositState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
  betChoice: null,
};

const betDepositSlice = createSlice({
  name: 'betDeposit',
  initialState,
  reducers: {
    setBetDepositRequest: (
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
    setBetDepositResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number; betChoice?: string }>
    ) => {
      state.rawResponse = action.payload.response;
      state.response = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;
      if (action.payload.betChoice) {
        state.betChoice = action.payload.betChoice;
      }
    },
    setBetDepositError: (state, action: PayloadAction<{ error: string; duration: number }>) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    clearBetDepositData: (state) => {
      state.request = null;
      state.response = null;
      state.rawResponse = null;
      state.error = null;
      state.timestamp = null;
      state.duration = null;
      state.isDryRun = false;
      state.betChoice = null;
    },
  },
});

export const {
  setBetDepositRequest,
  setBetDepositResponse,
  setBetDepositError,
  clearBetDepositData,
} = betDepositSlice.actions;

export default betDepositSlice.reducer;
