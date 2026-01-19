/**
 * Redux Toolkit Slice for Deep Link Modal
 * Manages the state for displaying WalletConnect deep links as QR codes
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface DeepLinkState {
  isModalOpen: boolean;
  deepLinkUrl: string | null;
  title: string;
}

const initialState: DeepLinkState = {
  isModalOpen: false,
  deepLinkUrl: null,
  title: 'Scan QR Code',
};

const deepLinkSlice = createSlice({
  name: 'deepLink',
  initialState,
  reducers: {
    setDeepLink: (state, action: PayloadAction<{ url: string; title?: string }>) => {
      state.deepLinkUrl = action.payload.url;
      state.title = action.payload.title || 'Scan QR Code';
    },
    showDeepLinkModal: (state) => {
      state.isModalOpen = true;
    },
    hideDeepLinkModal: (state) => {
      state.isModalOpen = false;
    },
    clearDeepLink: (state) => {
      state.isModalOpen = false;
      state.deepLinkUrl = null;
      state.title = 'Scan QR Code';
    },
  },
});

export const { setDeepLink, showDeepLinkModal, hideDeepLinkModal, clearDeepLink } =
  deepLinkSlice.actions;

export default deepLinkSlice.reducer;

// Selectors
export const selectDeepLinkModalOpen = (state: { deepLink: DeepLinkState }) =>
  state.deepLink.isModalOpen;

export const selectDeepLinkUrl = (state: { deepLink: DeepLinkState }) =>
  state.deepLink.deepLinkUrl;

export const selectDeepLinkTitle = (state: { deepLink: DeepLinkState }) =>
  state.deepLink.title;
