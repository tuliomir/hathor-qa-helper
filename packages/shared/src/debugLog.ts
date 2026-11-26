/**
 * Debug log contract: what the client records about a QA session and the
 * QA server keeps, so an agent can follow a run (see knowledge/debug-log.md).
 *
 * Nothing secret may reach it: `sanitize` drops seeds, PINs, passwords and
 * keys by field name and mnemonic-looking strings by shape, and both sides
 * run it.
 */

export type DebugEventKind = 'action' | 'route' | 'error';

export interface DebugEventInput {
  /** Epoch ms in the browser. */
  at: number;
  /** Per browser tab, kept across reloads. */
  tab: string;
  /** The app path the tab was on. */
  page: string;
  kind: DebugEventKind;
  /** Redux action type, the new path, or the error's source. */
  type: string;
  data?: unknown;
}

export interface DebugEvent extends DebugEventInput {
  /** Server order, from 1; `since` reads after it. */
  seq: number;
}

export interface DebugLogPost {
  events: DebugEventInput[];
}

export interface DebugLogResponse {
  events: DebugEvent[];
  /** The last seq the server has; pass it as `since` next time. */
  last: number;
}

/** A tab's view of the app now: what a question about "this run" needs first. */
export interface DebugStatePost {
  tab: string;
  page: string;
  at: number;
  state: unknown;
}

export interface DebugStateResponse {
  tabs: (DebugStatePost & { receivedAt: number })[];
}

export const DEBUG_LOG_LIMITS = {
  eventsPerPost: 200,
  stringLength: 2000,
  arrayLength: 50,
  depth: 8,
} as const;

const SECRET_KEY = /seed|words|mnemonic|password|passphrase|priv|secret|xprv/i;
/** `pin` as a word of its own (pin, pinCode, walletPin, PIN), not inside `mapping`. */
const PIN_KEY = /(^|_)pin|Pin|PIN/;
const isSecretKey = (key: string) => SECRET_KEY.test(key) || PIN_KEY.test(key);
/** 12 to 24 lowercase words: a BIP39 mnemonic, whatever field it hides in. */
const MNEMONIC = /^\s*([a-z]{3,8}\s+){11,23}[a-z]{3,8}\s*$/;
export const REDACTED = '[redacted]';

/**
 * A JSON-safe copy of `value` without secrets: secret fields and mnemonics
 * redacted, bigints as strings, long strings and arrays cut, deep nesting
 * and cycles stopped.
 */
export function sanitize(value: unknown, depth = 0, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') {
    if (MNEMONIC.test(value)) return REDACTED;
    const max = DEBUG_LOG_LIMITS.stringLength;
    return value.length > max ? `${value.slice(0, max)}… (${value.length} chars)` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[cycle]';
  if (depth >= DEBUG_LOG_LIMITS.depth) return '[deep]';
  seen.add(value);
  if (value instanceof Error) return { name: value.name, message: value.message, stack: sanitize(value.stack) };
  if (Array.isArray(value)) {
    const max = DEBUG_LOG_LIMITS.arrayLength;
    const items = value.slice(0, max).map((v) => sanitize(v, depth + 1, seen));
    return value.length > max ? [...items, `… ${value.length - max} more`] : items;
  }
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === 'function') continue;
    out[key] = isSecretKey(key) && v !== null && v !== undefined && v !== '' ? REDACTED : sanitize(v, depth + 1, seen);
  }
  return out;
}
