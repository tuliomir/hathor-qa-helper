/**
 * What the core RPC methods must answer, per the expected responses in
 * hathor-wallet-mobile's QA/QA_REOWN.md and hathor-rpc-lib's response types.
 * Response checks return the expectations an answer breaks, as sentences for
 * the run log; on-chain checks return the run panel's check list.
 */

import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import helpers from '@hathor/wallet-lib/lib/utils/helpers';
import { verifyMessage } from '@hathor/wallet-lib/lib/utils/crypto';
import Network from '@hathor/wallet-lib/lib/models/network';
import P2PKH from '@hathor/wallet-lib/lib/models/p2pkh';
import { parseScriptData } from '@hathor/wallet-lib/lib/utils/scripts';
import { Buffer } from 'buffer';
import type { FlowCheck } from '../store/slices/flowRunSlice';
import type { FullnodeTx } from '../utils/nanoTxConfirmation';
import { formatAmount } from '../utils/amount';

/** `RpcResponseTypes` in hathor-rpc-lib (enum order). */
export const RPC_TYPE = {
  signWithAddress: 1,
  getAddress: 2,
  getBalance: 3,
  getConnectedNetwork: 4,
  getUtxos: 5,
  createToken: 6,
  sendTransaction: 8,
  getWalletInformation: 12,
} as const;

/** The network every request of the flow names. */
export const RPC_FLOW_NETWORK = 'testnet';

const TX_HASH = /^[0-9a-f]{64}$/i;
const AUTHORITY_BIT = 0x80;
const MINT_MASK = 1n;
const MELT_MASK = 2n;

const units = (value: bigint | string) => formatAmount(value, 2);

/** The body of a `{ type, response }` answer, or the problem with its type. */
function bodyOf<T>(response: unknown, type: number, problems: string[]): T | null {
  const wrapped = response as { type?: unknown; response?: unknown } | null;
  if (wrapped?.type !== type) problems.push(`Expected response type ${type}, got ${String(wrapped?.type)}`);
  if (wrapped?.response === undefined || wrapped.response === null) {
    problems.push('The response has no body');
    return null;
  }
  return wrapped.response as T;
}

export function walletInformationProblems(response: unknown, expected: { address0: string }): string[] {
  const problems: string[] = [];
  const body = bodyOf<{ network?: unknown; address0?: unknown }>(response, RPC_TYPE.getWalletInformation, problems);
  if (!body) return problems;
  if (body.network !== RPC_FLOW_NETWORK)
    problems.push(`Expected network "${RPC_FLOW_NETWORK}", got "${String(body.network)}"`);
  if (body.address0 !== expected.address0) {
    problems.push(`Expected address 0 ${expected.address0}, got ${String(body.address0)}`);
  }
  return problems;
}

export function connectedNetworkProblems(response: unknown): string[] {
  const problems: string[] = [];
  const body = bodyOf<{ network?: unknown }>(response, RPC_TYPE.getConnectedNetwork, problems);
  if (body && body.network !== RPC_FLOW_NETWORK) {
    problems.push(`Expected network "${RPC_FLOW_NETWORK}", got "${String(body.network)}"`);
  }
  return problems;
}

export interface AddressAnswer {
  address: string;
  index: number;
  addressPath: string;
}

/** The address an `htr_getAddress` answer carries, and what is wrong with its shape. */
export function addressAnswer(response: unknown): { answer: AddressAnswer | null; problems: string[] } {
  const problems: string[] = [];
  const body = bodyOf<Partial<AddressAnswer>>(response, RPC_TYPE.getAddress, problems);
  if (!body) return { answer: null, problems };
  const { address, index, addressPath } = body;
  if (typeof address !== 'string' || typeof index !== 'number' || typeof addressPath !== 'string') {
    problems.push('Expected an address, its index and its path');
    return { answer: null, problems };
  }
  if (!addressPath.endsWith(`/${index}`)) problems.push(`The path ${addressPath} does not end in the index ${index}`);
  return { answer: { address, index, addressPath }, problems };
}

