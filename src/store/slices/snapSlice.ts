/**
 * Snap Connection Slice
 *
 * Manages MetaMask Snap connection state
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface InstalledSnap {
  id: string;
  version: string;
}

export interface SnapState {
  isConnected: boolean;
  snapOrigin: string;
  installedSnap: InstalledSnap | null;
  error: string | null;
}

const initialState: SnapState = {
  isConnected: false,
  snapOrigin: '',
  installedSnap: null,
  error: null,
};

const snapSlice = createSlice({
  name: 'snap',
  initialState,
  reducers: {
    setSnapConnected: (
      state,
      action: PayloadAction<{ installedSnap: InstalledSnap; snapOrigin: string }>,
    ) => {
      state.isConnected = true;
      state.installedSnap = action.payload.installedSnap;
      state.snapOrigin = action.payload.snapOrigin;
      state.error = null;
    },
    setSnapOrigin: (state, action: PayloadAction<string>) => {
      state.snapOrigin = action.payload;
    },
    setSnapError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    resetSnap: (state) => {
      state.isConnected = false;
      state.installedSnap = null;
      state.error = null;
    },
  },
});

export const { setSnapConnected, setSnapOrigin, setSnapError, resetSnap } =
  snapSlice.actions;

export const selectIsSnapConnected = (state: RootState) => state.snap.isConnected;
export const selectSnapOrigin = (state: RootState) => state.snap.snapOrigin;
export const selectInstalledSnap = (state: RootState) => state.snap.installedSnap;

export default snapSlice.reducer;
