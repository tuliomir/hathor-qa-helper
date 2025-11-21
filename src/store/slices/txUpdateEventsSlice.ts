/**
 * Redux Slice for Tx Update Events Stage UI State
 * Persists filter and pagination selections across navigation
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface TxUpdateEventsState {
  filterWalletId: string; // 'all' or specific wallet ID
  currentPage: number;
}

const initialState: TxUpdateEventsState = {
  filterWalletId: 'all',
  currentPage: 0,
};

const txUpdateEventsSlice = createSlice({
  name: 'txUpdateEvents',
  initialState,
  reducers: {
    setFilterWalletId: (state, action: PayloadAction<string>) => {
      state.filterWalletId = action.payload;
      state.currentPage = 0; // Reset page when filter changes
    },

    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },

    resetTxUpdateEventsState: () => initialState,
  },
});

export const { setFilterWalletId, setCurrentPage, resetTxUpdateEventsState } =
  txUpdateEventsSlice.actions;

export default txUpdateEventsSlice.reducer;
