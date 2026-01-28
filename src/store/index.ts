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
import signWithAddressReducer from './slices/signWithAddressSlice';
import signOracleDataReducer from './slices/signOracleDataSlice';
import createTokenReducer from './slices/createTokenSlice';
import sendTransactionReducer from './slices/sendTransactionSlice';
import betNanoContractReducer from './slices/betNanoContractSlice';
import betInitializeReducer from './slices/betInitializeSlice';
import betDepositReducer from './slices/betDepositSlice';
import setBetResultReducer from './slices/setBetResultSlice';
import betWithdrawReducer from './slices/betWithdrawSlice';
import txUpdateEventsReducer from './slices/txUpdateEventsSlice';
import navigationReducer from './slices/navigationSlice';
import pushNotificationsReducer from './slices/pushNotificationsSlice';
import walletInformationReducer from './slices/walletInformationSlice';
import connectedNetworkReducer from './slices/connectedNetworkSlice';
import getAddressReducer from './slices/getAddressSlice';
import getUtxosReducer from './slices/getUtxosSlice';
import rawRpcReducer from './slices/rawRpcSlice';
import mobileQAProgressReducer from './slices/mobileQAProgressSlice';
import desktopQAProgressReducer from './slices/desktopQAProgressSlice';
import multisigReducer from './slices/multisigSlice';
import deepLinkReducer from './slices/deepLinkSlice';
import walletScanReducer from './slices/walletScanSlice';

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
    signWithAddress: signWithAddressReducer,
    signOracleData: signOracleDataReducer,
    createToken: createTokenReducer,
    sendTransaction: sendTransactionReducer,
    betNanoContract: betNanoContractReducer,
    betInitialize: betInitializeReducer,
    betDeposit: betDepositReducer,
    setBetResult: setBetResultReducer,
    betWithdraw: betWithdrawReducer,
    txUpdateEvents: txUpdateEventsReducer,
    navigation: navigationReducer,
    pushNotifications: pushNotificationsReducer,
    walletInformation: walletInformationReducer,
    connectedNetwork: connectedNetworkReducer,
    getAddress: getAddressReducer,
    getUtxos: getUtxosReducer,
    rawRpc: rawRpcReducer,
    mobileQAProgress: mobileQAProgressReducer,
    desktopQAProgress: desktopQAProgressReducer,
    multisig: multisigReducer,
    deepLink: deepLinkReducer,
    walletScan: walletScanReducer,
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
