/**
 * What an approved nano RPC response must look like, per the expected
 * responses in hathor-wallet-mobile's QA/QA_REOWN.md. Each check returns the
 * expectations the response breaks, as sentences for the run log.
 */

/** `RpcResponseTypes` in hathor-rpc-lib (enum order). */
export const RPC_RESPONSE_TYPE = {
  sendNanoContractTx: 0,
  signOracleData: 7,
} as const;

const TX_HASH = /^[0-9a-f]{64}$/i;

interface NanoHeader {
  id?: unknown;
  method?: unknown;
  actions?: { amount?: unknown }[];
  address?: { base58?: unknown };
}

export interface NanoTxExpectation {
  method: string;
  /** The blueprint ID for `initialize`, the contract ID otherwise. */
  headerId: string;
  /** Address 0 signs every bet step. */
  caller?: string;
  /** Amount of each action, in base units. */
  actionAmounts?: string[];
}

export function nanoTxProblems(response: unknown, expected: NanoTxExpectation): string[] {
  const problems: string[] = [];
  const wrapped = response as { type?: unknown; response?: unknown } | null;
  if (wrapped?.type !== RPC_RESPONSE_TYPE.sendNanoContractTx) {
    problems.push(`Expected response type ${RPC_RESPONSE_TYPE.sendNanoContractTx}, got ${String(wrapped?.type)}`);
  }
  const tx = wrapped?.response;
  if (typeof tx === 'string') {
    problems.push('Got the tx hex instead of the pushed tx: push_tx was not honoured');
    return problems;
  }
  if (!tx || typeof tx !== 'object') {
    problems.push('The response has no tx');
    return problems;
  }

  const { hash, headers } = tx as { hash?: unknown; headers?: NanoHeader[] };
  if (typeof hash !== 'string' || !TX_HASH.test(hash)) problems.push(`Expected a 64-char tx hash, got ${String(hash)}`);

  // Other headers (e.g. fees) carry no method.
  const header = Array.isArray(headers) ? headers.find((h) => h && typeof h === 'object' && 'method' in h) : undefined;
  if (!header) {
    problems.push('The tx has no nano contract header');
    return problems;
  }
  if (header.method !== expected.method) {
    problems.push(`Expected method "${expected.method}", got "${String(header.method)}"`);
  }
  if (header.id !== expected.headerId) {
    problems.push(`Expected header id ${expected.headerId}, got ${String(header.id)}`);
  }
  if (expected.caller !== undefined && header.address?.base58 !== expected.caller) {
    problems.push(`Expected caller ${expected.caller}, got ${String(header.address?.base58)}`);
  }
  if (expected.actionAmounts) {
    const amounts = (header.actions ?? []).map((a) => String(a.amount));
    if (amounts.join(',') !== expected.actionAmounts.join(',')) {
      problems.push(`Expected action amounts [${expected.actionAmounts.join(', ')}], got [${amounts.join(', ')}]`);
    }
  }
  return problems;
}

export function signOracleDataProblems(response: unknown, expected: { data: string; oracle: string }): string[] {
  const problems: string[] = [];
  const wrapped = response as { type?: unknown; response?: unknown } | null;
  if (wrapped?.type !== RPC_RESPONSE_TYPE.signOracleData) {
    problems.push(`Expected response type ${RPC_RESPONSE_TYPE.signOracleData}, got ${String(wrapped?.type)}`);
  }
  const body = wrapped?.response as
    | { oracle?: unknown; signedData?: { type?: unknown; signature?: unknown; value?: unknown } }
    | null
    | undefined;
  if (!body || typeof body !== 'object') {
    problems.push('The response has no body');
    return problems;
  }
  if (body.oracle !== expected.oracle) problems.push(`Expected oracle ${expected.oracle}, got ${String(body.oracle)}`);
  const signed = body.signedData;
  if (signed?.type !== 'str') problems.push(`Expected signedData.type "str", got "${String(signed?.type)}"`);
  if (signed?.value !== expected.data) {
    problems.push(`Expected signedData.value "${expected.data}", got "${String(signed?.value)}"`);
  }
  if (typeof signed?.signature !== 'string' || !/^[0-9a-f]+$/i.test(signed.signature)) {
    problems.push('Expected a hex signature in signedData.signature');
  }
  return problems;
}
