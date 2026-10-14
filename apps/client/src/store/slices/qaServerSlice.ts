/**
 * Wallet sessions on the local QA server, shared by the Shielded stages.
 *
 * Holds only serializable session metadata (`WalletSession`) and a label per
 * session for sessions started from this client ("Test wallet 1"). Seeds
 * never enter Redux: the start thunk reads the seed from the wallet metadata
 * and sends it straight to the server.
 */

import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { NETWORKS } from '@qa-helper/shared/networks';
import type { WalletSession } from '@qa-helper/shared/serverApi';
import {
  pollSessionUntilSettled,
  qaServerClient,
  toErrorInfo,
  type QaServerErrorInfo,
} from '../../services/qaServerClient';
import type { RootState } from '../index';

export interface QaServerState {
  sessions: WalletSession[];
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: QaServerErrorInfo | null;
  /** Friendly name of the client wallet a session was started from. */
  labels: Record<string, string>;
}

const LABELS_KEY = 'qa-helper-server-session-labels';

/** Labels survive reloads; sessions outlive the page on the server. They hold names only, never seeds. */
function loadLabels(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LABELS_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveLabels(labels: Record<string, string>) {
  try {
    localStorage.setItem(LABELS_KEY, JSON.stringify(labels));
  } catch {
    // Storage unavailable (tests, private mode): labels last for the session.
  }
}

const initialState: QaServerState = { sessions: [], status: 'idle', error: null, labels: loadLabels() };

const qaServerSlice = createSlice({
  name: 'qaServer',
  initialState,
  reducers: {
    sessionsLoading: (state) => {
      state.status = 'loading';
    },
    sessionsLoaded: (state, action: PayloadAction<WalletSession[]>) => {
      state.sessions = action.payload;
      state.status = 'loaded';
      state.error = null;
    },
    sessionsFailed: (state, action: PayloadAction<QaServerErrorInfo>) => {
      state.status = 'error';
      state.error = action.payload;
    },
    sessionUpserted: (state, action: PayloadAction<WalletSession>) => {
      const i = state.sessions.findIndex((s) => s.id === action.payload.id);
      if (i === -1) state.sessions.push(action.payload);
      else state.sessions[i] = action.payload;
    },
    sessionRemoved: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter((s) => s.id !== action.payload);
      delete state.labels[action.payload];
      saveLabels(state.labels);
    },
    sessionLabelSet: (state, action: PayloadAction<{ id: string; label: string }>) => {
      state.labels[action.payload.id] = action.payload.label;
      saveLabels(state.labels);
    },
  },
});

export const { sessionsLoading, sessionsLoaded, sessionsFailed, sessionUpserted, sessionRemoved, sessionLabelSet } =
  qaServerSlice.actions;
export default qaServerSlice.reducer;

export const selectQaServer = (state: RootState) => state.qaServer;
export const selectServerSessions = (state: RootState) => state.qaServer.sessions;
export const selectReadySessions = createSelector([selectServerSessions], (sessions) =>
  sessions.filter((s) => s.state === 'ready')
);

/** The server runs the native prover, so a ready session on a shielded network can create shielded outputs. */
export function isSessionShieldedReady(session: WalletSession): boolean {
  return session.state === 'ready' && NETWORKS[session.network].supportsShielded && session.shieldedAddress0 !== null;
}

export function sessionLabel(session: WalletSession, labels: Record<string, string>): string {
  return labels[session.id] ?? `Server wallet ${session.legacyAddress0.slice(0, 6)}…`;
}

export const fetchServerSessions = createAsyncThunk('qaServer/fetchSessions', async (_: void, { dispatch }) => {
  dispatch(sessionsLoading());
  try {
    dispatch(sessionsLoaded(await qaServerClient.listSessions()));
  } catch (err) {
    dispatch(sessionsFailed(toErrorInfo(err)));
  }
});

/**
 * Starts a client wallet on the server and polls until it settles. The thunk
 * takes the wallet id, not the seed, so the seed never appears in an action:
 * it goes from the wallet metadata straight into the request body.
 */
export const startServerSession = createAsyncThunk(
  'qaServer/startSession',
  async (walletId: string, { dispatch, getState }) => {
    const wallet = (getState() as RootState).walletStore.wallets[walletId];
    if (!wallet) throw new Error('Wallet not found');
    const { seedWords, network, friendlyName } = wallet.metadata;
    const { session } = await qaServerClient.startSession({ seed: seedWords, network });
    dispatch(sessionLabelSet({ id: session.id, label: friendlyName }));
    dispatch(sessionUpserted(session));
    if (session.state !== 'starting') return session;
    return pollSessionUntilSettled({
      id: session.id,
      getSession: qaServerClient.getSession,
      onUpdate: (s) => dispatch(sessionUpserted(s)),
    });
  }
);

export const stopServerSession = createAsyncThunk('qaServer/stopSession', async (id: string, { dispatch }) => {
  await qaServerClient.stopSession(id);
  dispatch(sessionRemoved(id));
});
