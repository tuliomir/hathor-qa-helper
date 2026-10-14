/**
 * Tests for the helper (QA) server health polling: response classification,
 * the backoff schedule, the poller loop and the slice's state machine.
 */

import { describe, expect, test } from 'bun:test';
import {
  classifyHealthResponse,
  createHealthPoller,
  HEALTH_POLL,
  nextPollDelay,
  type ProbeOutcome,
} from '../src/services/helperServerHealth';
import helperServerReducer, {
  healthProbeFinished,
  healthProbeStarted,
  setHelperServerLocalOnly,
  type HelperServerState,
} from '../src/store/slices/helperServerSlice';

const HEALTH = { ok: true, version: '0.1.0', networks: ['TESTNET', 'SHIELDED_TESTNET'], sessions: 2 };

describe('classifyHealthResponse', () => {
  test('a valid health body is online', () => {
    expect(classifyHealthResponse(200, HEALTH)).toEqual({ kind: 'online', health: HEALTH });
  });

  test('204 from the dev proxy means the server is not running', () => {
    expect(classifyHealthResponse(204, null)).toEqual({ kind: 'offline' });
  });

  test('gateway errors mean the server is not running', () => {
    for (const status of [502, 503, 504]) {
      expect(classifyHealthResponse(status, null)).toEqual({ kind: 'offline' });
    }
  });

  test('a 200 with an unexpected body is an error', () => {
    expect(classifyHealthResponse(200, { ok: false }).kind).toBe('error');
    expect(classifyHealthResponse(200, '<html>').kind).toBe('error');
  });

  test('other statuses are errors that quote the server message', () => {
    expect(classifyHealthResponse(500, { error: { code: 'LIB_ERROR', message: 'boom' } })).toEqual({
      kind: 'error',
      message: 'HTTP 500: boom',
    });
    expect(classifyHealthResponse(403, null)).toEqual({ kind: 'error', message: 'HTTP 403' });
  });
});

describe('nextPollDelay', () => {
  test('polls every 10s while online', () => {
    expect(nextPollDelay({ consecutiveFailures: 0, hidden: false })).toBe(10_000);
  });

  test('doubles per consecutive failure up to a minute', () => {
    expect(nextPollDelay({ consecutiveFailures: 1, hidden: false })).toBe(10_000);
    expect(nextPollDelay({ consecutiveFailures: 2, hidden: false })).toBe(20_000);
    expect(nextPollDelay({ consecutiveFailures: 3, hidden: false })).toBe(40_000);
    expect(nextPollDelay({ consecutiveFailures: 4, hidden: false })).toBe(60_000);
    expect(nextPollDelay({ consecutiveFailures: 20, hidden: false })).toBe(60_000);
  });

  test('backs off to the hidden interval while the tab is hidden', () => {
    expect(nextPollDelay({ consecutiveFailures: 0, hidden: true })).toBe(HEALTH_POLL.hiddenMs);
    expect(nextPollDelay({ consecutiveFailures: 2, hidden: true })).toBe(HEALTH_POLL.hiddenMs);
    expect(HEALTH_POLL.hiddenMs).toBeGreaterThan(HEALTH_POLL.maxBackoffMs);
  });
});

