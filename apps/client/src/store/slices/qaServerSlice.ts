/**
 * Signers: the copies of client wallets the local QA server runs with the
 * native prover, so they can create shielded outputs. `useSignerSync`
 * starts and stops them with their wallets (`utils/signerSync.ts`); stages
 * only read them through `selectSigner`.
 *
 * Holds only serializable session metadata (`WalletSession`). Seeds never
 * enter Redux: the start thunk reads the seed from the wallet metadata and
 * sends it straight to the server.
 */

import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
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
  /** Session id → id of the client wallet it was started from. */
  owners: Record<string, string>;
  /** Wallet ids with a start or stop in flight. */
  busy: string[];
  /** Wallet id → why its signer failed to start. Cleared by a retry. */
  failures: Record<string, string>;
}

const OWNERS_KEY = 'qa-helper-signer-owners';
const LEGACY_LABELS_KEY = 'qa-helper-server-session-labels';

/** Owners survive reloads, like the sessions on the server. They hold ids only, never seeds. */
function loadOwners(): Record<string, string> {
  try {
    localStorage.removeItem(LEGACY_LABELS_KEY);
    const parsed: unknown = JSON.parse(localStorage.getItem(OWNERS_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveOwners(owners: Record<string, string>) {
  try {
    localStorage.setItem(OWNERS_KEY, JSON.stringify(owners));
  } catch {
    // Storage unavailable (tests, private mode): owners last for the page.
  }
}

const initialState: QaServerState = {
  sessions: [],
  status: 'idle',
  error: null,
  owners: loadOwners(),
  busy: [],
  failures: {},
};

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
      delete state.owners[action.payload];
      saveOwners(state.owners);
    },
    sessionOwnerSet: (state, action: PayloadAction<{ sessionId: string; walletId: string }>) => {
      state.owners[action.payload.sessionId] = action.payload.walletId;
      saveOwners(state.owners);
    },
    signerBusy: (state, action: PayloadAction<{ walletId: string; busy: boolean }>) => {
      const { walletId, busy } = action.payload;
      state.busy = state.busy.filter((id) => id !== walletId);
      if (busy) state.busy.push(walletId);
    },
    signerFailed: (state, action: PayloadAction<{ walletId: string; error: string }>) => {
      state.failures[action.payload.walletId] = action.payload.error;
    },
    signerRetry: (state, action: PayloadAction<string>) => {
      delete state.failures[action.payload];
    },
  },
});

export const {
  sessionsLoading,
  sessionsLoaded,
  sessionsFailed,
  sessionUpserted,
  sessionRemoved,
  sessionOwnerSet,
  signerBusy,
  signerFailed,
  signerRetry,
} = qaServerSlice.actions;
export default qaServerSlice.reducer;

export const selectQaServer = (state: RootState) => state.qaServer;

export type SignerState = 'off' | 'starting' | 'ready' | 'error';

export interface SignerInfo {
  state: SignerState;
  session: WalletSession | null;
  error: string | null;
}

const OFF: SignerInfo = { state: 'off', session: null, error: null };

/** The signer of a client wallet, matched by owner or by legacy address 0 (the session id). */
export function signerForWallet(qaServer: QaServerState, walletId: string, firstAddress?: string): SignerInfo {
  const session =
    qaServer.sessions.find((s) => qaServer.owners[s.id] === walletId) ??
    (firstAddress ? qaServer.sessions.find((s) => s.id === firstAddress) : undefined) ??
    null;
  const failure = qaServer.failures[walletId];
  if (failure) return { state: 'error', session, error: failure };
  if (!session) return qaServer.busy.includes(walletId) ? { ...OFF, state: 'starting' } : OFF;
  if (session.state === 'error')
    return { state: 'error', session, error: session.error ?? 'The signer failed to start' };
  return { state: session.state === 'ready' ? 'ready' : 'starting', session, error: null };
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
 * Starts a client wallet's signer and polls until it settles. The thunk
 * takes the wallet id, not the seed, so the seed never appears in an action:
 * it goes from the wallet metadata straight into the request body.
 */
export const startSigner = createAsyncThunk(
  'qaServer/startSigner',
  async (walletId: string, { dispatch, getState }) => {
    const wallet = (getState() as RootState).walletStore.wallets[walletId];
    if (!wallet) throw new Error('Wallet not found');
    dispatch(signerBusy({ walletId, busy: true }));
    try {
      const { seedWords, network } = wallet.metadata;
      const { session } = await qaServerClient.startSession({ seed: seedWords, network });
      dispatch(sessionOwnerSet({ sessionId: session.id, walletId }));
      dispatch(sessionUpserted(session));
      if (session.state !== 'starting') return session;
      return await pollSessionUntilSettled({
        id: session.id,
        getSession: qaServerClient.getSession,
        onUpdate: (s) => dispatch(sessionUpserted(s)),
      });
    } catch (err) {
      dispatch(signerFailed({ walletId, error: toErrorInfo(err).message }));
      throw err;
    } finally {
      dispatch(signerBusy({ walletId, busy: false }));
    }
  }
);

export const stopSigner = createAsyncThunk(
  'qaServer/stopSigner',
  async ({ sessionId, walletId }: { sessionId: string; walletId: string }, { dispatch }) => {
    dispatch(signerBusy({ walletId, busy: true }));
    try {
      await qaServerClient.stopSession(sessionId);
      dispatch(sessionRemoved(sessionId));
    } catch (err) {
      // Already gone (the server restarted): nothing left to stop.
      if (toErrorInfo(err).code !== 'NOT_FOUND') throw err;
      dispatch(sessionRemoved(sessionId));
    } finally {
      dispatch(signerBusy({ walletId, busy: false }));
    }
  }
);
