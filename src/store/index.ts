/**
 * Redux Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import walletStoreReducer from './slices/walletStoreSlice';
import stageReducer from './slices/stageSlice';
import addressValidationReducer from './slices/addressValidationSlice';
import toastReducer from './slices/toastSlice';
import walletSelectionReducer from './slices/walletSelectionSlice';
import tokensReducer from './slices/tokensSlice';
import transactionHistoryReducer from './slices/transactionHistorySlice';
import customTokensReducer from './slices/customTokensSlice';
import rpcReducer from './slices/rpcSlice';
import walletConnectReducer from './slices/walletConnectSlice';
import getBalanceReducer from './slices/getBalanceSlice';

export const store = configureStore({
  reducer: {
    walletStore: walletStoreReducer,
    stage: stageReducer,
    addressValidation: addressValidationReducer,
    toast: toastReducer,
    walletSelection: walletSelectionReducer,
    tokens: tokensReducer,
    transactionHistory: transactionHistoryReducer,
    customTokens: customTokensReducer,
    rpc: rpcReducer,
    walletConnect: walletConnectReducer,
    getBalance: getBalanceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serializability check for wallet instances and WalletConnect client
      serializableCheck: {
        ignoredActions: [
          'walletStore/updateWalletInstance',
          'walletConnect/initialize/fulfilled',
          'walletConnect/connect/fulfilled',
        ],
        ignoredPaths: ['walletStore.wallets', 'walletConnect.client', 'walletConnect.session'],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
