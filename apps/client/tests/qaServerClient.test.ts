import { describe, expect, it } from 'bun:test';
import type { WalletSession } from '@qa-helper/shared/serverApi';
import {
  QaServerError,
  createQaServerClient,
  describeQaServerError,
  pollSessionUntilSettled,
  toQaServerError,
} from '../src/services/qaServerClient';

interface Call {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function mockFetch(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      headers: (init?.headers ?? {}) as Record<string, string>,
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { calls, fetchFn };
}

const SESSION: WalletSession = {
  id: 'WaddrLegacy0',
  network: 'SHIELDED_TESTNET',
  state: 'starting',
  capability: null,
  legacyAddress0: 'WaddrLegacy0',
  shieldedAddress0: null,
};

describe('createQaServerClient: routes', () => {
  it('prefixes every route with the base URL', async () => {
    const { calls, fetchFn } = mockFetch(() => json(200, []));
    const client = createQaServerClient({ baseUrl: '/qa-server', fetch: fetchFn });
    await client.listSessions();
    expect(calls[0].url).toBe('/qa-server/wallets');
    expect(calls[0].method).toBe('GET');
  });

  it('defaults to the dev proxy prefix', async () => {
    const { calls, fetchFn } = mockFetch(() => json(200, { ok: true, version: '1', networks: [], sessions: 0 }));
    await createQaServerClient({ fetch: fetchFn }).health();
    expect(calls[0].url).toBe('/qa-server/health');
  });

  it('startSession posts seed and network and reports whether it was created', async () => {
    const { calls, fetchFn } = mockFetch(() => json(202, SESSION));
    const client = createQaServerClient({ fetch: fetchFn });
    const result = await client.startSession({ seed: 'word '.repeat(24).trim(), network: 'SHIELDED_TESTNET' });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('/qa-server/wallets');
    expect(calls[0].body).toEqual({ seed: 'word '.repeat(24).trim(), network: 'SHIELDED_TESTNET' });
    expect(calls[0].headers['content-type']).toBe('application/json');
    expect(result).toEqual({ session: SESSION, created: true });
  });

  it('startSession reports an already running session as not created', async () => {
    const { fetchFn } = mockFetch(() => json(200, { ...SESSION, state: 'ready' }));
    const result = await createQaServerClient({ fetch: fetchFn }).startSession({ seed: 's', network: 'TESTNET' });
    expect(result.created).toBe(false);
  });

  it('encodes ids and builds query strings', async () => {
    const { calls, fetchFn } = mockFetch((call) => {
      if (call.url.includes('/addresses')) return json(200, { index: 2, kind: 'shielded', address: 'K3x' });
      if (call.url.includes('/balance')) return json(200, { token: '00', unlocked: '5', locked: '0' });
      if (call.url.includes('/utxos')) return json(200, { utxos: [] });
      if (call.url.includes('/unblinding')) return json(200, { inputs: [], outputs: [] });
      return json(200, { ok: true });
    });
    const client = createQaServerClient({ fetch: fetchFn });
    await client.getAddress('a/b', { index: 2, kind: 'shielded' });
    await client.getBalance('id1');
    await client.getUtxos('id1', { token: '00', shielded: true });
    await client.getUtxos('id1');
    await client.getUnblinding('id1', 'tx1');
    await client.stopSession('id1');
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET /qa-server/wallets/a%2Fb/addresses?index=2&kind=shielded',
      'GET /qa-server/wallets/id1/balance?token=00',
      'GET /qa-server/wallets/id1/utxos?token=00&shielded=true',
      'GET /qa-server/wallets/id1/utxos?token=00&shielded=false',
      'GET /qa-server/wallets/id1/tx/tx1/unblinding',
      'DELETE /qa-server/wallets/id1',
    ]);
  });

  it('send posts the SendRequest and returns the tx id', async () => {
    const { calls, fetchFn } = mockFetch(() => json(200, { txId: 'abc' }));
    const request = {
      outputs: [{ address: 'K3a', value: '100', token: '00', shielded: 'AMOUNT_SHIELDED' as const }],
      changeShieldedMode: 'TRANSPARENT' as const,
    };
    const result = await createQaServerClient({ fetch: fetchFn }).send('id1', request);
    expect(calls[0].body).toEqual(request);
    expect(result).toEqual({ txId: 'abc' });
  });
});

