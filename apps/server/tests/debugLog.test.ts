import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.ts';
import { DebugLog, defaultDebugLogFile } from '../src/debugLog.ts';
import { FakeFactory } from './fakes.ts';

const BASE = 'http://127.0.0.1:5180';
const SEED = Array.from({ length: 24 }, () => 'abandon').join(' ');
const dirs: string[] = [];

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function tempFile() {
  const dir = mkdtempSync(join(tmpdir(), 'qa-debug-'));
  dirs.push(dir);
  return join(dir, 'nested', 'debug-log.jsonl');
}

function setup(debugLog = new DebugLog({ file: null })) {
  const app = createApp({ factory: new FakeFactory(), version: '1', debugLog });
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await app(
      new Request(BASE + '/qa-server' + path, {
        method,
        headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    );
    return { status: res.status, body: (await res.json()) as any };
  };
  return { app, call };
}

const event = (type: string, data?: unknown, tab = 't1') => ({
  at: 1,
  tab,
  page: '/tools/rpc',
  kind: 'action' as const,
  type,
  data,
});

describe('debug log API', () => {
  test('stores events in order and reads them after a seq', async () => {
    const { call } = setup();
    expect((await call('POST', '/debug-log', { events: [event('a'), event('b')] })).body).toEqual({ last: 2 });
    await call('POST', '/debug-log', { events: [event('c', undefined, 't2')] });

    const all = (await call('GET', '/debug-log')).body;
    expect(all.events.map((e: any) => [e.seq, e.type])).toEqual([
      [1, 'a'],
      [2, 'b'],
      [3, 'c'],
    ]);
    expect(all.last).toBe(3);
    expect((await call('GET', '/debug-log?since=2')).body.events.map((e: any) => e.type)).toEqual(['c']);
    expect((await call('GET', '/debug-log?tab=t1&limit=1')).body.events.map((e: any) => e.type)).toEqual(['b']);
  });

  test('redacts secrets the client let through', async () => {
    const { call } = setup();
    await call('POST', '/debug-log', { events: [event('walletStore/addWallet', { seedWords: SEED, note: SEED })] });
    const [stored] = (await call('GET', '/debug-log')).body.events;
    expect(stored.data).toEqual({ seedWords: '[redacted]', note: '[redacted]' });
  });

  test('refuses a malformed batch', async () => {
    const { call } = setup();
    expect((await call('POST', '/debug-log', { events: [{ type: 'x' }] })).status).toBe(400);
  });

  test("keeps each tab's latest state, newest first", async () => {
    const { call } = setup();
    await call('POST', '/debug-state', { tab: 't1', page: '/a', at: 1, state: { step: 1 } });
    await call('POST', '/debug-state', { tab: 't2', page: '/b', at: 2, state: { pin: '123456' } });
    await call('POST', '/debug-state', { tab: 't1', page: '/a', at: 3, state: { step: 2 } });
    const { tabs } = (await call('GET', '/debug-state')).body;
    expect(tabs.map((t: any) => [t.tab, t.state])).toEqual([
      ['t1', { step: 2 }],
      ['t2', { pin: '[redacted]' }],
    ]);
  });
});

describe('DebugLog store', () => {
  test('appends JSONL to the file and rotates it past the size limit', () => {
    const file = tempFile();
    const log = new DebugLog({ file, maxFileBytes: 200 });
    log.append([event('first')]);
    expect(
      readFileSync(file, 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l).type)
    ).toEqual(['first']);

    log.append(Array.from({ length: 5 }, (_, i) => event(`more-${i}`)));
    log.append([event('after-rotation')]);
    expect(existsSync(`${file}.1`)).toBe(true);
    expect(
      readFileSync(file, 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l).type)
    ).toEqual(['after-rotation']);
  });

  test('keeps only the last events in memory', () => {
    const log = new DebugLog({ file: null, capacity: 3 });
    log.append(['a', 'b', 'c', 'd'].map((t) => event(t)));
    expect(log.read().events.map((e) => [e.seq, e.type])).toEqual([
      [2, 'b'],
      [3, 'c'],
      [4, 'd'],
    ]);
  });

  test('defaults to the XDG state dir unless QA_DEBUG_LOG says otherwise', () => {
    expect(defaultDebugLogFile({ XDG_STATE_HOME: '/s' })).toBe('/s/qa-helper/debug-log.jsonl');
    expect(defaultDebugLogFile({ QA_DEBUG_LOG: '/x.jsonl' })).toBe('/x.jsonl');
  });
});