export function balanceProblems(response: unknown, expected: { unlocked: bigint }): string[] {
  const problems: string[] = [];
  const body = bodyOf<unknown>(response, RPC_TYPE.getBalance, problems);
  if (!body) return problems;
  if (!Array.isArray(body)) return [...problems, 'Expected a list of balances'];
  const htr = (body as { token?: { id?: unknown }; balance?: { unlocked?: unknown } }[]).find(
    (b) => b?.token?.id === NATIVE_TOKEN_UID
  );
  if (!htr) return [...problems, 'The answer has no HTR balance'];
  const unlocked = BigInt(String(htr.balance?.unlocked ?? 'NaN').replace(/n$/, ''));
  if (unlocked !== expected.unlocked) {
    problems.push(
      `The wallet reports ${units(unlocked)} HTR unlocked, the test wallet has ${units(expected.unlocked)} HTR`
    );
  }
  return problems;
}

export interface UtxoAnswer {
  address: string;
  amount: bigint;
  locked: boolean;
}

/** The UTXOs an `htr_getUtxos` answer lists, and what is wrong with its shape. */
export function utxosAnswer(response: unknown): { utxos: UtxoAnswer[]; problems: string[] } {
  const problems: string[] = [];
  const body = bodyOf<{ utxos?: unknown; total_amount_available?: unknown }>(response, RPC_TYPE.getUtxos, problems);
  if (!body) return { utxos: [], problems };
  if (!Array.isArray(body.utxos)) return { utxos: [], problems: [...problems, 'The answer has no UTXO list'] };
  const utxos = (body.utxos as { address?: unknown; amount?: unknown; locked?: unknown }[]).map((u) => ({
    address: String(u.address),
    amount: BigInt(String(u.amount)),
    locked: u.locked === true,
  }));
  const listed = utxos.filter((u) => !u.locked).reduce((sum, u) => sum + u.amount, 0n);
  const total = BigInt(String(body.total_amount_available ?? 'NaN'));
  if (total !== listed) {
    problems.push(`total_amount_available is ${units(total)}, the unlocked UTXOs listed add up to ${units(listed)}`);
  }
  return { utxos, problems };
}

/** An HTR `htr_getUtxos` filter and the UTXOs it must return, from the scattered amounts. */
export interface UtxoFilterCase {
  maxUtxos: number;
  amountBiggerThan: bigint | null;
  amountSmallerThan: bigint | null;
  /** Every amount the filter matches. */
  matching: bigint[];
  /** How many of them the answer lists (`maxUtxos` caps it). */
  count: number;
}

const filterCase = (
  amounts: bigint[],
  maxUtxos: number,
  bigger: bigint | null,
  smaller: bigint | null
): UtxoFilterCase => {
  // Both facades filter strictly: value > biggerThan and value < smallerThan.
  const matching = amounts.filter((a) => (bigger === null || a > bigger) && (smaller === null || a < smaller));
  return {
    maxUtxos,
    amountBiggerThan: bigger,
    amountSmallerThan: smaller,
    matching,
    count: Math.min(maxUtxos, matching.length),
  };
};

/**
 * The two HTR filters, over UTXOs of 1, 2, 3 … base units: everything above
 * the second smallest, and a capped page strictly between the smallest and
 * the largest.
 */
export function htrUtxoFilterCases(scattered: bigint[]): { above: UtxoFilterCase; between: UtxoFilterCase } {
  const amounts = [...scattered].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    above: filterCase(amounts, 255, amounts[1], null),
    between: filterCase(amounts, 2, amounts[0], amounts[amounts.length - 1]),
  };
}

/** Checks a filtered answer against the scattered UTXOs; `isMine` says whether an address is the wallet's. */
export function utxoFilterProblems(
  utxos: UtxoAnswer[],
  expected: UtxoFilterCase,
  isMine: (address: string) => boolean
) {
  const problems: string[] = [];
  if (utxos.length !== expected.count) problems.push(`Expected ${expected.count} UTXOs, got ${utxos.length}`);
  const pool = [...expected.matching];
  for (const u of utxos) {
    const at = pool.indexOf(u.amount);
    if (at === -1) problems.push(`The UTXO of ${units(u.amount)} HTR does not match the filter`);
    else pool.splice(at, 1);
    if (!isMine(u.address)) problems.push(`The UTXO at ${u.address} is not the test wallet's`);
  }
  return problems;
}

