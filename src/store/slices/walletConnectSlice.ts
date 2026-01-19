/**
 * WalletConnect Redux Slice
 *
 * Manages WalletConnect client, session, and connection state
 */

import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type Client from '@walletconnect/sign-client';
import type { PairingTypes, SessionTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { WalletConnectModal } from '@walletconnect/modal';
import { generateHathorWalletConnectionDeepLink, initializeClient } from '../../services/walletConnectClient';
import { setDeepLink, showDeepLinkModal } from './deepLinkSlice';
import { addToast } from './toastSlice';
import { DEFAULT_PROJECT_ID } from '../../constants/walletConnect';

interface WalletConnectState {
  client: Client | null;
  session: SessionTypes.Struct | null;
  pairings: PairingTypes.Struct[];
  accounts: string[];
  chains: string[];
  isConnecting: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: WalletConnectState = {
  client: null,
  session: null,
  pairings: [],
  accounts: [],
  chains: [],
  isConnecting: false,
  isInitialized: false,
  error: null,
};

// Initialize WalletConnect modal (singleton)
let web3Modal: WalletConnectModal | null = null;

const getWeb3Modal = () => {
  if (!web3Modal) {
    web3Modal = new WalletConnectModal({
      projectId: DEFAULT_PROJECT_ID,
      themeMode: 'dark',
      chains: [],
      mobileWallets: [],
      desktopWallets: [],
      enableAuthMode: false,
      enableExplorer: false,
      explorerRecommendedWalletIds: 'NONE',
      explorerExcludedWalletIds: 'ALL',
      themeVariables: {
        '--wcm-background-color': '#3B82F6',
        '--wcm-font-family': 'system-ui, sans-serif',
        '--wcm-accent-color': '#3B82F6',
      },
    });
  }
  return web3Modal;
};

// Initialize WalletConnect client
export const initializeWalletConnect = createAsyncThunk(
  'walletConnect/initialize',
  async (_, { dispatch }) => {
    const client = await initializeClient();

    // Subscribe to events
    client.on('session_ping', (args) => {
      console.log('[WalletConnect] session_ping', args);
    });

    client.on('session_event', (args) => {
      console.log('[WalletConnect] session_event', args);
    });

    client.on('session_update', ({ topic, params }) => {
      console.log('[WalletConnect] session_update', { topic, params });
      const { namespaces } = params;
      const _session = client.session.get(topic);
      const updatedSession = { ..._session, namespaces };
      dispatch(sessionConnected(updatedSession));
    });

    client.on('session_delete', () => {
      console.log('[WalletConnect] session_delete');
      dispatch(resetSession());
    });

    // Check for persisted session
    const pairings = client.pairing.getAll({ active: true });
    if (client.session.length) {
      const lastKeyIndex = client.session.keys.length - 1;
      const _session = client.session.get(client.session.keys[lastKeyIndex]);
      return {
        client,
        session: _session,
        pairings,
      };
    }

    return {
      client,
      session: null,
      pairings,
    };
  }
);

// Connect to WalletConnect
export const connectWalletConnect = createAsyncThunk<
  SessionTypes.Struct,
  { pairing?: { topic: string } } | undefined,
  { state: { walletConnect: WalletConnectState } }
>('walletConnect/connect', async (params, { getState, dispatch }) => {
  const { client, session } = getState().walletConnect;

  if (!client) {
    throw new Error('WalletConnect is not initialized');
  }

  if (session) {
    return session;
  }

  const requiredNamespaces = {
    hathor: {
      methods: ['htr_signWithAddress', 'htr_sendNanoContractTx', 'htr_signOracleData'],
      chains: ['hathor:testnet'],
      events: [],
    },
  };

  const optionalNamespaces = {
    hathor: {
      methods: [
        'htr_getBalance',
        'htr_getWalletInformation',
        'htr_createToken',
        'htr_createNanoContractCreateTokenTx',
        'htr_getWalletInformation',
        'htr_getConnectedNetwork',
        'htr_getAddress',
        'htr_getUtxos',
        'htr_sendTransaction',
      ],
      chains: ['hathor:testnet'],
      events: [],
    },
  };

  const { uri, approval } = await client.connect({
    pairingTopic: params?.pairing?.topic,
    requiredNamespaces,
    optionalNamespaces,
  });

  console.log('[WalletConnect] Connection initiated', { uri });

  if (uri) {
    const modal = getWeb3Modal();
    const standaloneChains = Object.values(requiredNamespaces)
      .map((namespace) => namespace.chains)
      .flat() as string[];

    modal.openModal({
      uri,
      standaloneChains,
    });

    // Generate deep link and show modal immediately for mobile users to scan QR code
    // Both modals (WalletConnect and DeepLink) need to be visible:
    // - WalletConnect modal handles the web3 connection flow
    // - DeepLink modal provides the QR code for mobile devices to open Hathor Wallet
    const deepLinkUrl = generateHathorWalletConnectionDeepLink(uri);
    dispatch(setDeepLink({ url: deepLinkUrl, title: 'Connect to Hathor Wallet' }));
    dispatch(showDeepLinkModal());
    dispatch(
      addToast({
        id: `deeplink-toast-${Date.now()}`,
        message: 'Deep link available. Click to show QR code.',
        type: 'info',
        duration: 30000, // 30 seconds
        actionType: 'showDeepLinkModal',
      })
    );
  }

  try {
    const newSession = await approval();
    getWeb3Modal().closeModal();
    console.log('[WalletConnect] Session established', newSession);
    return newSession;
  } catch (error) {
    getWeb3Modal().closeModal();
    throw error;
  }
});

// Disconnect from WalletConnect
export const disconnectWalletConnect = createAsyncThunk<
  void,
  void,
  { state: { walletConnect: WalletConnectState } }
>('walletConnect/disconnect', async (_, { getState }) => {
  const { client, session } = getState().walletConnect;

  if (!client) {
    throw new Error('WalletConnect is not initialized');
  }
  if (!session) {
    throw new Error('Session is not connected');
  }

  await client.disconnect({
    topic: session.topic,
    reason: getSdkError('USER_DISCONNECTED'),
  });
});

const walletConnectSlice = createSlice({
  name: 'walletConnect',
  initialState,
  reducers: {
    sessionConnected: (state, action: PayloadAction<SessionTypes.Struct>) => {
      const session = action.payload;
      const allNamespaceAccounts = Object.values(session.namespaces)
        .map((namespace) => namespace.accounts)
        .flat();
      const allNamespaceChains = Object.keys(session.namespaces);

      state.session = session;
      state.chains = allNamespaceChains;
      state.accounts = allNamespaceAccounts;
    },

    resetSession: (state) => {
      state.session = null;
      state.accounts = [];
      state.chains = [];
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Initialize
    builder.addCase(initializeWalletConnect.pending, (state) => {
      state.isInitialized = false;
      state.error = null;
    });
    builder.addCase(initializeWalletConnect.fulfilled, (state, action) => {
      state.client = action.payload.client;
      state.session = action.payload.session;
      state.pairings = action.payload.pairings;
      state.isInitialized = true;

      if (action.payload.session) {
        const allNamespaceAccounts = Object.values(action.payload.session.namespaces)
          .map((namespace) => namespace.accounts)
          .flat();
        const allNamespaceChains = Object.keys(action.payload.session.namespaces);
        state.chains = allNamespaceChains;
        state.accounts = allNamespaceAccounts;
      }
    });
    builder.addCase(initializeWalletConnect.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to initialize WalletConnect';
      state.isInitialized = true;
    });

    // Connect
    builder.addCase(connectWalletConnect.pending, (state) => {
      state.isConnecting = true;
      state.error = null;
    });
    builder.addCase(connectWalletConnect.fulfilled, (state, action) => {
      const session = action.payload;
      const allNamespaceAccounts = Object.values(session.namespaces)
        .map((namespace) => namespace.accounts)
        .flat();
      const allNamespaceChains = Object.keys(session.namespaces);

      state.session = session;
      state.chains = allNamespaceChains;
      state.accounts = allNamespaceAccounts;
      state.isConnecting = false;

      if (state.client) {
        state.pairings = state.client.pairing.getAll({ active: true });
      }
    });
    builder.addCase(connectWalletConnect.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to connect';
      state.isConnecting = false;
    });

    // Disconnect
    builder.addCase(disconnectWalletConnect.fulfilled, (state) => {
      state.session = null;
      state.accounts = [];
      state.chains = [];
    });
    builder.addCase(disconnectWalletConnect.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to disconnect';
    });
  },
});

export const { sessionConnected, resetSession, setError } = walletConnectSlice.actions;

export default walletConnectSlice.reducer;

// Selectors
export const selectWalletConnectSession = (state: { walletConnect: WalletConnectState }) =>
  state.walletConnect.session;

export const selectIsWalletConnectConnected = (state: { walletConnect: WalletConnectState }) =>
  !!state.walletConnect.session;

export const selectWalletConnectFirstAddress = (state: { walletConnect: WalletConnectState }) => {
  const session = state.walletConnect.session;
  if (!session) return '';

  const accountString = session.namespaces?.hathor?.accounts?.[0] || '::';
  const [, , addr] = accountString.split(':');
  return addr || '';
};
