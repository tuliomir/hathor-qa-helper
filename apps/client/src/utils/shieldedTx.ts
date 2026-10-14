/**
 * Reads a fullnode `/transaction?id=` body into inspector rows, merging the
 * unblinding data that a server or browser wallet holds for it.
 *
 * Shielded outputs live in `tx.shielded_outputs[]`; their absolute index is
 * `tx.outputs.length + s` (the index `getShieldedUnblindingForTx` uses).
 * `mode` 1 is amount shielded (token public), 2 is fully shielded.
 */

import type { OutputPrivacy } from './outputRows';

interface FullnodeDecoded {
  address?: string;
}

export interface FullnodeOutput {
  value?: number | string;
  token_data?: number;
  decoded?: FullnodeDecoded;
  type?: string;
  mode?: number;
  commitment?: string;
  range_proof?: string;
  [key: string]: unknown;
}

export interface FullnodeInput extends FullnodeOutput {
  tx_id: string;
  index: number;
}

export interface FullnodeTx {
  hash: string;
  timestamp?: number;
  inputs: FullnodeInput[];
  outputs: FullnodeOutput[];
  shielded_outputs?: FullnodeOutput[];
  tokens?: ({ uid: string } | string)[];
  [key: string]: unknown;
}

export interface Opening {
  index: number;
  value: bigint;
  token: string;
}

export interface Openings {
  outputs: Opening[];
  inputs: Opening[];
}

export type Decrypter = 'server' | 'client';

export interface InspectedOutput {
  index: number;
  privacy: OutputPrivacy;
  address: string | null;
  /** null when hidden and not unblinded. */
  token: string | null;
  value: bigint | null;
  decryptedBy: Decrypter[];
  /** Shielded outputs only: on-chain fields minus the bulky range proof. */
  commitment?: Record<string, unknown>;
}

export interface InspectedInput {
  index: number;
  spent: { txId: string; index: number };
  shielded: boolean;
  address: string | null;
  token: string | null;
  value: bigint | null;
  decryptedBy: Decrypter[];
}

export interface InspectedTx {
  hash: string;
  outputs: InspectedOutput[];
  inputs: InspectedInput[];
  shieldedCount: number;
  outputCount: number;
  /** Amounts nobody here could unblind. */
  hiddenCount: number;
}

const MODE_PRIVACY: Record<number, OutputPrivacy> = { 1: 'AMOUNT_SHIELDED', 2: 'FULLY_SHIELDED' };

function tokenOf(tokenData: number | undefined, tokens: FullnodeTx['tokens']): string {
  const i = (tokenData ?? 0) & 0x7f;
  if (i === 0) return '00';
  const t = tokens?.[i - 1];
  return typeof t === 'string' ? t : (t?.uid ?? `token #${i}`);
}

function isShieldedEntry(o: FullnodeOutput): boolean {
  return o.type === 'shielded' || o.commitment !== undefined;
}

function commitmentSummary(o: FullnodeOutput): Record<string, unknown> {
  const out: Record<string, unknown> = { mode: o.mode, commitment: o.commitment };
  if (typeof o.range_proof === 'string') out.range_proof = `${o.range_proof.length} chars`;
  if (o.token_data !== undefined) out.token_data = o.token_data;
  for (const key of ['asset_commitment', 'surjection_proof', 'ephemeral_pubkey'] as const) {
    if (typeof o[key] === 'string') out[key] = o[key];
  }
  if (typeof out.surjection_proof === 'string')
    out.surjection_proof = `${(out.surjection_proof as string).length} chars`;
  return out;
}

export function inspectFullnodeTx(tx: FullnodeTx, openings: Partial<Record<Decrypter, Openings>> = {}): InspectedTx {
  const decrypters = Object.entries(openings) as [Decrypter, Openings][];
  const findOpening = (kind: 'outputs' | 'inputs', index: number) => {
    let opening: Opening | null = null;
    const by: Decrypter[] = [];
    for (const [who, o] of decrypters) {
      const hit = o[kind].find((e) => e.index === index);
      if (hit) {
        opening ??= hit;
        by.push(who);
      }
    }
    return { opening, by };
  };

  const transparent = tx.outputs.map(
    (o, i): InspectedOutput => ({
      index: i,
      privacy: 'TRANSPARENT',
      address: o.decoded?.address ?? null,
      token: tokenOf(o.token_data, tx.tokens),
      value: o.value !== undefined ? BigInt(o.value) : null,
      decryptedBy: [],
    })
  );
  const shielded = (tx.shielded_outputs ?? []).map((o, s): InspectedOutput => {
    const index = tx.outputs.length + s;
    const privacy = MODE_PRIVACY[o.mode ?? 1] ?? 'AMOUNT_SHIELDED';
    const { opening, by } = findOpening('outputs', index);
    return {
      index,
      privacy,
      address: o.decoded?.address ?? null,
      token: opening?.token ?? (privacy === 'FULLY_SHIELDED' ? null : tokenOf(o.token_data, tx.tokens)),
      value: opening?.value ?? null,
      decryptedBy: by,
      commitment: commitmentSummary(o),
    };
  });

  const inputs = tx.inputs.map((inp, i): InspectedInput => {
    const isShielded = isShieldedEntry(inp);
    const { opening, by } = isShielded ? findOpening('inputs', i) : { opening: null, by: [] as Decrypter[] };
    const fully = inp.mode === 2;
    return {
      index: i,
      spent: { txId: inp.tx_id, index: inp.index },
      shielded: isShielded,
      address: inp.decoded?.address ?? null,
      token: opening?.token ?? (isShielded && fully ? null : tokenOf(inp.token_data, tx.tokens)),
      value: opening?.value ?? (inp.value !== undefined ? BigInt(inp.value) : null),
      decryptedBy: by,
    };
  });

  const outputs = [...transparent, ...shielded];
  return {
    hash: tx.hash,
    outputs,
    inputs,
    shieldedCount: shielded.length,
    outputCount: outputs.length,
    hiddenCount: outputs.filter((o) => o.value === null).length + inputs.filter((i) => i.value === null).length,
  };
}

function toOpenings(list: unknown): Opening[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e): e is { index: number; value: string | number | bigint; token: string } => {
      const x = e as Record<string, unknown> | null;
      return !!x && typeof x.index === 'number' && x.value !== undefined && typeof x.token === 'string';
    })
    .map((e) => ({ index: e.index, value: BigInt(e.value), token: e.token }));
}

/** Server bodies carry stringified BigInts; browser results carry real ones. */
export function normalizeOpenings(body: unknown): Openings {
  const b = (body ?? {}) as { outputs?: unknown; inputs?: unknown };
  return { outputs: toOpenings(b.outputs), inputs: toOpenings(b.inputs) };
}
