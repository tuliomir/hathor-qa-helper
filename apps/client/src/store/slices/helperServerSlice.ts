/**
 * Helper (QA) server status, fed by useHelperServerHealth.
 *
 * idle → connecting (first probe) → online | offline | error.
 * Background probes keep the shown status; a manual retry shows connecting.
 * Production builds are `local-only`: there is no proxy to reach a server.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ProbeOutcome } from '../../services/helperServerHealth';

export type HelperServerStatus = 'idle' | 'connecting' | 'online' | 'offline' | 'error' | 'local-only';

export interface HelperServerState {
  status: HelperServerStatus;
  version: string | null;
  networks: string[];
  sessions: number | null;
  latencyMs: number | null;
  /** Epoch ms of the last successful health check. */
  lastSeen: number | null;
  /** Epoch ms of the last finished check. */
  lastChecked: number | null;
  error: string | null;
  consecutiveFailures: number;
}

const initialState: HelperServerState = {
  status: 'idle',
  version: null,
  networks: [],
  sessions: null,
  latencyMs: null,
  lastSeen: null,
  lastChecked: null,
  error: null,
  consecutiveFailures: 0,
};

const helperServerSlice = createSlice({
  name: 'helperServer',
  initialState,
  reducers: {
    setHelperServerLocalOnly: (state) => {
      state.status = 'local-only';
    },
    healthProbeStarted: (state, action: PayloadAction<{ manual: boolean }>) => {
      if (state.status === 'local-only') return;
      if (state.status === 'idle' || action.payload.manual) state.status = 'connecting';
    },
    healthProbeFinished: (state, action: PayloadAction<{ outcome: ProbeOutcome; latencyMs?: number; at: number }>) => {
      if (state.status === 'local-only') return;
      const { outcome, latencyMs, at } = action.payload;
      state.lastChecked = at;
      if (outcome.kind === 'online') {
        state.status = 'online';
        state.version = outcome.health.version;
        state.networks = outcome.health.networks;
        state.sessions = outcome.health.sessions;
        state.latencyMs = latencyMs ?? null;
        state.lastSeen = at;
        state.error = null;
        state.consecutiveFailures = 0;
        return;
      }
      state.status = outcome.kind;
      state.error = outcome.kind === 'error' ? outcome.message : null;
      state.consecutiveFailures += 1;
    },
  },
});

export const { setHelperServerLocalOnly, healthProbeStarted, healthProbeFinished } = helperServerSlice.actions;
export default helperServerSlice.reducer;
