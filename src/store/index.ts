/**
 * Redux Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import walletStoreReducer from './slices/walletStoreSlice';
import stageReducer from './slices/stageSlice';

export const store = configureStore({
  reducer: {
    walletStore: walletStoreReducer,
    stage: stageReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serializability check for wallet instances
      serializableCheck: {
        ignoredActions: ['walletStore/updateWalletInstance'],
        ignoredPaths: ['walletStore.wallets'],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;