/**
 * Fullnode checks for nano contract transactions, read over HTTP so they
 * work for address-only test wallets too (no wallet instance, no events).
 *
 * A nano tx is done once a block confirms it (`meta.first_block`) and the
 * contract executed it (`meta.nc_execution === 'success'`): a tx can be
 * accepted by the network and still fail inside the contract.
 */

export type NanoTxCheck =
  | { state: 'pending' }
  | { state: 'confirmed'; firstBlock: string }
  | { state: 'failed'; reason: string };

interface FullnodeTxBody {
  success?: boolean;
  message?: string;
  meta?: {
    first_block?: string | null;
    voided_by?: string[];
    nc_execution?: string | null;
  };
}

export type FetchJson = (url: string) => Promise<unknown>;

const fetchJson: FetchJson = async (url) => {
  const res = await fetch(url);
  return res.json();
};

/** One look at the tx on the fullnode. A tx the node doesn't know yet is pending. */
export async function checkNanoTx(fullNodeUrl: string, hash: string, get: FetchJson = fetchJson): Promise<NanoTxCheck> {
  const body = (await get(`${fullNodeUrl}transaction?id=${hash}`)) as FullnodeTxBody | null;
  if (!body?.success || !body.meta) return { state: 'pending' };
  const { first_block: firstBlock, voided_by: voidedBy, nc_execution: execution } = body.meta;
  if (voidedBy && voidedBy.length > 0) return { state: 'failed', reason: `Voided by ${voidedBy[0]}` };
  if (execution === 'failure') return { state: 'failed', reason: 'The contract failed to execute the tx' };
  if (!firstBlock) return { state: 'pending' };
  // A block's tx stays `pending` until the block's nano txs run.
  if (execution && execution !== 'success') return { state: 'pending' };
  return { state: 'confirmed', firstBlock };
}

export interface WaitForNanoTxOptions {
  timeoutMs?: number;
  intervalMs?: number;
  /** Stops waiting (returns `aborted`) once it returns true. */
  shouldAbort?: () => boolean;
  get?: FetchJson;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export type NanoTxWait = Exclude<NanoTxCheck, { state: 'pending' }> | { state: 'timeout' } | { state: 'aborted' };

/** Polls the fullnode until the tx is confirmed and executed, fails, or the wait ends. */
export async function waitForNanoTx(
  fullNodeUrl: string,
  hash: string,
  {
    timeoutMs = 5 * 60_000,
    intervalMs = 3000,
    shouldAbort = () => false,
    get = fetchJson,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    now = Date.now,
  }: WaitForNanoTxOptions = {}
): Promise<NanoTxWait> {
  const deadline = now() + timeoutMs;
  for (;;) {
    if (shouldAbort()) return { state: 'aborted' };
    try {
      const check = await checkNanoTx(fullNodeUrl, hash, get);
      if (check.state !== 'pending') return check;
    } catch {
      // A failed poll is retried until the deadline.
    }
    if (now() >= deadline) return { state: 'timeout' };
    await sleep(intervalMs);
  }
}

/** A nano contract's balance of `token` in base units, as the fullnode reports it. */
export async function fetchContractBalance(
  fullNodeUrl: string,
  ncId: string,
  token: string,
  get: FetchJson = fetchJson
): Promise<bigint> {
  const body = (await get(`${fullNodeUrl}nano_contract/state?id=${ncId}&balances[]=${token}`)) as {
    success?: boolean;
    message?: string;
    balances?: Record<string, { value?: unknown; errmsg?: string }>;
  } | null;
  if (!body?.success) throw new Error(body?.message || 'Could not read the contract state');
  const entry = body.balances?.[token];
  if (!entry || entry.errmsg) throw new Error(entry?.errmsg || `No ${token} balance in the contract state`);
  return BigInt(String(entry.value));
}

export interface FullnodeTxOutput {
  value: number | string;
  token?: string;
  token_data?: number;
}

/** A tx as the fullnode's `transaction?id=` reports it: the parts the flow checks read. */
export interface FullnodeTx {
  /** Fee header entries; empty or null when the tx pays no fee. */
  fees?: { token_uid: string; amount: number | string }[] | null;
  /**
   * `transaction?id=` gives each input and output a `token_data` (0 for HTR,
   * n for `tokens[n - 1]`, high bit for authorities) and no `token`; other
   * endpoints, like `nano_contract/history`, give `token` too.
   */
  inputs?: FullnodeTxOutput[];
  outputs?: FullnodeTxOutput[];
  /** The tx's custom tokens, in `token_data` order. */
  tokens?: ({ uid: string } | string)[];
  nc_context?: { actions?: { type: string; token_uid: string; amount: number | string }[] } | null;
}

export async function fetchFullnodeTx(
  fullNodeUrl: string,
  hash: string,
  get: FetchJson = fetchJson
): Promise<FullnodeTx> {
  const body = (await get(`${fullNodeUrl}transaction?id=${hash}`)) as {
    success?: boolean;
    message?: string;
    tx?: FullnodeTx;
  } | null;
  if (!body?.success || !body.tx) throw new Error(body?.message || `The fullnode has no tx ${hash}`);
  return body.tx;
}
