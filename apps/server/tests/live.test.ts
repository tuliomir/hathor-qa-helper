/**
 * Live smoke test against the shielded-outputs testnet. Opt-in:
 *   SO_LIVE=1 bun test tests/live.test.ts
 * Starts a real wallet from a fresh seed through the HTTP API. No funds exist
 * for it, so nothing is sent.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { walletUtils } from '@hathor/wallet-lib';
import { createApp } from '../src/app.ts';
import { createWalletFactory } from '../src/walletFactory.ts';

const live = process.env.SO_LIVE === '1';

describe.skipIf(!live)('live: SHIELDED_TESTNET', () => {
  const app = createApp({ factory: createWalletFactory(), version: 'live' });
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: app });
  const base = `http://127.0.0.1:${server.port}`;
  const get = async (path: string): Promise<any> => (await fetch(base + path)).json();

  afterAll(async () => {
    await app.registry.stopAll();
    await server.stop(true);
  });

  test('a fresh wallet becomes ready with full shielded capability', async () => {
    const seed = walletUtils.generateWalletWords();
    const res = await fetch(`${base}/qa-server/wallets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
      body: JSON.stringify({ seed, network: 'SHIELDED_TESTNET' }),
    });
    expect(res.status).toBe(202);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    const { id } = (await res.json()) as { id: string };

    let session: any;
    for (const started = Date.now(); Date.now() - started < 90_000; await Bun.sleep(500)) {
      session = await get(`/wallets/${id}`);
      if (session.state !== 'starting') break;
    }
    expect(session.state).toBe('ready');
    expect(session.capability.level).toBe('full');
    expect(session.shieldedAddress0).toMatch(/^K3/);
    expect(session.shieldedAddress0).toHaveLength(97);
    expect(JSON.stringify(session)).not.toContain(seed);

    // The id derived offline from the seed matches the wallet's own addr0.
    expect((await get(`/wallets/${id}/addresses?kind=legacy`)).address).toBe(id);
    expect((await get(`/wallets/${id}/addresses?kind=shielded`)).address).toBe(session.shieldedAddress0);
    expect(await get(`/wallets/${id}/balance`)).toEqual({ token: '00', unlocked: '0', locked: '0' });
    expect(await get(`/wallets/${id}/utxos?shielded=true`)).toEqual({ utxos: [] });
    console.log('live session', JSON.stringify(session));
  }, 120_000);
});
