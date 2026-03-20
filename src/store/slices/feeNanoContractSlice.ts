/**
 * Fee Nano Contract Slice
 *
 * Manages the shared Nano Contract ID for fee operations.
 * This ID is set after Initialize Fee succeeds and is used by Deposit and Withdraw RPCs.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface FeeNanoContractState {
  ncId: string | null;
  blueprintId: string | null;
  timestamp: number | null;
}

const initialState: FeeNanoContractState = {
  ncId: null,
  blueprintId: null,
  timestamp: null,
};

const feeNanoContractSlice = createSlice({
  name: 'feeNanoContract',
  initialState,
  reducers: {
    setFeeNanoContractId: (state, action: PayloadAction<{ ncId: string; blueprintId?: string }>) => {
      state.ncId = action.payload.ncId;
      if (action.payload.blueprintId) {
        state.blueprintId = action.payload.blueprintId;
      }
      state.timestamp = Date.now();
    },
    clearFeeNanoContractData: (state) => {
      state.ncId = null;
      state.blueprintId = null;
      state.timestamp = null;
    },
  },
});

export const { setFeeNanoContractId, clearFeeNanoContractData } = feeNanoContractSlice.actions;

export default feeNanoContractSlice.reducer;
