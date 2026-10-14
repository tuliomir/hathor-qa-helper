import { NETWORKS, NETWORK_KEYS, type NetworkKey } from '@qa-helper/shared/networks';
import {
  QA_SERVER_PROXY_PREFIX,
  SHIELDED_OUTPUT_MODES,
  type AddressResponse,
  type BalanceResponse,
  type HealthResponse,
  type SendResponse,
  type UtxosResponse,
} from '@qa-helper/shared/serverApi';
import { z } from 'zod';
import { ApiError, badRequest, errorResponse, notFound, toApiError } from './errors.ts';
import { jsonResponse } from './json.ts';
import { HTR_UID, toLibSend } from './sendMapping.ts';
import { WalletRegistry } from './walletRegistry.ts';
import type { WalletFactory } from './walletPort.ts';

export const ALLOWED_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173']);
const ALLOWED_HOSTNAMES = new Set(['127.0.0.1', 'localhost']);

export interface AppDeps {
  factory: WalletFactory;
  version: string;
  readyPollMs?: number;
  readyTimeoutMs?: number;
}

export interface App {
  (req: Request): Promise<Response>;
  registry: WalletRegistry;
}

const networkKey = z.enum(NETWORK_KEYS as [NetworkKey, ...NetworkKey[]]);
const amount = z.string().regex(/^[1-9]\d*$/, 'must be a positive integer string');
const tokenUid = z.string().regex(/^(00|[0-9a-f]{64})$/, 'must be 00 or a 64-char hex token uid');

const startSchema = z.object({ seed: z.string().trim().min(1), network: networkKey });
const sendSchema = z.object({
  outputs: z
    .array(
      z.object({
        address: z.string().min(1),
        value: amount,
        token: tokenUid.optional(),
        shielded: z.enum(SHIELDED_OUTPUT_MODES).optional(),
      })
    )
    .min(1),
  changeShieldedMode: z.enum([...SHIELDED_OUTPUT_MODES, 'TRANSPARENT']).optional(),
});
const addressQuery = z.object({
  index: z.coerce.number().int().min(0).default(0),
  kind: z.enum(['legacy', 'shielded']).default('legacy'),
});
const tokenQuery = z.object({ token: tokenUid.default(HTR_UID) });
const utxoQuery = tokenQuery.extend({
  shielded: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    // Report paths and messages only: zod issues can carry the input (the seed).
    const detail = result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    throw badRequest(detail);
  }
  return result.data;
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest('Body must be valid JSON');
  }
}

const query = (url: URL) => Object.fromEntries(url.searchParams);

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return { vary: 'Origin' };
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

type Params = Record<string, string>;
type Handler = (req: Request, url: URL, params: Params) => Promise<Response>;

function compile(pattern: string): RegExp {
  return new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '/?$');
}

