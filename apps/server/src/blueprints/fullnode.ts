/** The read-only fullnode endpoints the publisher plans with. */

export interface FullnodeVersion {
  version: string;
  network: string;
  nano_contracts_enabled?: boolean;
}

export interface OnChainBlueprintItem {
  id: string;
  name: string;
}

export type OnChainPage =
  | { ok: true; blueprints: OnChainBlueprintItem[]; hasMore: boolean }
  /** e.g. 503 "Blueprint index not initialized": the node has no blueprint index. */
  | { ok: false; reason: string };

export interface TxStatus {
  found: boolean;
  firstBlock: string | null;
  voided: boolean;
  timestamp: number | null;
}

export interface FullnodeApi {
  version(): Promise<FullnodeVersion>;
  /** `true` when the fullnode knows the blueprint, `false` on 404. Throws otherwise. */
  blueprintExists(id: string): Promise<boolean>;
  /** The blueprint's Python source, or null on 404. */
  blueprintSource(id: string): Promise<string | null>;
  /** Oldest first; `after` is the last id of the previous page. */
  onChainBlueprints(after: string | null, count: number): Promise<OnChainPage>;
  tx(id: string): Promise<TxStatus>;
}

export function createFullnodeApi(baseUrl: string, fetchFn: typeof fetch = fetch): FullnodeApi {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  async function get(path: string, params: Record<string, string | number> = {}) {
    const url = new URL(path, base);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    let res: Response;
    try {
      res = await fetchFn(url, { signal: AbortSignal.timeout(30_000) });
    } catch (e) {
      throw new Error(`GET ${url} failed: ${(e as Error).message}`);
    }
    const text = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      // Non-JSON (proxy error pages): reported below with the status.
    }
    return { url, status: res.status, body: body as Record<string, unknown> | null, text };
  }

  function fail(r: { url: URL; status: number; text: string }): never {
    throw new Error(`GET ${r.url} → HTTP ${r.status}: ${r.text.slice(0, 200)}`);
  }

  return {
    async version() {
      const r = await get('version');
      if (r.status !== 200 || typeof r.body?.network !== 'string') fail(r);
      return r.body as unknown as FullnodeVersion;
    },

    async blueprintExists(id) {
      const r = await get('nano_contract/blueprint/info', { blueprint_id: id });
      if (r.status === 404) return false;
      if (r.status !== 200) fail(r);
      return true;
    },

    async blueprintSource(id) {
      const r = await get('nano_contract/blueprint/source', { blueprint_id: id });
      if (r.status === 404) return null;
      if (r.status !== 200 || typeof r.body?.source_code !== 'string') fail(r);
      return r.body.source_code as string;
    },

    async onChainBlueprints(after, count) {
      const params: Record<string, string | number> = { count, order: 'asc' };
      if (after) params.after = after;
      const r = await get('nano_contract/blueprint/on_chain', params);
      if (r.status === 200 && r.body?.success === true) {
        return {
          ok: true,
          blueprints: r.body.blueprints as OnChainBlueprintItem[],
          hasMore: r.body.has_more === true,
        };
      }
      const reason = typeof r.body?.error === 'string' ? r.body.error : r.text.slice(0, 200);
      return { ok: false, reason: `HTTP ${r.status}: ${reason}` };
    },

    async tx(id) {
      const r = await get('transaction', { id });
      if (r.status !== 200) fail(r);
      if (r.body?.success !== true) return { found: false, firstBlock: null, voided: false, timestamp: null };
      const meta = (r.body.meta ?? {}) as { first_block?: string | null; voided_by?: string[] };
      const tx = (r.body.tx ?? {}) as { timestamp?: number };
      return {
        found: true,
        firstBlock: meta.first_block ?? null,
        voided: (meta.voided_by ?? []).length > 0,
        timestamp: tx.timestamp ?? null,
      };
    },
  };
}
