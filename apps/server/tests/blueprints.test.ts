import { describe, expect, test } from 'bun:test';
import { NETWORKS, type NetworkDefinition } from '@qa-helper/shared/networks';
import type { FullnodeApi, FullnodeVersion, OnChainPage } from '../src/blueprints/fullnode.ts';
import { decideGate, parseCliArgs, promptAccepted, readSeed, SEED_ENV } from '../src/blueprints/gate.ts';
import {
  checkNetwork,
  computePlan,
  describePublishError,
  formatHtr,
  formatPlan,
  needsUnverifiedAck,
  registrySnippet,
  toPublish,
} from '../src/blueprints/plan.ts';
import {
  BLUEPRINTS_SUBDIR,
  exportedClassName,
  loadBlueprintSources,
  PublisherError,
  RefusedError,
  resolveWalletLibDir,
  sha256,
  type BlueprintSource,
} from '../src/blueprints/sources.ts';

const code = (cls: string, body = '') => `@export\nclass ${cls}(Blueprint):\n    pass${body}\n`;

const SOURCES: BlueprintSource[] = (
  [
    ['bet', 'Bet'],
    ['fee', 'FeeBlueprint'],
    ['authority', 'AuthorityBlueprint'],
  ] as const
).map(([key, cls]) => ({ key, path: `/wl/${key}.py`, code: code(cls), sha256: sha256(code(cls)), className: cls }));

const VERSION: FullnodeVersion = { version: '0.72.0', network: 'testnet-juliet', nano_contracts_enabled: true };

function net(overrides: Partial<NetworkDefinition> = {}): NetworkDefinition {
  return { ...NETWORKS.NEXT_TESTNET, ...overrides };
}

/** Fake fullnode: `known` maps blueprint id → source; `pages` is the on-chain listing (or a failure). */
function fakeApi(
  known: Record<string, string>,
  listing: OnChainPage[] | { reason: string }
): FullnodeApi & {
  calls: string[];
} {
  const calls: string[] = [];
  let page = 0;
  return {
    calls,
    version: async () => VERSION,
    blueprintExists: async (id) => (calls.push(`info ${id}`), id in known),
    blueprintSource: async (id) => (calls.push(`source ${id}`), known[id] ?? null),
    onChainBlueprints: async (after) => {
      calls.push(`list ${after}`);
      if (!Array.isArray(listing)) return { ok: false, reason: listing.reason };
      return listing[page++] ?? { ok: true, blueprints: [], hasMore: false };
    },
    tx: async () => ({ found: false, firstBlock: null, voided: false, timestamp: null }),
  };
}

const NO_INDEX = { reason: 'HTTP 503: Blueprint index not initialized' };

