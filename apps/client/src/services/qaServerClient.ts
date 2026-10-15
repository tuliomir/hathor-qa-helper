/**
 * Typed client for the local QA server (`apps/server`), one method per
 * contract route in `@qa-helper/shared/serverApi`. In dev it goes through the
 * Vite proxy prefix `/qa-server`.
 *
 * Every failure is a `QaServerError { status, code, message }`. Besides the
 * contract's `ApiErrorCode`s there are two client-side codes:
 * `UNREACHABLE` (no server behind the proxy) and `BAD_RESPONSE`.
 *
 * Health polling lives in `helperServerSlice`; stages read that instead of
 * calling `health()` on a timer.
 */

import {
  QA_SERVER_PROXY_PREFIX,
  QA_SERVER_ROUTES,
  type AddressKind,
  type AddressResponse,
  type ApiErrorCode,
  type BalanceResponse,
  type HealthResponse,
  type SendRequest,
  type SendResponse,
  type StartWalletRequest,
  type UnblindingResponse,
  type UtxosResponse,
  type WalletSession,
} from '@qa-helper/shared/serverApi';

export type QaServerErrorCode = ApiErrorCode | 'UNREACHABLE' | 'BAD_RESPONSE';

export class QaServerError extends Error {
  readonly status: number;
  readonly code: QaServerErrorCode;

  constructor(status: number, code: QaServerErrorCode, message: string) {
    super(message);
    this.name = 'QaServerError';
    this.status = status;
    this.code = code;
  }
}

/** Serializable form, for Redux and component state. */
export interface QaServerErrorInfo {
  status: number;
  code: QaServerErrorCode;
  message: string;
}

export function toErrorInfo(err: unknown): QaServerErrorInfo {
  if (err instanceof QaServerError) return { status: err.status, code: err.code, message: err.message };
  return { status: 0, code: 'BAD_RESPONSE', message: err instanceof Error ? err.message : String(err) };
}

function apiErrorOf(body: unknown): { code: ApiErrorCode; message: string } | null {
  const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  if (error && typeof error.code === 'string' && typeof error.message === 'string') {
    return { code: error.code as ApiErrorCode, message: error.message };
  }
  return null;
}

/**
 * Maps a non-success response to a QaServerError. Responses without the
 * contract's error body come from the dev proxy, not the server: a 5xx or
 * the health middleware's 204 means nothing is listening.
 */
export function toQaServerError(status: number, body: unknown): QaServerError {
  const api = apiErrorOf(body);
  if (api) return new QaServerError(status, api.code, api.message);
  if (status === 204 || status >= 500) {
    return new QaServerError(status, 'UNREACHABLE', 'The QA server is not reachable through the dev proxy');
  }
  return new QaServerError(status, 'BAD_RESPONSE', `Unexpected response from the QA server (HTTP ${status})`);
}

export interface ErrorDescription {
  title: string;
  /** What to do about it, when there is something to do. */
  hint: string | null;
}

const DESCRIPTIONS: Record<QaServerErrorCode, ErrorDescription> = {
  UNREACHABLE: { title: 'The QA server is not running', hint: 'Start it with `bun run dev:server`.' },
  BAD_RESPONSE: { title: 'The QA server sent an unexpected response', hint: null },
  BAD_REQUEST: { title: 'The QA server rejected the request', hint: 'Check the addresses and amounts.' },
  FORBIDDEN: {
    title: 'The QA server refused this page',
    hint: 'It only accepts clients on localhost or 127.0.0.1 (any port), plus QA_SERVER_EXTRA_ORIGINS.',
  },
  NOT_FOUND: {
    title: 'The QA server no longer runs this wallet',
    hint: 'It may have restarted. The signer starts again on its own; retry in a few seconds.',
  },
  CONFLICT: {
    title: 'This seed already runs on another network',
    hint: 'Stop the wallet on the other network (or the other QA Helper using it) first.',
  },
  WALLET_NOT_READY: {
    title: 'The wallet is still preparing to sign',
    hint: 'Wait until its signer shows Ready in the Helper pill.',
  },
  INSUFFICIENT_FUNDS: {
    title: 'Not enough funds in the sending wallet',
    hint: 'Send it funds from another wallet on this network (e.g. the funding wallet). Shielded fees are paid in HTR.',
  },
  LIB_ERROR: { title: 'wallet-lib failed on the server', hint: null },
  INTERNAL: { title: 'The QA server hit an internal error', hint: null },
};

