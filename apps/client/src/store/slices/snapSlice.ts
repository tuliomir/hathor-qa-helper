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

export interface SnapUtxo {
  txId: string;
  index: number;
  amount: number;
  token: string;
  address: string;
  locked: boolean;
}

export interface SnapBetNc {
  ncId: string | null;
  token: string | null;
  betChoice: string | null;
  amount: string | null;
}

export interface SnapFeeNc {
  ncId: string | null;
}

export interface SnapState {
  isConnected: boolean;
  snapOrigin: string;
  installedSnap: InstalledSnap | null;
  error: string | null;
  /** Address at index 0, fetched after connecting */
  address: string | null;
  /** Network name reported by the snap */
  network: string | null;
  /** UTXOs from last htr_getUtxos call, cleared on disconnect/network change */
  utxos: SnapUtxo[];
  /** Bet NC session data, cleared on disconnect/network change */
  betNc: SnapBetNc;
  /** Fee NC session data, cleared on disconnect/network change */
  feeNc: SnapFeeNc;
}

const initialState: SnapState = {
  isConnected: false,
  snapOrigin: '',
  installedSnap: null,
  error: null,
  address: null,
  network: null,
  utxos: [],
  betNc: { ncId: null, token: null, betChoice: null, amount: null },
  feeNc: { ncId: null },
};

const snapSlice = createSlice({
  name: 'snap',
  initialState,
  reducers: {
    setSnapConnected: (state, action: PayloadAction<{ installedSnap: InstalledSnap; snapOrigin: string }>) => {
      state.isConnected = true;
      state.installedSnap = action.payload.installedSnap;
      state.snapOrigin = action.payload.snapOrigin;
      state.error = null;
    },
    setSnapOrigin: (state, action: PayloadAction<string>) => {
      state.snapOrigin = action.payload;
    },
    setSnapWalletInfo: (state, action: PayloadAction<{ address: string; network: string }>) => {
      const networkChanged = state.network !== null && state.network !== action.payload.network;
      state.address = action.payload.address;
      state.network = action.payload.network;
      if (networkChanged) {
        state.utxos = [];
        state.betNc = { ncId: null, token: null, betChoice: null, amount: null };
        state.feeNc = { ncId: null };
      }
    },
    setSnapUtxos: (state, action: PayloadAction<SnapUtxo[]>) => {
      state.utxos = action.payload;
    },
    setSnapBetNc: (state, action: PayloadAction<Partial<SnapBetNc>>) => {
      Object.assign(state.betNc, action.payload);
    },
    setSnapFeeNc: (state, action: PayloadAction<Partial<SnapFeeNc>>) => {
      Object.assign(state.feeNc, action.payload);
    },
    setSnapError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    resetSnap: (state) => {
      state.isConnected = false;
      state.installedSnap = null;
      state.error = null;
      state.address = null;
      state.network = null;
      state.utxos = [];
      state.betNc = { ncId: null, token: null, betChoice: null, amount: null };
      state.feeNc = { ncId: null };
    },
  },
});

export const { setSnapConnected, setSnapOrigin, setSnapWalletInfo, setSnapError, resetSnap, setSnapUtxos, setSnapBetNc, setSnapFeeNc } =
  snapSlice.actions;

export const selectIsSnapConnected = (state: RootState) => state.snap.isConnected;
export const selectSnapOrigin = (state: RootState) => state.snap.snapOrigin;
export const selectInstalledSnap = (state: RootState) => state.snap.installedSnap;
export const selectSnapAddress = (state: RootState) => state.snap.address;
export const selectSnapNetwork = (state: RootState) => state.snap.network;
export const selectSnapUtxos = (state: RootState) => state.snap.utxos;
export const selectSnapBetNc = (state: RootState) => state.snap.betNc;
export const selectSnapFeeNc = (state: RootState) => state.snap.feeNc;

export default snapSlice.reducer;
