/**
 * Redux Toolkit Slice for Toast Notifications
 * Manages global toast messages for user feedback
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Centralized options type for toasts (duration in milliseconds)
export type ToastOptions = { duration?: number };

export interface Toast {
  id: string;
  message: ReactNode; // allow React nodes so toasts can include links
  type: ToastType;
  duration?: number; // optional duration in milliseconds
}

interface ToastState {
  toasts: Toast[];
}

const initialState: ToastState = {
  toasts: [],
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    addToast: (state, action: PayloadAction<Toast>) => {
      state.toasts.push(action.payload);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = toastSlice.actions;

export default toastSlice.reducer;