export function describeQaServerError(err: unknown): ErrorDescription {
  if (err instanceof QaServerError) return DESCRIPTIONS[err.code];
  const code = (err as Partial<QaServerErrorInfo> | null)?.code;
  if (typeof code === 'string' && code in DESCRIPTIONS) return DESCRIPTIONS[code as QaServerErrorCode];
  return { title: 'The request failed', hint: null };
}

export interface QaServerClientOptions {
  /** Defaults to the dev proxy prefix. */
  baseUrl?: string;
  fetch?: typeof fetch;
}

type Query = Record<string, string | number | boolean | undefined>;

function queryString(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined) params.set(k, String(v));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function createQaServerClient({ baseUrl = QA_SERVER_PROXY_PREFIX, fetch: fetchFn }: QaServerClientOptions = {}) {
  const doFetch = fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    opts: { body?: unknown; query?: Query } = {}
  ): Promise<{ status: number; data: T }> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (opts.body !== undefined) headers['content-type'] = 'application/json';
    let res: Response;
    try {
      res = await doFetch(`${baseUrl}${path}${queryString(opts.query)}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        cache: 'no-store',
      });
    } catch (err) {
      throw new QaServerError(0, 'UNREACHABLE', err instanceof Error ? err.message : String(err));
    }
    const text = res.status === 204 ? '' : await res.text().catch(() => '');
    let body: unknown = null;
    let parsed = false;
    if (text) {
      try {
        body = JSON.parse(text);
        parsed = true;
      } catch {
        body = text;
      }
    }
    if (!res.ok || res.status === 204) throw toQaServerError(res.status, body);
    if (!parsed) throw new QaServerError(res.status, 'BAD_RESPONSE', 'The QA server answered with a non-JSON body');
    return { status: res.status, data: body as T };
  }

  const get = async <T>(path: string, query?: Query) => (await request<T>('GET', path, { query })).data;

  return {
    health: () => get<HealthResponse>(QA_SERVER_ROUTES.health),
    listSessions: () => get<WalletSession[]>(QA_SERVER_ROUTES.wallets),
    getSession: (id: string) => get<WalletSession>(QA_SERVER_ROUTES.wallet(id)),
    /** 202 starts a wallet; 200 means it was already running. */
    startSession: async (req: StartWalletRequest) => {
      const { status, data } = await request<WalletSession>('POST', QA_SERVER_ROUTES.wallets, { body: req });
      return { session: data, created: status === 202 };
    },
    stopSession: async (id: string) => {
      await request<{ ok: true }>('DELETE', QA_SERVER_ROUTES.wallet(id));
    },
    getAddress: (id: string, { index = 0, kind = 'legacy' }: { index?: number; kind?: AddressKind } = {}) =>
      get<AddressResponse>(QA_SERVER_ROUTES.address(id), { index, kind }),
    getBalance: (id: string, token = '00') => get<BalanceResponse>(QA_SERVER_ROUTES.balance(id), { token }),
    getUtxos: (id: string, { token = '00', shielded = false }: { token?: string; shielded?: boolean } = {}) =>
      get<UtxosResponse>(QA_SERVER_ROUTES.utxos(id), { token, shielded }),
    send: async (id: string, req: SendRequest) =>
      (await request<SendResponse>('POST', QA_SERVER_ROUTES.send(id), { body: req })).data,
    getUnblinding: (id: string, txId: string) => get<UnblindingResponse>(QA_SERVER_ROUTES.unblinding(id, txId)),
  };
}

export type QaServerClient = ReturnType<typeof createQaServerClient>;

export const qaServerClient = createQaServerClient();

export interface PollSessionOptions {
  id: string;
  getSession: (id: string) => Promise<WalletSession>;
  onUpdate?: (session: WalletSession) => void;
  intervalMs?: number;
  /** A wallet start on a busy node can take a while; the server itself gives up after its own timeout. */
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  isCancelled?: () => boolean;
}

/** Polls `GET /wallets/:id` until the session leaves `starting`; resolves with the settled session. */
export async function pollSessionUntilSettled({
  id,
  getSession,
  onUpdate,
  intervalMs = 1500,
  timeoutMs = 180_000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
  isCancelled = () => false,
}: PollSessionOptions): Promise<WalletSession> {
  const started = now();
  for (;;) {
    const session = await getSession(id);
    onUpdate?.(session);
    if (session.state !== 'starting') return session;
    if (isCancelled()) throw new Error('Session polling cancelled');
    if (now() - started >= timeoutMs) {
      throw new Error(`Session ${id} is still starting after ${Math.round(timeoutMs / 1000)}s`);
    }
    await sleep(intervalMs);
  }
}
