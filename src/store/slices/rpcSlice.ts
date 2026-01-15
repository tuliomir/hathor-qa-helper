/**
 * RPC Redux Slice
 *
 * Manages RPC request/response history for testing and debugging
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface RpcHistoryEntry {
  id: string; // Unique identifier
  timestamp: number; // When the RPC was executed
  method: string; // RPC method name
  request: {
    method: string;
    params: unknown;
  };
  response: unknown | null; // Response from RPC server (null if dry run or error)
  error: string | null; // Error message if RPC failed
  dryRun: boolean; // Was this a dry run?
  duration?: number; // Time taken for the RPC call (ms)
}

interface RpcState {
  history: RpcHistoryEntry[];
  isDryRun: boolean; // Global dry run mode toggle
}

const initialState: RpcState = {
  history: [],
  isDryRun: false,
};

const rpcSlice = createSlice({
  name: 'rpc',
  initialState,
  reducers: {
    addRpcEntry: (state, action: PayloadAction<Omit<RpcHistoryEntry, 'id' | 'timestamp'>>) => {
      const entry: RpcHistoryEntry = {
        ...action.payload,
        id: `rpc-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      };
      state.history.push(entry);
    },

    clearRpcHistory: (state) => {
      state.history = [];
    },

    removeRpcEntry: (state, action: PayloadAction<string>) => {
      state.history = state.history.filter((entry) => entry.id !== action.payload);
    },

    setDryRunMode: (state, action: PayloadAction<boolean>) => {
      state.isDryRun = action.payload;
    },

    toggleDryRunMode: (state) => {
      state.isDryRun = !state.isDryRun;
    },
  },
});

export const { addRpcEntry, clearRpcHistory, removeRpcEntry, setDryRunMode, toggleDryRunMode } =
  rpcSlice.actions;

export default rpcSlice.reducer;
