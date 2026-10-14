/**
 * QA server sessions for the Shielded stages. Loads the list when the
 * server comes online and polls it while a session is still starting.
 * Server health itself comes from helperServerSlice (polled by the shell).
 */

import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchServerSessions, selectQaServer } from '../store/slices/qaServerSlice';
import { healthProbeFinished, healthProbeStarted } from '../store/slices/helperServerSlice';
import { probeHealth } from '../services/helperServerHealth';

const STARTING_POLL_MS = 2000;

export function useServerSessions() {
  const dispatch = useAppDispatch();
  const qaServer = useAppSelector(selectQaServer);
  const online = useAppSelector((state) => state.helperServer.status === 'online');
  const anyStarting = qaServer.sessions.some((s) => s.state === 'starting');

  const refresh = useCallback(() => dispatch(fetchServerSessions()), [dispatch]);

  useEffect(() => {
    if (online) void dispatch(fetchServerSessions());
  }, [online, dispatch]);

  useEffect(() => {
    if (!online || !anyStarting) return;
    const timer = window.setInterval(() => void dispatch(fetchServerSessions()), STARTING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [online, anyStarting, dispatch]);

  return { ...qaServer, online, refresh };
}

/** One health check now (the "Check again" button); the shell keeps polling on its own schedule. */
export function useCheckServerNow() {
  const dispatch = useAppDispatch();
  return useCallback(async () => {
    dispatch(healthProbeStarted({ manual: true }));
    const outcome = await probeHealth();
    dispatch(
      healthProbeFinished({
        outcome,
        latencyMs: outcome.kind === 'online' ? outcome.latencyMs : undefined,
        at: Date.now(),
      })
    );
  }, [dispatch]);
}