export function signProblems(response: unknown, expected: { message: string; address: string; index: number }) {
  const problems: string[] = [];
  const body = bodyOf<{
    message?: unknown;
    signature?: unknown;
    address?: { address?: unknown; index?: unknown };
  }>(response, RPC_TYPE.signWithAddress, problems);
  if (!body) return problems;
  if (body.message !== expected.message)
    problems.push(`Expected the message "${expected.message}", got "${String(body.message)}"`);
  if (body.address?.address !== expected.address || body.address?.index !== expected.index) {
    problems.push(
      `Expected address ${expected.address} at index ${expected.index}, got ${String(body.address?.address)} at ${String(body.address?.index)}`
    );
  }
  if (typeof body.signature !== 'string') return [...problems, 'The answer has no signature'];
  let valid = false;
  try {
    valid = verifyMessage(expected.message, body.signature, expected.address);
  } catch {
    valid = false;
  }
  if (!valid) problems.push(`The signature does not verify for ${expected.address}`);
  return problems;
}

/** The answer to `push_tx: false`: the tx hex, which must pay `value` to `address`. */
export function unpushedTxProblems(response: unknown, expected: { address: string; value: bigint }): string[] {
  const problems: string[] = [];
  const body = bodyOf<unknown>(response, RPC_TYPE.sendTransaction, problems);
  if (body === null) return problems;
  if (typeof body !== 'string') return [...problems, 'Expected the tx hex: the wallet pushed the tx anyway'];
  const network = new Network(RPC_FLOW_NETWORK);
  let pays = false;
  try {
    const tx = helpers.createTxFromHex(body, network);
    pays = tx.outputs.some((o) => {
      const script = o.parseScript(network);
      return o.value === expected.value && script instanceof P2PKH && script.address.base58 === expected.address;
    });
  } catch (err) {
    return [...problems, `The hex is not a tx: ${(err as Error).message}`];
  }
  if (!pays) problems.push(`The tx does not pay ${units(expected.value)} HTR to ${expected.address}`);
  return problems;
}

interface PushedTx {
  hash?: unknown;
  name?: unknown;
  symbol?: unknown;
  outputs?: { value?: unknown; tokenData?: unknown; decodedScript?: { address?: { base58?: unknown } } }[];
}

function pushedTxOf(response: unknown, type: number, problems: string[]): PushedTx | null {
  const body = bodyOf<unknown>(response, type, problems);
  if (body === null) return null;
  if (typeof body === 'string') {
    problems.push('Got the tx hex instead of the pushed tx: push_tx was not honoured');
    return null;
  }
  const tx = body as PushedTx;
  if (typeof tx.hash !== 'string' || !TX_HASH.test(tx.hash))
    problems.push(`Expected a 64-char tx hash, got ${String(tx.hash)}`);
  return tx;
}

/** The pushed tx's hash, from an `htr_sendTransaction` or `htr_createToken` answer. */
export function pushedTxHash(response: unknown): string | null {
  const hash = (response as { response?: { hash?: unknown } } | null)?.response?.hash;
  return typeof hash === 'string' ? hash : null;
}

export function sentTxProblems(response: unknown, expected?: { address: string; value: bigint }): string[] {
  const problems: string[] = [];
  const tx = pushedTxOf(response, RPC_TYPE.sendTransaction, problems);
  if (!tx || !expected) return problems;
  const pays = (tx.outputs ?? []).some(
    (o) => String(o.value) === String(expected.value) && o.decodedScript?.address?.base58 === expected.address
  );
  if (!pays) problems.push(`The tx does not pay ${units(expected.value)} HTR to ${expected.address}`);
  return problems;
}

export interface TokenExpectation {
  name: string;
  symbol: string;
  /** Base units. */
  amount: bigint;
  mint: boolean;
  melt: boolean;
}

export function createdTokenProblems(response: unknown, expected: TokenExpectation): string[] {
  const problems: string[] = [];
  const tx = pushedTxOf(response, RPC_TYPE.createToken, problems);
  if (!tx) return problems;
  if (tx.name !== expected.name) problems.push(`Expected the name "${expected.name}", got "${String(tx.name)}"`);
  if (tx.symbol !== expected.symbol)
    problems.push(`Expected the symbol "${expected.symbol}", got "${String(tx.symbol)}"`);
  const outputs = tx.outputs ?? [];
  const minted = outputs.filter((o) => o.tokenData === 1).reduce((sum, o) => sum + BigInt(String(o.value)), 0n);
  if (minted !== expected.amount)
    problems.push(`Expected ${units(expected.amount)} tokens created, got ${units(minted)}`);
  const masks = outputs
    .filter((o) => typeof o.tokenData === 'number' && (o.tokenData & AUTHORITY_BIT) !== 0)
    .map((o) => BigInt(String(o.value)));
  const mint = masks.some((m) => (m & MINT_MASK) !== 0n);
  const melt = masks.some((m) => (m & MELT_MASK) !== 0n);
  if (mint !== expected.mint)
    problems.push(expected.mint ? 'The tx has no mint authority' : 'The tx has a mint authority');
  if (melt !== expected.melt)
    problems.push(expected.melt ? 'The tx has no melt authority' : 'The tx has a melt authority');
  return problems;
}

