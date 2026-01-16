/**
 * Raw RPC Slice
 *
 * Manages raw RPC request/response history with timestamps
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface RawRpcHistoryEntry {
  id: string;
  request: string;  // Raw JSON string
  response: string | null;  // Raw JSON string response
  error: string | null;
  timestamp: number;
  duration: number | null;
}

export interface RawRpcState {
  // Current editor content
  currentRequest: string;
  // History of requests/responses
  history: RawRpcHistoryEntry[];
}

const initialState: RawRpcState = {
  currentRequest: JSON.stringify({
    method: 'htr_getWalletInformation',
    params: {
      network: 'testnet',
    },
  }, null, 2),
  history: [],
};

const rawRpcSlice = createSlice({
  name: 'rawRpc',
  initialState,
  reducers: {
    setCurrentRequest: (state, action: PayloadAction<string>) => {
      state.currentRequest = action.payload;
    },

    addHistoryEntry: (
      state,
      action: PayloadAction<{
        request: string;
        response: string | null;
        error: string | null;
        duration: number | null;
      }>
    ) => {
      const entry: RawRpcHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        request: action.payload.request,
        response: action.payload.response,
        error: action.payload.error,
        timestamp: Date.now(),
        duration: action.payload.duration,
      };
      // Add to beginning of array (most recent first)
      state.history.unshift(entry);
    },

    clearHistory: (state) => {
      state.history = [];
    },

    removeHistoryEntry: (state, action: PayloadAction<string>) => {
      state.history = state.history.filter(entry => entry.id !== action.payload);
    },
  },
});

export const {
  setCurrentRequest,
  addHistoryEntry,
  clearHistory,
  removeHistoryEntry,
} = rawRpcSlice.actions;

export default rawRpcSlice.reducer;
