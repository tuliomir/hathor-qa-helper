/**
 * Debug log recorder: sends what happens in this tab (the actions below,
 * route changes, errors) and a snapshot of where the run is to the QA
 * server, so an agent can follow a QA session. See knowledge/debug-log.md.
 *
 * Runs only under the dev server (the helper), where the QA server is.
 * Everything is sanitized here before it leaves the tab, and again on the
 * server.
 */

import type { Middleware } from '@reduxjs/toolkit';
import { QA_SERVER_PROXY_PREFIX } from '@qa-helper/shared/serverApi';
import { DEBUG_LOG_LIMITS, sanitize, type DebugEventInput, type DebugEventKind } from '@qa-helper/shared/debugLog';

/** Slices recorded whole. */
const RECORDED_SLICES = ['flowRun/', 'walletConnect/', 'network/', 'walletSelection/'];
/** Single actions recorded; balance, token and event updates are left out as noise. */
const RECORDED_TYPES = new Set([
  'walletStore/addWallet',
  'walletStore/removeWallet',
  'walletStore/updateNetwork',
  'walletStore/updateWalletStatus',
  'rpc/setDryRunMode',
  'rpc/toggleDryRunMode',
  'qaServer/sessionUpserted',
  'qaServer/sessionRemoved',
  'qaServer/sessionOwnerSet',
  'qaServer/signerBusy',
  'qaServer/signerFailed',
  'qaServer/signerRetry',
]);
const RECORDED_THUNKS = /^walletStore\/(startWallet|stopWallet)\//;
/** Recorded without their payload: it is a whole client object, not news. */
const PAYLOAD_LEFT_OUT = new Set(['walletConnect/initialize/fulfilled']);
/** An RPC request, answer or error, in whichever method slice stores it. */
const RPC_METHOD_ACTION = /\/(setRequest|setResponse|setError)$/;

export function isRecordedAction(type: string): boolean {
  return (
    RECORDED_SLICES.some((p) => type.startsWith(p)) ||
    RECORDED_TYPES.has(type) ||
    RECORDED_THUNKS.test(type) ||
    RPC_METHOD_ACTION.test(type)
  );
}

const LOG_URL = `${QA_SERVER_PROXY_PREFIX}/debug-log`;
const STATE_URL = `${QA_SERVER_PROXY_PREFIX}/debug-state`;
const FLUSH_MS = 1500;
const STATE_MS = 1000;
/** Kept while the server is unreachable; the oldest go first. */
const MAX_QUEUE = 1000;

const enabled = typeof window !== 'undefined' && import.meta.env?.DEV === true;

function makeTabId(): string {
  const fresh = Math.random().toString(36).slice(2, 8);
  try {
    const kept = sessionStorage.getItem('qa-debug-tab');
    if (kept) return kept;
    sessionStorage.setItem('qa-debug-tab', fresh);
  } catch {
    // No session storage: a new id per load.
  }
  return fresh;
}

const tab = enabled ? makeTabId() : '';
const page = () => window.location.pathname + window.location.search;

let queue: DebugEventInput[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sending = false;

export function recordDebugEvent(kind: DebugEventKind, type: string, data?: unknown): void {
  if (!enabled) return;
  queue.push({ at: Date.now(), tab, page: page(), kind, type, data: sanitize(data) });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  flushTimer ??= setTimeout(flush, FLUSH_MS);
}

async function post(url: string, body: unknown, keepalive = false): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      keepalive,
    });
    return res.ok;
  } catch {
    // The server is down: never log this, or the log would feed itself.
    return false;
  }
}

async function flush(keepalive = false): Promise<void> {
  flushTimer = null;
  if (sending || queue.length === 0) return;
  sending = true;
  const batch = queue.slice(0, DEBUG_LOG_LIMITS.eventsPerPost);
  const ok = await post(LOG_URL, { events: batch }, keepalive);
  sending = false;
  if (ok) queue = queue.slice(batch.length);
  if (queue.length > 0) flushTimer ??= setTimeout(flush, ok ? 0 : FLUSH_MS * 4);
}

let stateTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleState(snapshot: () => unknown): void {
  stateTimer ??= setTimeout(() => {
    stateTimer = null;
    void post(STATE_URL, { tab, page: page(), at: Date.now(), state: sanitize(snapshot()) });
  }, STATE_MS);
}

/** Records the actions `isRecordedAction` picks, and sends `snapshot` after each. */
export function debugLogMiddleware(snapshot: (state: unknown) => unknown): Middleware {
  return (api) => (next) => (action) => {
    const result = next(action);
    const type = (action as { type?: unknown }).type;
    if (enabled && typeof type === 'string' && isRecordedAction(type)) {
      const { payload, error, meta } = action as { payload?: unknown; error?: unknown; meta?: unknown };
      const data = PAYLOAD_LEFT_OUT.has(type) ? undefined : payload;
      recordDebugEvent('action', type, error ? { payload: data, error, meta } : data);
      scheduleState(() => snapshot(api.getState()));
    }
    return result;
  };
}

let hooked = false;

/** Records uncaught errors, rejected promises and console.error; sends what's left on leaving. */
export function installDebugLogHooks(): void {
  if (!enabled || hooked) return;
  hooked = true;
  window.addEventListener('error', (e) =>
    recordDebugEvent('error', 'window.error', {
      message: e.message,
      source: e.filename,
      line: e.lineno,
      error: e.error,
    })
  );
  window.addEventListener('unhandledrejection', (e) => recordDebugEvent('error', 'unhandledrejection', e.reason));
  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    recordDebugEvent('error', 'console.error', args);
    consoleError(...args);
  };
  window.addEventListener('pagehide', () => void flush(true));
}

let lastRoute = '';

export function recordDebugRoute(path: string): void {
  if (path === lastRoute) return;
  lastRoute = path;
  recordDebugEvent('route', path);
}