/** What `thin_wallet/token` reports about a token. */
export interface FullnodeTokenInfo {
  version?: number | null;
  total?: number | string;
  mint?: unknown[];
  melt?: unknown[];
}

/** `TokenVersion` in wallet-lib. */
const TOKEN_VERSION = { deposit: 1, fee: 2 } as const;

export function tokenOnChainChecks(
  info: FullnodeTokenInfo,
  expected: TokenExpectation & { version: 'deposit' | 'fee' }
) {
  const checks: FlowCheck[] = [];
  const version = TOKEN_VERSION[expected.version];
  checks.push(
    info.version === version
      ? { ok: true, text: `A ${expected.version}-based token` }
      : {
          ok: false,
          text: `Expected a ${expected.version}-based token (version ${version}), got version ${String(info.version)}`,
        }
  );
  const total = BigInt(String(info.total ?? 'NaN'));
  checks.push(
    total === expected.amount
      ? { ok: true, text: `Supply: ${units(total)}` }
      : { ok: false, text: `Expected a supply of ${units(expected.amount)}, got ${units(total)}` }
  );
  const authority = (name: string, has: boolean, want: boolean): FlowCheck =>
    has === want
      ? { ok: true, text: want ? `Has a ${name} authority` : `No ${name} authority` }
      : {
          ok: false,
          text: want ? `Expected a ${name} authority, there is none` : `Expected no ${name} authority, there is one`,
        };
  checks.push(authority('mint', (info.mint ?? []).length > 0, expected.mint));
  checks.push(authority('melt', (info.melt ?? []).length > 0, expected.melt));
  return checks;
}

const htrFeeOf = (tx: FullnodeTx) =>
  (tx.fees ?? [])
    .filter((f) => f.token_uid === NATIVE_TOKEN_UID)
    .reduce((sum, f) => sum + BigInt(String(f.amount)), 0n);

/** The fee header of a confirmed tx: exactly `expected`, or any HTR fee when `expected` is null. */
export function feeHeaderCheck(tx: FullnodeTx, expected: bigint | null): FlowCheck {
  const fee = htrFeeOf(tx);
  if (expected === null) {
    return fee > 0n
      ? { ok: true, text: `Fee: ${units(fee)} HTR` }
      : { ok: false, text: 'Expected the tx to pay an HTR fee, it pays none' };
  }
  if (fee === expected) return { ok: true, text: expected === 0n ? 'No fee charged' : `Fee: ${units(fee)} HTR` };
  return { ok: false, text: `Expected a fee of ${units(expected)} HTR, got ${units(fee)} HTR` };
}

interface FullnodeOutput {
  value?: number | string;
  token_data?: number;
  script?: string;
  decoded?: { address?: string };
}

/** Whether a confirmed tx pays `value` HTR to `address`. */
export function paysCheck(tx: FullnodeTx, expected: { address: string; value: bigint }): FlowCheck {
  const pays = ((tx.outputs ?? []) as FullnodeOutput[]).some(
    (o) =>
      (o.token_data ?? 0) === 0 && BigInt(String(o.value)) === expected.value && o.decoded?.address === expected.address
  );
  return pays
    ? { ok: true, text: `Pays ${units(expected.value)} HTR to ${expected.address.slice(0, 8)}…` }
    : { ok: false, text: `Expected an output of ${units(expected.value)} HTR to ${expected.address}` };
}

/** Whether a confirmed tx has a data output with `data` (the script is base64). */
export function dataOutputCheck(tx: FullnodeTx, data: string): FlowCheck {
  const found = ((tx.outputs ?? []) as FullnodeOutput[]).some((o) => {
    if (!o.script) return false;
    try {
      return parseScriptData(Buffer.from(o.script, 'base64')).data === data;
    } catch {
      return false;
    }
  });
  return found
    ? { ok: true, text: `Has the data output "${data}"` }
    : { ok: false, text: `Expected a data output "${data}", there is none` };
}
