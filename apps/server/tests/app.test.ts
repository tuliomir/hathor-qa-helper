import { beforeEach, describe, expect, test } from 'bun:test';
import { createApp, type App } from '../src/app.ts';
import { FakeFactory } from './fakes.ts';
import type { ApiErrorBody } from '@qa-helper/shared/serverApi';

const BASE = 'http://127.0.0.1:5180';
const ORIGIN = 'http://localhost:5173';

let factory: FakeFactory;
let app: App;

// Bun types `json()` as unknown; the assertions below check the shape.
type TestResponse = Omit<Response, 'json'> & { json(): Promise<any> };

beforeEach(() => {
  factory = new FakeFactory();
  app = createApp({ factory, version: '9.9.9', readyPollMs: 1, readyTimeoutMs: 1000 });
});

function call(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<TestResponse> {
  return app(
    new Request(BASE + path, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
}

describe('health', () => {
  test('reports version, networks and session count', async () => {
    const res = await call('GET', '/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      version: '9.9.9',
      networks: ['TESTNET', 'MAINNET', 'SHIELDED_TESTNET'],
      sessions: 0,
    });
  });

  test('works behind the /qa-server proxy prefix', async () => {
    const res = await call('GET', '/qa-server/health');
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  test('unknown route is 404 NOT_FOUND', async () => {
    const res = await call('GET', '/nope');
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('NOT_FOUND');
  });
});

describe('CORS', () => {
  test('echoes an allowed origin', async () => {
    const res = await call('GET', '/health', undefined, { origin: ORIGIN });
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(res.headers.get('vary')).toContain('Origin');
  });

  test('answers preflight with 204 and allowed methods', async () => {
    const res = await call('OPTIONS', '/wallets', undefined, {
      origin: 'http://127.0.0.1:5173',
      'access-control-request-method': 'POST',
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:5173');
    expect(res.headers.get('access-control-allow-methods')).toContain('DELETE');
    expect(res.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('content-type');
  });

  test('rejects a foreign origin with 403 before touching wallets', async () => {
    const res = await call(
      'POST',
      '/wallets',
      { seed: 'seed-a', network: 'TESTNET' },
      { origin: 'https://evil.example' }
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('FORBIDDEN');
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect(factory.wallets).toHaveLength(0);
  });

  // The Vite dev proxy forwards the browser's Origin, so a dev client on any
  // loopback port must pass.
  test.each(['http://localhost:5184', 'http://127.0.0.1:61234', 'http://localhost'])(
    'accepts the loopback origin %s',
    async (origin) => {
      const res = await call('GET', '/health', undefined, { origin });
      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBe(origin);
    }
  );

  test.each([
    'http://localhost.evil.example:5173',
    'http://evil.example/http://localhost:5173',
    'http://192.168.1.10:5173',
    'https://localhost:5173',
    'http://localhost:5173@evil.example',
    'null',
  ])('rejects the non-loopback origin %s', async (origin) => {
    const res = await call('GET', '/health', undefined, { origin });
    expect(res.status).toBe(403);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  test('a loopback origin does not bypass the Host check', async () => {
    const res = await app(new Request('http://evil.example:5180/health', { headers: { origin: ORIGIN } }));
    expect(res.status).toBe(403);
  });

  test('rejects a foreign Host header (DNS rebinding)', async () => {
    const res = await app(new Request('http://evil.example:5180/health'));
    expect(res.status).toBe(403);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe('FORBIDDEN');
  });
});

async function waitForState(id: string, state: string) {
  for (let i = 0; i < 200; i++) {
    const s = await (await call('GET', `/wallets/${id}`)).json();
    if (s.state === state) return s;
    await Bun.sleep(1);
  }
  throw new Error(`wallet ${id} never reached ${state}`);
}

describe('POST /wallets validation', () => {
  test.each([
    ['invalid JSON', '{nope'],
    ['missing seed', { network: 'TESTNET' }],
    ['empty seed', { seed: '', network: 'TESTNET' }],
    ['unknown network', { seed: 'seed-a', network: 'testnet' }],
  ])('%s is 400 BAD_REQUEST', async (_name, body) => {
    const res = await call('POST', '/wallets', body);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('BAD_REQUEST');
    expect(factory.wallets).toHaveLength(0);
  });

  test('an invalid seed is 400 and the seed is not echoed', async () => {
    const res = await call('POST', '/wallets', { seed: 'bad', network: 'TESTNET' });
    expect(res.status).toBe(400);
    expect(await res.text()).not.toContain('"bad"');
  });
});

describe('wallet lifecycle', () => {
  test('POST returns a starting session at once, then it becomes ready', async () => {
    const res = await call('POST', '/wallets', { seed: 'seed-a', network: 'SHIELDED_TESTNET' });
    expect(res.status).toBe(202);
    const session = await res.json();
    expect(session).toEqual({
      id: 'W-seed-a-0',
      network: 'SHIELDED_TESTNET',
      state: 'starting',
      capability: null,
      legacyAddress0: 'W-seed-a-0',
      shieldedAddress0: null,
    });

    const ready = await waitForState('W-seed-a-0', 'ready');
    expect(ready.capability).toEqual({
      level: 'full',
      reason: null,
      canReceive: true,
      canSpend: true,
      historyComplete: true,
    });
    expect(ready.shieldedAddress0).toBe('K3-seed-a-0');
    expect(JSON.stringify(ready)).not.toContain('"seed-a"');
  });

  test('starting a wallet leaves the global network config alone', async () => {
    // The tx-mining URL is process-global and only the send queue may switch
    // it; a start racing an in-flight send on another network would redirect it.
    await call('POST', '/wallets', { seed: 'seed-a', network: 'SHIELDED_TESTNET' });
    await factory.last().started;
    await waitForState('W-seed-a-0', 'ready');
    expect(factory.log.filter((entry) => entry.startsWith('config:'))).toEqual([]);
  });

  test('a transparent-only network has no shielded address', async () => {
    await call('POST', '/wallets', { seed: 'seed-a', network: 'TESTNET' });
    const ready = await waitForState('W-seed-a-0', 'ready');
    expect(ready.shieldedAddress0).toBeNull();
  });

  test('starting twice is idempotent', async () => {
    await call('POST', '/wallets', { seed: 'seed-a', network: 'TESTNET' });
    const second = await call('POST', '/wallets', { seed: 'seed-a', network: 'TESTNET' });
    expect(second.status).toBe(200);
    expect((await second.json()).id).toBe('W-seed-a-0');
    expect(factory.wallets).toHaveLength(1);
  });

  test('the same seed on another network is 409', async () => {
    await call('POST', '/wallets', { seed: 'seed-a', network: 'TESTNET' });
    const res = await call('POST', '/wallets', { seed: 'seed-a', network: 'SHIELDED_TESTNET' });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('CONFLICT');
    expect(factory.wallets).toHaveLength(1);
  });

  test('a failed start shows state error, and POST retries it', async () => {
    factory.configure = (w) => (w.startError = new Error('node unreachable'));
    await call('POST', '/wallets', { seed: 'seed-a', network: 'TESTNET' });
    const failed = await waitForState('W-seed-a-0', 'error');
    expect(failed.error).toBe('node unreachable');

    factory.configure = () => {};
    const retry = await call('POST', '/wallets', { seed: 'seed-a', network: 'TESTNET' });
    expect((await retry.json()).state).toBe('starting');
    await waitForState('W-seed-a-0', 'ready');
    expect(factory.wallets).toHaveLength(2);
  });

  test('GET /wallets lists sessions and health counts them', async () => {
    await call('POST', '/wallets', { seed: 'seed-a', network: 'TESTNET' });
    await call('POST', '/wallets', { seed: 'seed-b', network: 'TESTNET' });
    const list = await (await call('GET', '/wallets')).json();
    expect(list.map((s: { id: string }) => s.id).sort()).toEqual(['W-seed-a-0', 'W-seed-b-0']);
    expect((await (await call('GET', '/health')).json()).sessions).toBe(2);
  });

  test('unknown wallet is 404 on every wallet route', async () => {
    for (const [method, path] of [
      ['GET', '/wallets/nope'],
      ['GET', '/wallets/nope/addresses'],
      ['GET', '/wallets/nope/balance'],
      ['GET', '/wallets/nope/utxos'],
      ['POST', '/wallets/nope/send'],
      ['GET', '/wallets/nope/tx/abc/unblinding'],
      ['DELETE', '/wallets/nope'],
    ]) {
      const res = await call(method!, path!, method === 'POST' ? { outputs: [] } : undefined);
      expect([path, res.status]).toEqual([path, 404]);
      expect((await res.json()).error.code).toBe('NOT_FOUND');
    }
  });

  test('DELETE stops the wallet and forgets the session', async () => {
    await call('POST', '/wallets', { seed: 'seed-a', network: 'TESTNET' });
    await waitForState('W-seed-a-0', 'ready');
    const res = await call('DELETE', '/wallets/W-seed-a-0');
    expect(await res.json()).toEqual({ ok: true });
    expect(factory.last().calls.some((c) => c.method === 'stop')).toBe(true);
    expect((await call('GET', '/wallets/W-seed-a-0')).status).toBe(404);
  });
});

async function readyWallet(seed = 'seed-a', network = 'SHIELDED_TESTNET') {
  await call('POST', '/wallets', { seed, network });
  await waitForState(`W-${seed}-0`, 'ready');
  return factory.wallets.find((w) => w.seed === seed)!;
}

const HTR_OUT = { address: 'K3-dest', value: '10' };

describe('routes that need a ready wallet', () => {
  test.each([
    ['GET', '/wallets/W-seed-a-0/addresses'],
    ['GET', '/wallets/W-seed-a-0/balance'],
    ['GET', '/wallets/W-seed-a-0/utxos'],
    ['POST', '/wallets/W-seed-a-0/send'],
    ['GET', '/wallets/W-seed-a-0/tx/abc/unblinding'],
  ])('%s %s is 409 WALLET_NOT_READY while starting', async (method, path) => {
    factory.configure = (w) => (w.startGate = new Promise(() => {}));
    await call('POST', '/wallets', { seed: 'seed-a', network: 'SHIELDED_TESTNET' });
    const res = await call(method, path, method === 'POST' ? { outputs: [HTR_OUT] } : undefined);
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('WALLET_NOT_READY');
  });
});

describe('addresses', () => {
  test('defaults to legacy index 0', async () => {
    await readyWallet();
    const res = await call('GET', '/wallets/W-seed-a-0/addresses');
    expect(await res.json()).toEqual({ index: 0, kind: 'legacy', address: 'W-seed-a-0' });
  });

  test('returns a shielded address at an index', async () => {
    await readyWallet();
    const res = await call('GET', '/wallets/W-seed-a-0/addresses?index=3&kind=shielded');
    expect(await res.json()).toEqual({ index: 3, kind: 'shielded', address: 'K3-seed-a-3' });
  });

  test.each(['index=-1', 'index=x', 'kind=both'])('rejects %s', async (q) => {
    await readyWallet();
    expect((await call('GET', `/wallets/W-seed-a-0/addresses?${q}`)).status).toBe(400);
  });

  test('shielded on a transparent-only network is 400', async () => {
    await readyWallet('seed-a', 'TESTNET');
    expect((await call('GET', '/wallets/W-seed-a-0/addresses?kind=shielded')).status).toBe(400);
  });
});

describe('BigInt encoding', () => {
  test('balance amounts are exact decimal strings', async () => {
    const w = await readyWallet();
    const res = await call('GET', '/wallets/W-seed-a-0/balance');
    expect(await res.json()).toEqual({ token: '00', unlocked: '12345678901234567890', locked: '5' });
    expect(w.calls.find((c) => c.method === 'getBalance')!.args).toEqual(['00']);
  });

  test('utxos pass the shielded flag through and stringify values', async () => {
    const w = await readyWallet();
    const res = await call('GET', '/wallets/W-seed-a-0/utxos?shielded=true');
    expect(await res.json()).toEqual({
      utxos: [
        { txId: 'tx1', index: 0, token: '00', address: 'W-x', value: '7', shielded: true, locked: false },
        { txId: 'tx2', index: 2, token: '00', address: 'W-y', value: '3', shielded: true, locked: true },
      ],
    });
    expect(w.calls.find((c) => c.method === 'getUtxos')!.args).toEqual([{ token: '00', shielded: true }]);
  });

  test('utxos default to transparent', async () => {
    const w = await readyWallet();
    await call('GET', '/wallets/W-seed-a-0/utxos');
    expect(w.calls.find((c) => c.method === 'getUtxos')!.args).toEqual([{ token: '00', shielded: false }]);
  });

  test('unblinding stringifies values', async () => {
    const w = await readyWallet();
    const res = await call('GET', '/wallets/W-seed-a-0/tx/abc/unblinding');
    expect(await res.json()).toEqual({ outputs: [{ index: 2, value: '100', token: '00', vbf: 'ab' }], inputs: [] });
    expect(w.calls.find((c) => c.method === 'getShieldedUnblindingForTx')!.args).toEqual(['abc']);
  });
});

describe('send', () => {
  const sendArgs = (w: { calls: { method: string; args: unknown[] }[] }) =>
    w.calls.find((c) => c.method === 'sendManyOutputsTransaction')!.args;

  test('maps outputs and modes to wallet-lib values', async () => {
    const w = await readyWallet();
    const token = 'ab'.repeat(32);
    const res = await call('POST', '/wallets/W-seed-a-0/send', {
      outputs: [
        { address: 'K3-a', value: '10', shielded: 'AMOUNT_SHIELDED' },
        { address: 'K3-b', value: '20', token, shielded: 'FULLY_SHIELDED' },
        { address: 'W-c', value: '30' },
      ],
      changeShieldedMode: 'FULLY_SHIELDED',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ txId: 'tx-seed-a-1' });
    // Literal enum values from wallet-lib/ct-crypto-provider: AMOUNT_SHIELDED = 1, FULLY_SHIELDED = 2.
    expect(sendArgs(w)).toEqual([
      [
        { address: 'K3-a', value: 10n, token: '00', shielded: 1 },
        { address: 'K3-b', value: 20n, token, shielded: 2 },
        { address: 'W-c', value: 30n, token: '00' },
      ],
      { changeShieldedMode: 2 },
    ]);
  });

  test("TRANSPARENT change maps to OutputKind.TRANSPARENT ('transparent')", async () => {
    const w = await readyWallet();
    await call('POST', '/wallets/W-seed-a-0/send', { outputs: [HTR_OUT], changeShieldedMode: 'TRANSPARENT' });
    expect(sendArgs(w)[1]).toEqual({ changeShieldedMode: 'transparent' });
  });

  test('no change mode leaves the option out (lib automatic rules)', async () => {
    const w = await readyWallet();
    await call('POST', '/wallets/W-seed-a-0/send', { outputs: [HTR_OUT] });
    expect(sendArgs(w)[1]).toEqual({});
  });

  test('applies the network config before sending', async () => {
    await readyWallet();
    factory.log.length = 0;
    await call('POST', '/wallets/W-seed-a-0/send', { outputs: [HTR_OUT] });
    expect(factory.log).toEqual(['config:SHIELDED_TESTNET', 'send-start:seed-a:1', 'send-end:seed-a:1']);
  });

  test.each([
    ['no outputs', { outputs: [] }],
    ['zero value', { outputs: [{ address: 'K3', value: '0' }] }],
    ['numeric value', { outputs: [{ address: 'K3', value: 10 }] }],
    ['decimal value', { outputs: [{ address: 'K3', value: '1.5' }] }],
    ['unknown mode', { outputs: [{ address: 'K3', value: '1', shielded: 'SHIELDED' }] }],
    ['bad token', { outputs: [{ address: 'K3', value: '1', token: 'HTR' }] }],
    ['bad change mode', { outputs: [HTR_OUT], changeShieldedMode: 'NONE' }],
  ])('%s is 400', async (_name, body) => {
    const w = await readyWallet();
    const res = await call('POST', '/wallets/W-seed-a-0/send', body);
    expect(res.status).toBe(400);
    expect(w.calls.some((c) => c.method === 'sendManyOutputsTransaction')).toBe(false);
  });

  test('insufficient funds maps to INSUFFICIENT_FUNDS', async () => {
    factory.configure = (w) =>
      (w.sendError = new Error('Token: 00. Insufficient amount of tokens to fill the amount.'));
    await readyWallet();
    const res = await call('POST', '/wallets/W-seed-a-0/send', { outputs: [HTR_OUT] });
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('INSUFFICIENT_FUNDS');
  });

  test('other lib errors map to LIB_ERROR', async () => {
    factory.configure = (w) => (w.sendError = new Error('mining failed'));
    await readyWallet();
    const res = await call('POST', '/wallets/W-seed-a-0/send', { outputs: [HTR_OUT] });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: 'LIB_ERROR', message: 'mining failed' } });
  });

  test('concurrent sends run one at a time, across wallets too', async () => {
    let open!: () => void;
    const gate = new Promise<void>((r) => (open = r));
    factory.configure = (w) => (w.sendGate = gate);
    await readyWallet('seed-a');
    await readyWallet('seed-b', 'TESTNET');
    factory.log.length = 0;

    const sends = [
      call('POST', '/wallets/W-seed-a-0/send', { outputs: [HTR_OUT] }),
      call('POST', '/wallets/W-seed-a-0/send', { outputs: [HTR_OUT] }),
      call('POST', '/wallets/W-seed-b-0/send', { outputs: [HTR_OUT] }),
    ];
    await Bun.sleep(5);
    expect(factory.log).toEqual(['config:SHIELDED_TESTNET', 'send-start:seed-a:1']);
    open();
    const ids = await Promise.all(sends.map(async (r) => (await (await r).json()).txId));
    expect(ids).toEqual(['tx-seed-a-1', 'tx-seed-a-2', 'tx-seed-b-1']);
    expect(factory.log).toEqual([
      'config:SHIELDED_TESTNET',
      'send-start:seed-a:1',
      'send-end:seed-a:1',
      'config:SHIELDED_TESTNET',
      'send-start:seed-a:2',
      'send-end:seed-a:2',
      'config:TESTNET',
      'send-start:seed-b:1',
      'send-end:seed-b:1',
    ]);
  });

  test('a failed send does not block the next one', async () => {
    const w = await readyWallet();
    w.sendError = new Error('boom');
    expect((await call('POST', '/wallets/W-seed-a-0/send', { outputs: [HTR_OUT] })).status).toBe(500);
    w.sendError = null;
    expect((await call('POST', '/wallets/W-seed-a-0/send', { outputs: [HTR_OUT] })).status).toBe(200);
  });
});
