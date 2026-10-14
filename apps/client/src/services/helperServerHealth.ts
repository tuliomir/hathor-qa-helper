/**
 * Health polling for the local QA server ("helper server").
 *
 * The client reaches it through the Vite dev proxy at `/qa-server`. When the
 * server is down, the dev server answers `/qa-server/health` with 204 (see
 * vite.config.ts) so the browser console stays quiet between polls.
 * Production builds have no proxy and do not poll.
 */

import { QA_SERVER_PROXY_PREFIX, type HealthResponse } from '@qa-helper/shared/serverApi';

export const HEALTH_URL = `${QA_SERVER_PROXY_PREFIX}/health`;

export const HEALTH_POLL = {
  /** Interval while online, and the first retry after a failure. */
  baseMs: 10_000,
  /** Ceiling for the doubling backoff while offline. */
  maxBackoffMs: 60_000,
  /** Interval while the tab is hidden. */
  hiddenMs: 120_000,
} as const;

export type ProbeOutcome =
  | { kind: 'online'; health: HealthResponse; latencyMs?: number }
  | { kind: 'offline' }
  | { kind: 'error'; message: string };

function isHealthResponse(body: unknown): body is HealthResponse {
  const b = body as Partial<HealthResponse> | null;
  return (
    typeof b === 'object' && b !== null && b.ok === true && typeof b.version === 'string' && Array.isArray(b.networks)
  );
}

function errorMessage(body: unknown): string | null {
  const message = (body as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === 'string' ? message : null;
}

/** Map an HTTP status and parsed body to a probe outcome. */
export function classifyHealthResponse(status: number, body: unknown): ProbeOutcome {
  if (status === 204 || status === 502 || status === 503 || status === 504) return { kind: 'offline' };
  if (status >= 200 && status < 300) {
    return isHealthResponse(body)
      ? { kind: 'online', health: body }
      : { kind: 'error', message: 'Unexpected /health response' };
  }
  const detail = errorMessage(body);
  return { kind: 'error', message: detail ? `HTTP ${status}: ${detail}` : `HTTP ${status}` };
}

/** One GET /health through the dev proxy. Network failures count as offline. */
export async function probeHealth(
  fetchFn: typeof fetch = fetch,
  now: () => number = () => performance.now()
): Promise<ProbeOutcome> {
  const started = now();
  let response: Response;
  try {
    response = await fetchFn(HEALTH_URL, { cache: 'no-store', headers: { accept: 'application/json' } });
  } catch {
    return { kind: 'offline' };
  }
  const latencyMs = Math.round(now() - started);
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  const outcome = classifyHealthResponse(response.status, body);
  return outcome.kind === 'online' ? { ...outcome, latencyMs } : outcome;
}

/** Delay before the next poll: steady while online, doubling while failing, slow while hidden. */
export function nextPollDelay({ consecutiveFailures, hidden }: { consecutiveFailures: number; hidden: boolean }) {
  if (hidden) return HEALTH_POLL.hiddenMs;
  if (consecutiveFailures <= 1) return HEALTH_POLL.baseMs;
  return Math.min(HEALTH_POLL.baseMs * 2 ** (consecutiveFailures - 1), HEALTH_POLL.maxBackoffMs);
}

export interface HealthPollerDeps {
  probe: () => Promise<ProbeOutcome>;
  onStart: (manual: boolean) => void;
  onResult: (outcome: ProbeOutcome) => void;
  isHidden: () => boolean;
  setTimeout: (fn: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
}

export interface HealthPoller {
  start: () => void;
  stop: () => void;
  /** Probe now and reset the backoff. */
  retry: () => void;
  /** Call on `visibilitychange`: probes at once when the tab becomes visible. */
  visibilityChanged: () => void;
}

export function createHealthPoller(deps: HealthPollerDeps): HealthPoller {
  let timer: number | null = null;
  let failures = 0;
  let running = false;
  let inFlight = false;
  let generation = 0;

  const clear = () => {
    if (timer !== null) deps.clearTimeout(timer);
    timer = null;
  };

  const schedule = () => {
    clear();
    if (!running) return;
    timer = deps.setTimeout(
      () => {
        timer = null;
        void run(false);
      },
      nextPollDelay({ consecutiveFailures: failures, hidden: deps.isHidden() })
    );
  };

  const run = async (manual: boolean) => {
    if (!running || inFlight) return;
    clear();
    inFlight = true;
    const current = generation;
    deps.onStart(manual);
    const outcome = await deps.probe().catch(
      (error: unknown): ProbeOutcome => ({
        kind: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    );
    if (current !== generation) return;
    inFlight = false;
    failures = outcome.kind === 'online' ? 0 : failures + 1;
    deps.onResult(outcome);
    schedule();
  };

  return {
    start() {
      if (running) return;
      running = true;
      generation++;
      void run(false);
    },
    stop() {
      running = false;
      inFlight = false;
      generation++;
      clear();
    },
    retry() {
      failures = 0;
      void run(true);
    },
    visibilityChanged() {
      if (!running) return;
      if (deps.isHidden()) schedule();
      else void run(false);
    },
  };
}
