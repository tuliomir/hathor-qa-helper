/**
 * Bidirectional mapping between StageId/GroupId and URL slugs.
 *
 * The URL is the single source of truth for which stage is active.
 * Pattern: /tools/{groupSlug}/{stageSlug}
 */

import type { GroupId, StageId } from '../types/stage';
import { getGroupForStage, STAGE_GROUPS } from '../types/stage';

// ─── Group slugs ─────────────────────────────────────────────────────────────

export const GROUP_SLUG_MAP: Record<GroupId, string> = {
  'main-qa': 'main',
  'rpc': 'rpc',
  'bet-nano-contracts': 'bet-nc',
  'push-notifications': 'notifications',
  'auditing': 'auditing',
  'multisig': 'multisig',
};

// ─── Stage slugs (group prefix stripped where redundant) ─────────────────────

export const STAGE_SLUG_MAP: Record<StageId, string> = {
  // Main QA
  'wallet-initialization': 'wallet-initialization',
  'address-validation': 'address-validation',
  'custom-tokens': 'custom-tokens',
  // RPC
  'rpc-connection': 'connection',
  'rpc-basic-info': 'basic-info',
  'rpc-get-address': 'get-address',
  'rpc-get-balance': 'get-balance',
  'rpc-get-utxos': 'get-utxos',
  'rpc-sign-with-address': 'sign-with-address',
  'rpc-create-token': 'create-token',
  'rpc-send-transaction': 'send-transaction',
  'rpc-sign-oracle-data': 'sign-oracle-data',
  'rpc-raw-editor': 'raw-editor',
  // Bet Nano Contract
  'rpc-bet-initialize': 'initialize',
  'rpc-bet-deposit': 'deposit',
  'rpc-set-bet-result': 'set-result',
  'rpc-bet-withdraw': 'withdraw',
  // Push Notifications
  'push-notifications': 'push',
  // Auditing
  'transaction-history': 'transaction-history',
  'tx-update-events': 'tx-update-events',
  'test-wallet-cleanup': 'test-wallet-cleanup',
  // MultiSig
  'multisig-wallet-management': 'wallet-management',
};

// ─── Reverse lookup maps (built once at module load) ─────────────────────────

const REVERSE_GROUP_SLUG: Record<string, GroupId> = Object.fromEntries(
  Object.entries(GROUP_SLUG_MAP).map(([id, slug]) => [slug, id as GroupId]),
) as Record<string, GroupId>;

const REVERSE_STAGE_SLUG: Map<string, Map<string, StageId>> = new Map();

// Build: groupSlug → (stageSlug → StageId)
for (const group of STAGE_GROUPS) {
  const groupSlug = GROUP_SLUG_MAP[group.id];
  const stageMap = new Map<string, StageId>();

  for (const stage of group.stages) {
    stageMap.set(STAGE_SLUG_MAP[stage.id], stage.id);
  }

  REVERSE_STAGE_SLUG.set(groupSlug, stageMap);
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

export const DEFAULT_STAGE_URL = '/tools/main/wallet-initialization';

/** Build the full URL path for a given stage. */
export function getStageUrl(stageId: StageId): string {
  const groupId = getGroupForStage(stageId);
  if (!groupId) return DEFAULT_STAGE_URL;

  return `/tools/${GROUP_SLUG_MAP[groupId]}/${STAGE_SLUG_MAP[stageId]}`;
}

/** Resolve a pair of URL slugs back to a StageId (or null if invalid). */
export function getStageIdFromSlugs(
  groupSlug: string,
  stageSlug: string,
): StageId | null {
  const stageMap = REVERSE_STAGE_SLUG.get(groupSlug);
  return stageMap?.get(stageSlug) ?? null;
}

/** Resolve a group URL slug back to a GroupId (or null if invalid). */
export function getGroupIdFromSlug(groupSlug: string): GroupId | null {
  return REVERSE_GROUP_SLUG[groupSlug] ?? null;
}
