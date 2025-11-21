/**
 * Bet Nano Contract Slice
 *
 * Manages the shared Nano Contract ID for bet operations.
 * This ID is set after Initialize Bet succeeds and is used by Deposit, SetResult, and Withdraw RPCs.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface BetNanoContractState {
  ncId: string | null;
  blueprintId: string | null;
  token: string | null;
  timestamp: number | null;
}

const initialState: BetNanoContractState = {
  ncId: null,
  blueprintId: null,
  token: null,
  timestamp: null,
};

const betNanoContractSlice = createSlice({
  name: 'betNanoContract',
  initialState,
  reducers: {
    setBetNanoContractId: (state, action: PayloadAction<{ ncId: string; blueprintId?: string; token?: string }>) => {
      state.ncId = action.payload.ncId;
      if (action.payload.blueprintId) {
        state.blueprintId = action.payload.blueprintId;
      }
      if (action.payload.token) {
        state.token = action.payload.token;
      }
      state.timestamp = Date.now();
    },
    setBetBlueprintId: (state, action: PayloadAction<string>) => {
      state.blueprintId = action.payload;
    },
    clearBetNanoContractData: (state) => {
      state.ncId = null;
      state.blueprintId = null;
      state.token = null;
      state.timestamp = null;
    },
  },
});

export const {
  setBetNanoContractId,
  setBetBlueprintId,
  clearBetNanoContractData,
} = betNanoContractSlice.actions;

export default betNanoContractSlice.reducer;
