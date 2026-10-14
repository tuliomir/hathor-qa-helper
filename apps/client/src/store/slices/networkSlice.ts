/**
 * Active network.
 *
 * Wallets carry their own network, so the active network is derived: the
 * selected test wallet's network, else the funding wallet's, else the
 * preferred network chosen in the network switcher. The preference is also
 * the default for new wallets. Nothing here starts, stops or moves wallets.
 */

import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_NETWORK, NETWORK_CONFIG, networkKind, type NetworkKey } from '../../constants/network';
import type { RootState } from '../index';

const STORAGE_KEY = 'qa-helper-preferred-network';

export interface NetworkState {
  preferredNetwork: NetworkKey;
}

function isKnownNetwork(value: unknown): value is NetworkKey {
  return typeof value === 'string' && value in NETWORK_CONFIG;
}

function loadPreferredNetwork(): NetworkKey {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isKnownNetwork(stored) ? stored : DEFAULT_NETWORK;
  } catch {
    return DEFAULT_NETWORK;
  }
}

function savePreferredNetwork(network: NetworkKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, network);
  } catch {
    // Storage unavailable (tests, private mode): the preference lives for the session only.
  }
}

const initialState: NetworkState = { preferredNetwork: loadPreferredNetwork() };

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setPreferredNetwork: (state, action: PayloadAction<NetworkKey>) => {
      if (!isKnownNetwork(action.payload)) return;
      state.preferredNetwork = action.payload;
      savePreferredNetwork(action.payload);
    },
  },
});

export const { setPreferredNetwork } = networkSlice.actions;
export default networkSlice.reducer;

export type ActiveNetworkSource = 'test-wallet' | 'funding-wallet' | 'preference';

export interface ActiveNetworkInfo {
  network: NetworkKey;
  source: ActiveNetworkSource;
}

export function resolveActiveNetwork({
  testWalletNetwork,
  fundingWalletNetwork,
  preferred,
}: {
  testWalletNetwork?: NetworkKey | null;
  fundingWalletNetwork?: NetworkKey | null;
  preferred: NetworkKey;
}): ActiveNetworkInfo {
  if (testWalletNetwork) return { network: testWalletNetwork, source: 'test-wallet' };
  if (fundingWalletNetwork) return { network: fundingWalletNetwork, source: 'funding-wallet' };
  return { network: preferred, source: 'preference' };
}

const selectWalletNetwork = (state: RootState, id: string | null): NetworkKey | null =>
  (id && state.walletStore.wallets[id]?.metadata.network) || null;

export const selectPreferredNetwork = (state: RootState) => state.network.preferredNetwork;

export const selectActiveNetworkInfo = createSelector(
  [
    (state: RootState) => selectWalletNetwork(state, state.walletSelection.testWalletId),
    (state: RootState) => selectWalletNetwork(state, state.walletSelection.fundingWalletId),
    selectPreferredNetwork,
  ],
  (testWalletNetwork, fundingWalletNetwork, preferred) =>
    resolveActiveNetwork({ testWalletNetwork, fundingWalletNetwork, preferred })
);

export const selectActiveNetwork = (state: RootState): NetworkKey => selectActiveNetworkInfo(state).network;

export const selectActiveNetworkKind = (state: RootState) => networkKind(selectActiveNetwork(state));
