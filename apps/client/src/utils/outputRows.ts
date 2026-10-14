/**
 * OutputEditor's value type and its mapping onto the QA server contract.
 * A token row maps 1:1 onto `SendOutput`: amounts are base units as
 * decimal strings, `privacy` becomes `shielded` unless transparent.
 */

import type { SendOutput, ShieldedOutputModeName } from '@qa-helper/shared/serverApi';

export type OutputPrivacy = 'TRANSPARENT' | ShieldedOutputModeName;

/** What each mode hides, shown under ShieldModeSelector. */
export const PRIVACY_SUBLINE: Record<OutputPrivacy, string> = {
  TRANSPARENT: 'Amount and token are public',
  AMOUNT_SHIELDED: 'Amount hidden; token public',
  FULLY_SHIELDED: 'Amount and token hidden',
};

export interface OutputRow {
  /** Stable React key. */
  id: string;
  type: 'token' | 'data';
  address: string;
  /** Base units as a decimal string ('' while empty or invalid). */
  value: string;
  /** Token UID; '00' is HTR. */
  token: string;
  privacy: OutputPrivacy;
  /** Datetime-local string, '' for none. */
  timelock: string;
  data: string;
}

let nextId = 0;

export function newOutputRow(partial: Partial<Omit<OutputRow, 'id'>> = {}): OutputRow {
  nextId += 1;
  return {
    id: `out-${Date.now().toString(36)}-${nextId}`,
    type: 'token',
    address: '',
    value: '',
    token: '00',
    privacy: 'TRANSPARENT',
    timelock: '',
    data: '',
    ...partial,
  };
}

export interface OutputRowRules {
  allowData: boolean;
  allowTimelock: boolean;
  /** Zero amounts are an error unless allowed (e.g. to test wallet validation). */
  allowZero?: boolean;
}

const SERVER_RULES: OutputRowRules = { allowData: false, allowTimelock: false };
const INTEGER_RE = /^\d+$/;

function rowError(row: OutputRow, rules: OutputRowRules): string | null {
  if (row.type === 'data') {
    if (!rules.allowData) return 'data outputs are not supported here';
    return row.data.trim() === '' ? 'data missing' : null;
  }
  if (row.address.trim() === '') return 'recipient address missing';
  if (row.value === '') return 'amount missing';
  if (!INTEGER_RE.test(row.value)) return 'amount must be a whole number of base units';
  if (!rules.allowZero && BigInt(row.value) === 0n) return 'amount must be greater than zero';
  if (row.timelock && !rules.allowTimelock) return 'timelocks are not supported here';
  return null;
}

/** One error (or null) per row. Defaults to the QA server's rules. */
export function outputRowErrors(rows: readonly OutputRow[], rules: OutputRowRules = SERVER_RULES): (string | null)[] {
  return rows.map((r) => rowError(r, rules));
}

/** Maps editor rows to the server's `SendRequest.outputs`; throws listing every invalid row. */
export function toSendOutputs(rows: readonly OutputRow[]): SendOutput[] {
  if (rows.length === 0) throw new Error('Add at least one output');
  const problems = outputRowErrors(rows)
    .map((e, i) => (e ? `Output ${i + 1}: ${e}` : null))
    .filter((e): e is string => e !== null);
  if (problems.length > 0) throw new Error(problems.join('; '));

  return rows.map((r) => {
    const out: SendOutput = { address: r.address.trim(), value: r.value, token: r.token };
    if (r.privacy !== 'TRANSPARENT') out.shielded = r.privacy;
    return out;
  });
}

export interface OutputSummary {
  count: number;
  shielded: number;
  /** Per-token totals of the rows with a valid amount, in row order. */
  totals: { token: string; value: bigint }[];
  /**
   * Exactly one shielded output: the protocol needs at least two, so the
   * wallet adds a shielded change output. Explained, not blocked.
   */
  belowShieldedMinimum: boolean;
}

export function outputSummary(rows: readonly OutputRow[]): OutputSummary {
  const totals = new Map<string, bigint>();
  let shielded = 0;
  for (const r of rows) {
    if (r.type !== 'token') continue;
    if (r.privacy !== 'TRANSPARENT') shielded += 1;
    if (INTEGER_RE.test(r.value)) totals.set(r.token, (totals.get(r.token) ?? 0n) + BigInt(r.value));
  }
  return {
    count: rows.length,
    shielded,
    totals: [...totals].map(([token, value]) => ({ token, value })),
    belowShieldedMinimum: shielded === 1,
  };
}