describe('resolveWalletLibDir', () => {
  test('prefers $WALLET_LIB_DIR', () => {
    expect(resolveWalletLibDir({ WALLET_LIB_DIR: '/x/wl' }, '/code/qa', () => true)).toBe('/x/wl');
  });

  test('defaults to wallet-lib beside the repo', () => {
    expect(resolveWalletLibDir({}, '/code/qa-helper-wt', () => true)).toBe('/code/wallet-lib');
  });

  test('fails loudly naming the path and its origin', () => {
    expect(() => resolveWalletLibDir({}, '/code/qa', () => false)).toThrow(
      /wallet-lib not found at \/code\/wallet-lib \(from the default/
    );
    expect(() => resolveWalletLibDir({ WALLET_LIB_DIR: '/nope' }, '/code/qa', () => false)).toThrow(
      /\/nope \(from \$WALLET_LIB_DIR\)/
    );
  });
});

describe('loadBlueprintSources', () => {
  const files: Record<string, string> = {
    [`/wl/${BLUEPRINTS_SUBDIR}/bet.py`]: code('Bet'),
    [`/wl/${BLUEPRINTS_SUBDIR}/fee.py`]: code('FeeBlueprint'),
    [`/wl/${BLUEPRINTS_SUBDIR}/authority.py`]: code('AuthorityBlueprint'),
  };

  test('reads the three sources with their hash and class', () => {
    const sources = loadBlueprintSources(
      '/wl',
      (p) => files[p]!,
      (p) => p in files
    );
    expect(sources.map((s) => [s.key, s.className])).toEqual([
      ['bet', 'Bet'],
      ['fee', 'FeeBlueprint'],
      ['authority', 'AuthorityBlueprint'],
    ]);
    expect(sources[0]!.sha256).toBe(sha256(code('Bet')));
  });

  test('lists every missing .py', () => {
    const exists = (p: string) => p.endsWith('bet.py');
    expect(() => loadBlueprintSources('/wl', () => '', exists)).toThrow(/missing[\s\S]*fee\.py[\s\S]*authority\.py/);
  });

  test('finds the @export class', () => {
    expect(exportedClassName('class X(NCFail):\n  pass\n\n@export\nclass Bet(Blueprint):')).toBe('Bet');
    expect(exportedClassName('class Bet(Blueprint):')).toBeNull();
  });
});

describe('checkNetwork', () => {
  test('accepts a node of any testnet for a testnet entry', () => {
    expect(() => checkNetwork(net(), VERSION)).not.toThrow();
    expect(() => checkNetwork(NETWORKS.TESTNET, { ...VERSION, network: 'testnet-india' })).not.toThrow();
  });

  test('stops on a libName mismatch', () => {
    expect(() => checkNetwork(net(), { ...VERSION, network: 'privatenet' })).toThrow(/Network mismatch/);
    expect(() => checkNetwork(NETWORKS.TESTNET, { ...VERSION, network: 'privatenet' })).toThrow(/Network mismatch/);
  });

  test('refuses mainnet by key or by what the node reports', () => {
    expect(() => checkNetwork(NETWORKS.MAINNET, { ...VERSION, network: 'mainnet' })).toThrow(/mainnet/);
    expect(() => checkNetwork(net(), { ...VERSION, network: 'mainnet' })).toThrow(/mainnet/);
  });

  test('a mainnet refusal is a refusal, not an error', () => {
    expect(() => checkNetwork(net(), { ...VERSION, network: 'mainnet' })).toThrow(RefusedError);
    expect(() => checkNetwork(net(), { ...VERSION, network: 'testnet-india' })).not.toThrow(RefusedError);
  });

  test('the CLI exits 2 when it refuses mainnet', () => {
    const cli = new URL('../src/blueprints/cli.ts', import.meta.url).pathname;
    const run = Bun.spawnSync(['bun', cli, '--network', 'MAINNET', '--dry-run'], { stderr: 'pipe' });
    expect(run.stderr.toString()).toContain('Refused: Refusing to publish on mainnet.');
    expect(run.exitCode).toBe(2);
  });

  test('stops when nano contracts are disabled', () => {
    expect(() => checkNetwork(net(), { ...VERSION, nano_contracts_enabled: false })).toThrow(/nano_contracts_enabled/);
  });
});

describe('computePlan', () => {
  const plan = (network: NetworkDefinition, api: FullnodeApi, ocbTxIds: string[] | null = null) =>
    computePlan({
      api,
      network,
      version: VERSION,
      sources: SOURCES,
      publisher: ocbTxIds ? { address: 'WAddr', htrBalance: '0', ocbTxIds } : null,
    });

  test('pristine network with a full index: publish all, scan complete', async () => {
    const p = await plan(net(), fakeApi({}, [{ ok: true, blueprints: [], hasMore: false }]));
    expect(toPublish(p).map((b) => b.source.key)).toEqual(['bet', 'fee', 'authority']);
    expect(p.scan.complete).toBe(true);
    expect(needsUnverifiedAck(p)).toBe(false);
  });

  test('registry ids the node knows exist, even with a different source', async () => {
    const ids = { bet: 'b1', fee: 'f1', authority: 'a1' };
    const api = fakeApi({ b1: SOURCES[0]!.code, f1: 'old fee', a1: SOURCES[2]!.code }, NO_INDEX);
    const p = await plan(net({ blueprints: ids }), api);
    expect(p.blueprints.map((b) => b.status)).toEqual([
      { kind: 'exists', id: 'b1', via: 'registry', sourceMatches: true },
      { kind: 'exists', id: 'f1', via: 'registry', sourceMatches: false },
      { kind: 'exists', id: 'a1', via: 'registry', sourceMatches: true },
    ]);
    expect(p.blueprints[1]!.notes[0]).toMatch(/differs/);
    expect(needsUnverifiedAck(p)).toBe(false);
  });

  test('a registry id unknown to the node is noted and the blueprint published', async () => {
    const p = await plan(
      net({ blueprints: { bet: 'gone', fee: 'gone2', authority: 'gone3' } }),
      fakeApi({}, [{ ok: true, blueprints: [], hasMore: false }])
    );
    expect(toPublish(p)).toHaveLength(3);
    expect(p.blueprints[0]!.notes[0]).toMatch(/gone is unknown/);
  });

  test('finds a same-source on-chain blueprint across pages and skips different sources', async () => {
    const api = fakeApi({ x1: 'other bet', x2: SOURCES[0]!.code }, [
      { ok: true, blueprints: [{ id: 'x1', name: 'Bet' }], hasMore: true },
      { ok: true, blueprints: [{ id: 'x2', name: 'Bet' }], hasMore: false },
    ]);
    const p = await plan(net(), api);
    expect(p.blueprints[0]!.status).toEqual({ kind: 'exists', id: 'x2', via: 'on-chain index', sourceMatches: true });
    expect(api.calls).toContain('list x1');
    expect(toPublish(p).map((b) => b.source.key)).toEqual(['fee', 'authority']);
  });

  test('notes same-name blueprints whose source differs', async () => {
    const api = fakeApi({ y: 'old' }, [{ ok: true, blueprints: [{ id: 'y', name: 'FeeBlueprint' }], hasMore: false }]);
    const p = await plan(net(), api);
    expect(p.blueprints[1]!.status.kind).toBe('publish');
    expect(p.blueprints[1]!.notes[0]).toMatch(/1 on-chain FeeBlueprint/);
  });

  test("without an index, falls back to the publisher's history and flags the gap", async () => {
    const api = fakeApi({ mine: SOURCES[2]!.code }, NO_INDEX);
    const p = await plan(net(), api, ['mine']);
    expect(p.blueprints[2]!.status).toEqual({
      kind: 'exists',
      id: 'mine',
      via: 'publisher history',
      sourceMatches: true,
    });
    expect(p.scan.complete).toBe(false);
    expect(p.scan.detail).toMatch(/not initialized.*publisher's own history/);
    expect(needsUnverifiedAck(p)).toBe(true);
  });

  test('a capped scan counts as incomplete', async () => {
    const endless: OnChainPage[] = Array.from({ length: 5 }, (_, i) => ({
      ok: true,
      blueprints: [{ id: `z${i}`, name: 'Other' }],
      hasMore: true,
    }));
    const p = await computePlan({
      api: fakeApi({}, endless),
      network: net(),
      version: VERSION,
      sources: SOURCES,
      publisher: null,
      maxPages: 3,
    });
    expect(p.scan.complete).toBe(false);
  });

  test('the printed plan shows the node, sources, hashes and cost', async () => {
    const p = await plan(net(), fakeApi({}, NO_INDEX));
    p.blueprints[0]!.weight = 17.5;
    const text = formatPlan(p);
    expect(text).toContain('NEXT_TESTNET');
    expect(text).toContain("network 'testnet-juliet', node 0.72.0");
    expect(text).toContain(SOURCES[0]!.sha256);
    expect(text).toContain('0 HTR');
    expect(text).toContain('PoW weight 17.50');
    expect(text).toContain('3 blueprint(s) to publish.');
  });
});

describe('decideGate', () => {
  const base = {
    network: 'NEXT_TESTNET' as const,
    dryRun: false,
    isTTY: false,
    confirm: null,
    hasSeed: true,
    toPublish: 3,
    needsUnverifiedAck: false,
    allowUnverified: false,
  };

  test('dry run never sends', () => {
    expect(decideGate({ ...base, dryRun: true, confirm: 'NEXT_TESTNET' })).toEqual({ action: 'dry-run' });
  });

  test('non-TTY without --confirm refuses', () => {
    expect(decideGate(base)).toMatchObject({
      action: 'refuse',
      reason: expect.stringMatching(/--confirm NEXT_TESTNET/),
    });
  });

  test('--confirm must match the network exactly', () => {
    expect(decideGate({ ...base, confirm: 'NEXT_TESTNET' })).toEqual({ action: 'proceed' });
    expect(decideGate({ ...base, confirm: 'next_testnet' }).action).toBe('refuse');
    expect(decideGate({ ...base, confirm: 'TESTNET' }).action).toBe('refuse');
  });

  test('a TTY without --confirm prompts', () => {
    expect(decideGate({ ...base, isTTY: true })).toEqual({ action: 'prompt' });
    expect(promptAccepted(' NEXT_TESTNET\n', 'NEXT_TESTNET')).toBe(true);
    expect(promptAccepted('y', 'NEXT_TESTNET')).toBe(false);
    expect(promptAccepted(null, 'NEXT_TESTNET')).toBe(false);
  });

  test('mainnet is refused even with a matching --confirm or a dry run', () => {
    expect(decideGate({ ...base, network: 'MAINNET', confirm: 'MAINNET' }).action).toBe('refuse');
    expect(decideGate({ ...base, network: 'MAINNET', dryRun: true }).action).toBe('refuse');
  });

  test('an unverified duplicate check needs --allow-unverified', () => {
    const gap = { ...base, confirm: 'NEXT_TESTNET', needsUnverifiedAck: true };
    expect(decideGate(gap)).toMatchObject({ action: 'refuse', reason: expect.stringMatching(/--allow-unverified/) });
    expect(decideGate({ ...gap, allowUnverified: true })).toEqual({ action: 'proceed' });
  });

  test('a real run needs a seed; nothing to publish needs nothing', () => {
    expect(decideGate({ ...base, confirm: 'NEXT_TESTNET', hasSeed: false }).action).toBe('refuse');
    expect(decideGate({ ...base, toPublish: 0, hasSeed: false })).toEqual({ action: 'nothing-to-do' });
  });
});

describe('parseCliArgs and readSeed', () => {
  test('parses flags', () => {
    expect(parseCliArgs(['--network', 'NEXT_TESTNET', '--dry-run'])).toMatchObject({
      network: 'NEXT_TESTNET',
      dryRun: true,
      confirm: null,
      timeoutMinutes: 10,
    });
  });

  test('rejects seeds as arguments, unknown networks and a missing --network', () => {
    expect(() => parseCliArgs(['--network', 'NEXT_TESTNET', '--seed', 'a b c'])).toThrow(/not accepted as arguments/);
    expect(() => parseCliArgs(['--network', 'NEXT_TESTNET', '--seed=a'])).toThrow(/not accepted/);
    expect(() => parseCliArgs(['--network', 'DEVNET'])).toThrow(/Unknown network/);
    expect(() => parseCliArgs(['--dry-run'])).toThrow(/--network/);
  });

  test('reads the seed from a file or the env, normalizing whitespace', () => {
    expect(readSeed('/s', {}, () => ' a  b\nc \n')).toBe('a b c');
    expect(readSeed(null, { [SEED_ENV]: 'x y' })).toBe('x y');
    expect(readSeed(null, {})).toBeNull();
    expect(() => readSeed('/s', { [SEED_ENV]: 'x' }, () => 'y')).toThrow(/use one/);
    expect(() =>
      readSeed('/missing', {}, () => {
        throw new Error('ENOENT');
      })
    ).toThrow(PublisherError);
  });
});

describe('output helpers', () => {
  test('registry snippet', () => {
    expect(registrySnippet({ bet: 'b', fee: 'f', authority: 'a' })).toBe(
      "    blueprints: {\n      bet: 'b',\n      fee: 'f',\n      authority: 'a',\n    },"
    );
  });

  test('restricted-network errors become a clear message', () => {
    const e = new Error('full validation failed: nc_pubkey with address WX is not allowed');
    expect(describePublishError(e, 'WX')).toMatch(/restricted on this network: WX.*ALLOWED_ADDRESSES/);
    expect(describePublishError(new Error('boom'), 'WX')).toBe('boom');
  });

  test('formats HTR base units', () => {
    expect(formatHtr('0')).toBe('0.00 HTR');
    expect(formatHtr('12345')).toBe('123.45 HTR');
  });
});
