/**
 * Polls the helper (QA) server's /health and feeds helperServerSlice.
 * Mount once (the top bar's server pill does). Production builds have no
 * dev proxy, so they mark the server local-only and never poll.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { createHealthPoller, probeHealth, type HealthPoller } from '../services/helperServerHealth';
import { healthProbeFinished, healthProbeStarted, setHelperServerLocalOnly } from '../store/slices/helperServerSlice';

export function useHelperServerHealth() {
  const dispatch = useAppDispatch();
  const pollerRef = useRef<HealthPoller | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      dispatch(setHelperServerLocalOnly());
      return;
    }
    const poller = createHealthPoller({
      probe: () => probeHealth(),
      onStart: (manual) => dispatch(healthProbeStarted({ manual })),
      onResult: (outcome) =>
        dispatch(
          healthProbeFinished({
            outcome,
            latencyMs: outcome.kind === 'online' ? outcome.latencyMs : undefined,
            at: Date.now(),
          })
        ),
      isHidden: () => document.visibilityState === 'hidden',
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (id) => window.clearTimeout(id),
    });
    pollerRef.current = poller;
    poller.start();
    const onVisibility = () => poller.visibilityChanged();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      poller.stop();
      pollerRef.current = null;
    };
  }, [dispatch]);

  const retry = useCallback(() => pollerRef.current?.retry(), []);
  return { retry };
}
