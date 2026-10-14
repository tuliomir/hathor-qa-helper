/**
 * Snap Methods Slice
 *
 * Single keyed slice for all snap method request/response data with persistence across navigation.
 * Each method is stored under a unique methodKey (e.g., 'getAddress', 'getBalance').
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface SnapMethodData {
  request: { method: string; params: unknown } | null;
  response: unknown | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
}

const emptyMethodData: SnapMethodData = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
};

export interface SnapMethodsState {
  methods: Record<string, SnapMethodData>;
}

const initialState: SnapMethodsState = {
  methods: {},
};

const snapMethodsSlice = createSlice({
  name: 'snapMethods',
  initialState,
  reducers: {
    setSnapMethodRequest: (
      state,
      action: PayloadAction<{
        methodKey: string;
        method: string;
        params: unknown;
        isDryRun: boolean;
      }>
    ) => {
      const { methodKey, method, params, isDryRun } = action.payload;
      state.methods[methodKey] = {
        ...emptyMethodData,
        request: { method, params },
        isDryRun,
        timestamp: Date.now(),
      };
    },
    setSnapMethodResponse: (
      state,
      action: PayloadAction<{ methodKey: string; response: unknown; duration: number }>
    ) => {
      const { methodKey, response, duration } = action.payload;
      const existing = state.methods[methodKey];
      if (existing) {
        existing.rawResponse = response;
        existing.response = response;
        existing.duration = duration;
        existing.error = null;
      }
    },
    setSnapMethodError: (state, action: PayloadAction<{ methodKey: string; error: string; duration: number }>) => {
      const { methodKey, error, duration } = action.payload;
      const existing = state.methods[methodKey];
      if (existing) {
        existing.error = error;
        existing.duration = duration;
        existing.response = null;
        existing.rawResponse = null;
      }
    },
    clearSnapMethodData: (state, action: PayloadAction<{ methodKey: string }>) => {
      delete state.methods[action.payload.methodKey];
    },
  },
});

export const { setSnapMethodRequest, setSnapMethodResponse, setSnapMethodError, clearSnapMethodData } =
  snapMethodsSlice.actions;

export default snapMethodsSlice.reducer;