describe('createQaServerClient: errors', () => {
  it('maps an ApiErrorBody to QaServerError with status, code and message', async () => {
    const { fetchFn } = mockFetch(() =>
      json(422, { error: { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient amount of tokens' } })
    );
    const err = await createQaServerClient({ fetch: fetchFn })
      .send('id1', { outputs: [] })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(QaServerError);
    expect(err).toMatchObject({ status: 422, code: 'INSUFFICIENT_FUNDS', message: 'Insufficient amount of tokens' });
  });

  it('maps FORBIDDEN and CONFLICT', () => {
    expect(toQaServerError(403, { error: { code: 'FORBIDDEN', message: 'Origin or host not allowed' } }).code).toBe(
      'FORBIDDEN'
    );
    expect(toQaServerError(409, { error: { code: 'CONFLICT', message: 'other network' } }).code).toBe('CONFLICT');
  });

  it('treats a network failure as UNREACHABLE', async () => {
    const fetchFn = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const err = await createQaServerClient({ fetch: fetchFn })
      .listSessions()
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 0, code: 'UNREACHABLE' });
  });

  it('treats proxy failures without an API body as UNREACHABLE', () => {
    expect(toQaServerError(500, null).code).toBe('UNREACHABLE');
    expect(toQaServerError(502, 'Bad gateway').code).toBe('UNREACHABLE');
    expect(toQaServerError(204, null).code).toBe('UNREACHABLE');
  });

  it('treats other unexpected bodies as BAD_RESPONSE', () => {
    const err = toQaServerError(404, '<html>');
    expect(err.code).toBe('BAD_RESPONSE');
    expect(err.message).toContain('404');
  });

  it('rejects a 2xx body that is not JSON', async () => {
    const { fetchFn } = mockFetch(() => new Response('not json', { status: 200 }));
    const err = await createQaServerClient({ fetch: fetchFn })
      .listSessions()
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'BAD_RESPONSE' });
  });

  it('describes each code in plain words', () => {
    expect(describeQaServerError(new QaServerError(0, 'UNREACHABLE', 'x')).title).toMatch(/not running/i);
    expect(describeQaServerError(new QaServerError(422, 'INSUFFICIENT_FUNDS', 'x')).title).toMatch(/not enough funds/i);
    expect(describeQaServerError(new QaServerError(403, 'FORBIDDEN', 'x')).hint).toMatch(/localhost/);
    expect(describeQaServerError(new QaServerError(409, 'WALLET_NOT_READY', 'x')).title).toMatch(/preparing to sign/i);
    expect(describeQaServerError(new Error('boom'))).toEqual({ title: 'The request failed', hint: null });
  });
});

describe('pollSessionUntilSettled', () => {
  const noSleep = async () => {};

  it('polls until the session leaves `starting` and reports each update', async () => {
    const states: WalletSession['state'][] = ['starting', 'starting', 'ready'];
    const seen: string[] = [];
    const result = await pollSessionUntilSettled({
      id: SESSION.id,
      getSession: async () => ({ ...SESSION, state: states.shift()! }),
      onUpdate: (s) => seen.push(s.state),
      sleep: noSleep,
    });
    expect(result.state).toBe('ready');
    expect(seen).toEqual(['starting', 'starting', 'ready']);
  });

  it('returns an error session as settled', async () => {
    const result = await pollSessionUntilSettled({
      id: SESSION.id,
      getSession: async () => ({ ...SESSION, state: 'error', error: 'boom' }),
      sleep: noSleep,
    });
    expect(result).toMatchObject({ state: 'error', error: 'boom' });
  });

  it('times out', async () => {
    let t = 0;
    const err = await pollSessionUntilSettled({
      id: SESSION.id,
      getSession: async () => SESSION,
      sleep: async (ms) => {
        t += ms;
      },
      now: () => t,
      intervalMs: 1000,
      timeoutMs: 3000,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/still starting/i);
  });

  it('stops when cancelled', async () => {
    let calls = 0;
    const err = await pollSessionUntilSettled({
      id: SESSION.id,
      getSession: async () => {
        calls += 1;
        return SESSION;
      },
      sleep: noSleep,
      isCancelled: () => calls >= 2,
    }).catch((e: unknown) => e);
    expect((err as Error).message).toMatch(/cancelled/i);
    expect(calls).toBe(2);
  });

  it('propagates server errors', async () => {
    const err = await pollSessionUntilSettled({
      id: SESSION.id,
      getSession: async () => {
        throw new QaServerError(404, 'NOT_FOUND', 'gone');
      },
      sleep: noSleep,
    }).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'NOT_FOUND' });
  });
});
