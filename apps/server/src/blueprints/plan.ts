/**
 * Decides, per QA blueprint, whether the target network already has it, and
 * renders the plan the CLI prints before asking for confirmation.
 */

import type { BlueprintIds, NetworkDefinition } from '@qa-helper/shared/networks';
import type { FullnodeApi, FullnodeVersion, OnChainBlueprintItem } from './fullnode.ts';
import { PublisherError, RefusedError, sha256, type BlueprintKey, type BlueprintSource } from './sources.ts';

/** Expected `/version` network names for each wallet-lib network name. */
export function networkNameMatches(libName: NetworkDefinition['libName'], reported: string): boolean {
  switch (libName) {
    case 'mainnet':
      return reported === 'mainnet';
    case 'testnet':
      // testnet-india, testnet-shielded-outputs, ...
      return reported.startsWith('testnet');
    case 'privatenet':
      return reported === 'privatenet';
  }
}

/** Throws unless the node is a non-mainnet nano-enabled node of the registry's network. */
export function checkNetwork(def: NetworkDefinition, version: FullnodeVersion): void {
  if (def.key === 'MAINNET' || version.network === 'mainnet') {
    throw new RefusedError('Refusing to publish on mainnet.');
  }
  if (!networkNameMatches(def.libName, version.network)) {
    throw new PublisherError(
      `Network mismatch: ${def.key} is registered as '${def.libName}', but ${def.fullNodeUrl} reports '${version.network}'. ` +
        'Fix the registry entry or the URL before publishing.'
    );
  }
  if (version.nano_contracts_enabled === false) {
    throw new PublisherError(`${def.fullNodeUrl} reports nano_contracts_enabled=false; blueprints can't be published.`);
  }
}

export interface PublisherInfo {
  address: string;
  /** HTR, in base units (decimal string). */
  htrBalance: string;
  /** On-chain blueprint txs in the publisher wallet's history. */
  ocbTxIds: string[];
}

export type BlueprintStatus =
  | {
      kind: 'exists';
      id: string;
      via: 'registry' | 'on-chain index' | 'publisher history';
      /** Registry ids are trusted even when the deployed source differs from the local file. */
      sourceMatches: boolean;
    }
  | { kind: 'publish' };

export interface BlueprintPlan {
  source: BlueprintSource;
  status: BlueprintStatus;
  notes: string[];
  /** PoW weight of the would-be tx; set when a publisher wallet could build it. */
  weight?: number;
}

export interface Plan {
  network: NetworkDefinition;
  version: FullnodeVersion;
  publisher: PublisherInfo | null;
  /** Whether every on-chain blueprint was compared, so a duplicate can be ruled out. */
  scan: { complete: boolean; detail: string };
  blueprints: BlueprintPlan[];
}

export const SCAN_PAGE_SIZE = 100;
export const SCAN_MAX_PAGES = 50;

type Scan = { ok: true; byName: Map<string, OnChainBlueprintItem[]>; total: number } | { ok: false; reason: string };

async function scanOnChain(api: FullnodeApi, names: Set<string>, maxPages: number): Promise<Scan> {
  const byName = new Map<string, OnChainBlueprintItem[]>();
  let after: string | null = null;
  let total = 0;
  for (let page = 0; page < maxPages; page++) {
    const res = await api.onChainBlueprints(after, SCAN_PAGE_SIZE);
    if (!res.ok) return { ok: false, reason: res.reason };
    for (const bp of res.blueprints) {
      total++;
      if (names.has(bp.name)) byName.set(bp.name, [...(byName.get(bp.name) ?? []), bp]);
    }
    if (!res.hasMore || res.blueprints.length === 0) return { ok: true, byName, total };
    after = res.blueprints[res.blueprints.length - 1]!.id;
  }
  return { ok: false, reason: `more than ${maxPages * SCAN_PAGE_SIZE} on-chain blueprints; stopped scanning` };
}