export function createApp(deps: AppDeps): App {
  const registry = new WalletRegistry(deps.factory, {
    readyPollMs: deps.readyPollMs,
    readyTimeoutMs: deps.readyTimeoutMs,
  });

  const routes: [method: string, pattern: RegExp, handler: Handler][] = [
    [
      'GET',
      compile('/health'),
      async () => {
        const body: HealthResponse = {
          ok: true,
          version: deps.version,
          networks: NETWORK_KEYS,
          sessions: registry.size,
        };
        return jsonResponse(body);
      },
    ],
    [
      'POST',
      compile('/wallets'),
      async (req) => {
        const { seed, network } = parse(startSchema, await readJson(req));
        const { session, created } = registry.start(seed, network);
        return jsonResponse(session, created ? 202 : 200);
      },
    ],
    ['GET', compile('/wallets'), async () => jsonResponse(registry.list())],
    ['GET', compile('/wallets/:id'), async (_req, _url, p) => jsonResponse(registry.get(p.id!))],
    [
      'DELETE',
      compile('/wallets/:id'),
      async (_req, _url, p) => {
        await registry.remove(p.id!);
        return jsonResponse({ ok: true });
      },
    ],
    [
      'GET',
      compile('/wallets/:id/addresses'),
      async (_req, url, p) => {
        const { wallet, session } = registry.ready(p.id!);
        const { index, kind } = parse(addressQuery, query(url));
        if (kind === 'shielded' && !NETWORKS[session.network].supportsShielded) {
          throw badRequest(`${session.network} has no shielded addresses`);
        }
        const address = await wallet.getAddressAtIndex(index, { legacy: kind === 'legacy' });
        const body: AddressResponse = { index, kind, address };
        return jsonResponse(body);
      },
    ],
    [
      'GET',
      compile('/wallets/:id/balance'),
      async (_req, url, p) => {
        const { wallet } = registry.ready(p.id!);
        const { token } = parse(tokenQuery, query(url));
        // wallet-lib 4.2.0 credits decoded shielded outputs into the same
        // token balance as transparent ones (storage `creditOutput`), with no
        // split. For the shielded part alone, sum `/utxos?shielded=true`.
        const [entry] = await wallet.getBalance(token);
        const body: BalanceResponse = {
          token,
          unlocked: String(entry?.balance.unlocked ?? 0n),
          locked: String(entry?.balance.locked ?? 0n),
        };
        return jsonResponse(body);
      },
    ],
    [
      'GET',
      compile('/wallets/:id/utxos'),
      async (_req, url, p) => {
        const { wallet } = registry.ready(p.id!);
        const { token, shielded } = parse(utxoQuery, query(url));
        // The lib filters strictly: `shielded: true` returns only shielded
        // UTXOs and `false` only transparent ones, so the flag labels them all.
        const details = await wallet.getUtxos({ token, shielded });
        const body: UtxosResponse = {
          utxos: details.utxos.map((u) => ({
            txId: u.tx_id,
            index: u.index,
            token,
            address: u.address,
            value: String(u.amount),
            shielded,
            locked: u.locked,
          })),
        };
        return jsonResponse(body);
      },
    ],
    [
      'POST',
      compile('/wallets/:id/send'),
      async (req, _url, p) => {
        registry.ready(p.id!);
        const { outputs, options } = toLibSend(parse(sendSchema, await readJson(req)));
        const tx = await registry.enqueueSend(p.id!, (wallet) => wallet.sendManyOutputsTransaction(outputs, options));
        if (!tx?.hash) throw new ApiError(500, 'LIB_ERROR', 'The wallet returned no transaction');
        const body: SendResponse = { txId: tx.hash };
        return jsonResponse(body);
      },
    ],
    [
      'GET',
      compile('/wallets/:id/tx/:txId/unblinding'),
      async (_req, _url, p) => {
        const { wallet } = registry.ready(p.id!);
        return jsonResponse(await wallet.getShieldedUnblindingForTx(p.txId!));
      },
    ],
  ];

  const route = async (req: Request, url: URL): Promise<Response> => {
    let pathMatched = false;
    for (const [method, pattern, handler] of routes) {
      const m = pattern.exec(url.pathname);
      if (!m) continue;
      pathMatched = true;
      if (method !== req.method) continue;
      const params = Object.fromEntries(Object.entries(m.groups ?? {}).map(([k, v]) => [k, decodeURIComponent(v)]));
      return handler(req, url, params);
    }
    if (pathMatched) throw new ApiError(405, 'BAD_REQUEST', `${req.method} not allowed on ${url.pathname}`);
    throw notFound(`No route for ${req.method} ${url.pathname}`);
  };

  const app = async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin');
    const cors = corsHeaders(origin);
    const url = new URL(req.url);
    // Browsers on other sites can still send "simple" requests (a text/plain
    // POST skips preflight), and DNS rebinding can point a foreign name at
    // 127.0.0.1: refuse both before any wallet is touched.
    if ((origin && !ALLOWED_ORIGINS.has(origin)) || !ALLOWED_HOSTNAMES.has(url.hostname)) {
      return errorResponse(new ApiError(403, 'BAD_REQUEST', 'Origin or host not allowed'), cors);
    }
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === QA_SERVER_PROXY_PREFIX || url.pathname.startsWith(QA_SERVER_PROXY_PREFIX + '/')) {
      url.pathname = url.pathname.slice(QA_SERVER_PROXY_PREFIX.length) || '/';
    }
    try {
      const res = await route(req, url);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (err) {
      return errorResponse(toApiError(err), cors);
    }
  };
  return Object.assign(app, { registry });
}