/** A manual scheduler: timers fire only when the test says so. */
function fakeScheduler() {
  let nextId = 1;
  const timers = new Map<number, { fn: () => void; ms: number }>();
  return {
    timers,
    setTimeout: (fn: () => void, ms: number) => {
      const id = nextId++;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimeout: (id: number) => void timers.delete(id),
    /** Fire the only pending timer and return its delay. */
    fire(): number {
      expect(timers.size).toBe(1);
      const [id, timer] = [...timers.entries()][0];
      timers.delete(id);
      timer.fn();
      return timer.ms;
    },
    pendingDelay: () => [...timers.values()][0]?.ms,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(outcomes: ProbeOutcome[]) {
  const scheduler = fakeScheduler();
  const results: ProbeOutcome[] = [];
  let started = 0;
  let hidden = false;
  const poller = createHealthPoller({
    probe: async () => outcomes.shift() ?? { kind: 'offline' },
    onStart: () => started++,
    onResult: (outcome) => results.push(outcome),
    isHidden: () => hidden,
    setTimeout: scheduler.setTimeout,
    clearTimeout: scheduler.clearTimeout,
  });
  return {
    poller,
    scheduler,
    results,
    started: () => started,
    setHidden: (value: boolean) => (hidden = value),
  };
}

describe('createHealthPoller', () => {
  test('probes immediately on start, then every 10s while online', async () => {
    const online: ProbeOutcome = { kind: 'online', health: HEALTH as never };
    const t = setup([online, online]);
    t.poller.start();
    await flush();
    expect(t.results).toEqual([online]);
    expect(t.scheduler.pendingDelay()).toBe(10_000);

    expect(t.scheduler.fire()).toBe(10_000);
    await flush();
    expect(t.results).toHaveLength(2);
    expect(t.scheduler.pendingDelay()).toBe(10_000);
  });

  test('backs off while offline and resets after the server comes back', async () => {
    const t = setup([
      { kind: 'offline' },
      { kind: 'offline' },
      { kind: 'offline' },
      { kind: 'online', health: HEALTH as never },
    ]);
    t.poller.start();
    await flush();
    expect(t.scheduler.pendingDelay()).toBe(10_000);
    t.scheduler.fire();
    await flush();
    expect(t.scheduler.pendingDelay()).toBe(20_000);
    t.scheduler.fire();
    await flush();
    expect(t.scheduler.pendingDelay()).toBe(40_000);
    t.scheduler.fire();
    await flush();
    expect(t.results.at(-1)?.kind).toBe('online');
    expect(t.scheduler.pendingDelay()).toBe(10_000);
  });

  test('uses the hidden interval while hidden and probes on becoming visible', async () => {
    const t = setup([]);
    t.setHidden(true);
    t.poller.start();
    await flush();
    expect(t.scheduler.pendingDelay()).toBe(HEALTH_POLL.hiddenMs);

    t.setHidden(false);
    t.poller.visibilityChanged();
    await flush();
    expect(t.results).toHaveLength(2);
    expect(t.scheduler.timers.size).toBe(1);
    expect(t.scheduler.pendingDelay()).toBe(20_000);
  });

  test('becoming hidden does not probe early', async () => {
    const t = setup([]);
    t.poller.start();
    await flush();
    t.setHidden(true);
    t.poller.visibilityChanged();
    await flush();
    expect(t.results).toHaveLength(1);
  });

  test('retry probes now, resets the backoff and reports a manual start', async () => {
    const t = setup([{ kind: 'offline' }, { kind: 'offline' }, { kind: 'offline' }]);
    t.poller.start();
    await flush();
    t.scheduler.fire();
    await flush();
    expect(t.scheduler.pendingDelay()).toBe(20_000);

    t.poller.retry();
    await flush();
    expect(t.started()).toBe(3);
    expect(t.scheduler.timers.size).toBe(1);
    expect(t.scheduler.pendingDelay()).toBe(10_000);
  });

  test('stop cancels the pending poll and ignores in-flight results', async () => {
    const t = setup([]);
    t.poller.start();
    t.poller.stop();
    await flush();
    expect(t.results).toHaveLength(0);
    expect(t.scheduler.timers.size).toBe(0);
  });
});

describe('helperServerSlice', () => {
  const initial = (): HelperServerState => helperServerReducer(undefined, { type: 'init' });

  test('starts idle', () => {
    expect(initial().status).toBe('idle');
  });

  test('the first probe moves idle to connecting', () => {
    expect(helperServerReducer(initial(), healthProbeStarted({ manual: false })).status).toBe('connecting');
  });

  test('background probes keep the current status; a manual retry shows connecting', () => {
    let state = helperServerReducer(initial(), healthProbeFinished({ outcome: { kind: 'offline' }, at: 1 }));
    expect(helperServerReducer(state, healthProbeStarted({ manual: false })).status).toBe('offline');
    state = helperServerReducer(state, healthProbeStarted({ manual: true }));
    expect(state.status).toBe('connecting');
  });

  test('an online result records version, latency and heartbeat', () => {
    const state = helperServerReducer(
      initial(),
      healthProbeFinished({ outcome: { kind: 'online', health: HEALTH as never }, latencyMs: 12, at: 1000 })
    );
    expect(state).toMatchObject({
      status: 'online',
      version: '0.1.0',
      sessions: 2,
      latencyMs: 12,
      lastSeen: 1000,
      error: null,
      consecutiveFailures: 0,
    });
  });

  test('failures count up and keep the last heartbeat', () => {
    let state = helperServerReducer(
      initial(),
      healthProbeFinished({ outcome: { kind: 'online', health: HEALTH as never }, latencyMs: 5, at: 1000 })
    );
    state = helperServerReducer(state, healthProbeFinished({ outcome: { kind: 'offline' }, at: 2000 }));
    state = helperServerReducer(
      state,
      healthProbeFinished({ outcome: { kind: 'error', message: 'HTTP 500' }, at: 3000 })
    );
    expect(state).toMatchObject({ status: 'error', error: 'HTTP 500', lastSeen: 1000, consecutiveFailures: 2 });
  });

  test('local-only ignores probes', () => {
    let state = helperServerReducer(initial(), setHelperServerLocalOnly());
    state = helperServerReducer(state, healthProbeStarted({ manual: true }));
    expect(state.status).toBe('local-only');
  });
});