export async function computePlan(args: {
  api: FullnodeApi;
  network: NetworkDefinition;
  version: FullnodeVersion;
  sources: BlueprintSource[];
  publisher: PublisherInfo | null;
  maxPages?: number;
}): Promise<Plan> {
  const { api, network, version, sources, publisher } = args;
  const sourceCache = new Map<string, Promise<string | null>>();
  const sourceOf = (id: string) => {
    if (!sourceCache.has(id)) sourceCache.set(id, api.blueprintSource(id));
    return sourceCache.get(id)!;
  };
  const matches = async (id: string, src: BlueprintSource) => {
    const remote = await sourceOf(id);
    return remote !== null && sha256(remote) === src.sha256;
  };

  const scan = await scanOnChain(api, new Set(sources.map((s) => s.className)), args.maxPages ?? SCAN_MAX_PAGES);

  const blueprints: BlueprintPlan[] = [];
  for (const source of sources) {
    const notes: string[] = [];
    const plan = (status: BlueprintStatus) => blueprints.push({ source, status, notes });

    const registryId = network.blueprints?.[source.key];
    if (registryId) {
      if (await api.blueprintExists(registryId)) {
        const sourceMatches = await matches(registryId, source);
        if (!sourceMatches) notes.push(`deployed source differs from ${source.key}.py (kept: the registry id wins)`);
        plan({ kind: 'exists', id: registryId, via: 'registry', sourceMatches });
        continue;
      }
      notes.push(`registry id ${registryId} is unknown to this fullnode`);
    }

    let found: string | null = null;
    if (scan.ok) {
      const sameName = scan.byName.get(source.className) ?? [];
      for (const bp of sameName) {
        if (await matches(bp.id, source)) {
          found = bp.id;
          break;
        }
      }
      if (found) {
        plan({ kind: 'exists', id: found, via: 'on-chain index', sourceMatches: true });
        continue;
      }
      if (sameName.length) {
        notes.push(`${sameName.length} on-chain ${source.className} blueprint(s) with a different source`);
      }
    }

    for (const id of publisher?.ocbTxIds ?? []) {
      if (await matches(id, source)) {
        found = id;
        break;
      }
    }
    if (found) {
      plan({ kind: 'exists', id: found, via: 'publisher history', sourceMatches: true });
      continue;
    }
    plan({ kind: 'publish' });
  }

  const scanSummary = scan.ok
    ? { complete: true, detail: `compared against all ${scan.total} on-chain blueprint(s)` }
    : {
        complete: false,
        detail:
          `could not list on-chain blueprints (${scan.reason}); ` +
          (publisher
            ? "only the registry and the publisher's own history were checked"
            : 'only the registry was checked'),
      };

  return { network, version, publisher, scan: scanSummary, blueprints };
}

export const toPublish = (plan: Plan) => plan.blueprints.filter((b) => b.status.kind === 'publish');

/** A publish can't be proven duplicate-free when the scan was partial. */
export const needsUnverifiedAck = (plan: Plan) => !plan.scan.complete && toPublish(plan).length > 0;

export function formatHtr(baseUnits: string, decimals = 2): string {
  const n = BigInt(baseUnits);
  const neg = n < 0n;
  const abs = neg ? -n : n;
  const scale = 10n ** BigInt(decimals);
  const frac = (abs % scale).toString().padStart(decimals, '0');
  return `${neg ? '-' : ''}${abs / scale}.${frac} HTR`;
}

export function formatPlan(plan: Plan): string {
  const { network, version, publisher } = plan;
  const lines = [
    `Blueprint publish plan`,
    `  Network      ${network.key} (${network.label}), registry libName '${network.libName}'`,
    `  Fullnode     ${network.fullNodeUrl}`,
    `  /version     network '${version.network}', node ${version.version}, nano ${version.nano_contracts_enabled ? 'enabled' : 'unknown'}`,
    `  Tx mining    ${network.txMiningUrl}`,
    publisher
      ? `  Publisher    ${publisher.address} (address 0), balance ${formatHtr(publisher.htrBalance)}`
      : `  Publisher    none (no seed given: dry-run only)`,
    `  Dup. check   ${plan.scan.detail}`,
    '',
  ];
  for (const b of plan.blueprints) {
    const head = `  ${b.source.key.padEnd(9)} ${b.source.className}`;
    if (b.status.kind === 'exists') {
      lines.push(`${head}: EXISTS ${b.status.id} (via ${b.status.via})`);
    } else {
      lines.push(`${head}: WILL PUBLISH`);
      lines.push(`             source  ${b.source.path}`);
      lines.push(`             sha256  ${b.source.sha256}`);
      lines.push(
        `             cost    0 HTR (no inputs, outputs, fee or deposit), PoW weight ${b.weight?.toFixed(2) ?? 'n/a without a seed'}`
      );
    }
    for (const note of b.notes) lines.push(`             note    ${note}`);
  }
  const n = toPublish(plan).length;
  lines.push('', n ? `${n} blueprint(s) to publish.` : 'Nothing to publish: every blueprint exists.');
  if (n) {
    lines.push(
      'Note: hathor-core can restrict on-chain blueprints to allowed addresses (NC_ON_CHAIN_BLUEPRINT_RESTRICTED);',
      '      /version does not expose it. A restricted network rejects the first publish, and nothing else is sent.'
    );
  }
  return lines.join('\n');
}

export function registrySnippet(ids: BlueprintIds): string {
  const keys: BlueprintKey[] = ['bet', 'fee', 'authority'];
  return ['    blueprints: {', ...keys.map((k) => `      ${k}: '${ids[k]}',`), '    },'].join('\n');
}

/** Maps a failed publish to a clear message when the network restricts on-chain blueprints. */
export function describePublishError(error: unknown, address: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/OCBPubKeyNotAllowed|nc_pubkey.*not allowed/i.test(msg)) {
    return (
      `On-chain blueprints are restricted on this network: ${address} is not in its ` +
      `NC_ON_CHAIN_BLUEPRINT_ALLOWED_ADDRESSES. Ask the network operator to allow it, or use a seed whose ` +
      `address 0 is allowed. (fullnode: ${msg})`
    );
  }
  return msg;
}
