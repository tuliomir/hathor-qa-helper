/**
 * Tests for stageRoutes route mapping utilities
 */

import { describe, expect, test } from 'bun:test';
import {
	DEFAULT_STAGE_URL,
	getGroupIdFromSlug,
	getStageIdFromSlugs,
	getStageUrl,
	GROUP_SLUG_MAP,
	STAGE_SLUG_MAP,
} from '../src/config/stageRoutes';
import { STAGE_GROUPS } from '../src/types/stage';

describe('stageRoutes', () => {
  describe('coverage', () => {
    test('all groups have a slug mapping', () => {
      for (const group of STAGE_GROUPS) {
        expect(GROUP_SLUG_MAP[group.id]).toBeDefined();
      }
    });

    test('all stages have a slug mapping', () => {
      for (const group of STAGE_GROUPS) {
        for (const stage of group.stages) {
          expect(STAGE_SLUG_MAP[stage.id]).toBeDefined();
        }
      }
    });

    test('all 22 stages are covered', () => {
      const totalStages = STAGE_GROUPS.reduce(
        (sum, group) => sum + group.stages.length,
        0,
      );
      expect(totalStages).toBe(22);
      expect(Object.keys(STAGE_SLUG_MAP)).toHaveLength(22);
    });
  });

  describe('getStageUrl', () => {
    test('builds correct URL for main-qa stages', () => {
      expect(getStageUrl('wallet-initialization')).toBe('/tools/main/wallet-initialization');
      expect(getStageUrl('address-validation')).toBe('/tools/main/address-validation');
      expect(getStageUrl('custom-tokens')).toBe('/tools/main/custom-tokens');
    });

    test('builds correct URL for rpc stages', () => {
      expect(getStageUrl('rpc-connection')).toBe('/tools/rpc/connection');
      expect(getStageUrl('rpc-get-balance')).toBe('/tools/rpc/get-balance');
      expect(getStageUrl('rpc-raw-editor')).toBe('/tools/rpc/raw-editor');
    });

    test('builds correct URL for bet-nano-contracts stages', () => {
      expect(getStageUrl('rpc-bet-initialize')).toBe('/tools/bet-nc/initialize');
      expect(getStageUrl('rpc-bet-deposit')).toBe('/tools/bet-nc/deposit');
      expect(getStageUrl('rpc-set-bet-result')).toBe('/tools/bet-nc/set-result');
      expect(getStageUrl('rpc-bet-withdraw')).toBe('/tools/bet-nc/withdraw');
    });

    test('builds correct URL for push-notifications', () => {
      expect(getStageUrl('push-notifications')).toBe('/tools/notifications/push');
    });

    test('builds correct URL for auditing stages', () => {
      expect(getStageUrl('transaction-history')).toBe('/tools/auditing/transaction-history');
      expect(getStageUrl('tx-update-events')).toBe('/tools/auditing/tx-update-events');
      expect(getStageUrl('test-wallet-cleanup')).toBe('/tools/auditing/test-wallet-cleanup');
    });

    test('builds correct URL for multisig stages', () => {
      expect(getStageUrl('multisig-wallet-management')).toBe('/tools/multisig/wallet-management');
    });
  });

  describe('getStageIdFromSlugs', () => {
    test('resolves valid slugs to StageId', () => {
      expect(getStageIdFromSlugs('main', 'wallet-initialization')).toBe('wallet-initialization');
      expect(getStageIdFromSlugs('rpc', 'connection')).toBe('rpc-connection');
      expect(getStageIdFromSlugs('bet-nc', 'initialize')).toBe('rpc-bet-initialize');
      expect(getStageIdFromSlugs('notifications', 'push')).toBe('push-notifications');
      expect(getStageIdFromSlugs('auditing', 'transaction-history')).toBe('transaction-history');
      expect(getStageIdFromSlugs('multisig', 'wallet-management')).toBe('multisig-wallet-management');
    });

    test('returns null for invalid group slug', () => {
      expect(getStageIdFromSlugs('invalid', 'wallet-initialization')).toBeNull();
    });

    test('returns null for invalid stage slug', () => {
      expect(getStageIdFromSlugs('main', 'nonexistent')).toBeNull();
    });

    test('returns null for mismatched group/stage combination', () => {
      expect(getStageIdFromSlugs('main', 'connection')).toBeNull();
      expect(getStageIdFromSlugs('rpc', 'wallet-initialization')).toBeNull();
    });
  });

  describe('getGroupIdFromSlug', () => {
    test('resolves valid group slugs', () => {
      expect(getGroupIdFromSlug('main')).toBe('main-qa');
      expect(getGroupIdFromSlug('rpc')).toBe('rpc');
      expect(getGroupIdFromSlug('bet-nc')).toBe('bet-nano-contracts');
      expect(getGroupIdFromSlug('notifications')).toBe('push-notifications');
      expect(getGroupIdFromSlug('auditing')).toBe('auditing');
      expect(getGroupIdFromSlug('multisig')).toBe('multisig');
    });

    test('returns null for invalid slug', () => {
      expect(getGroupIdFromSlug('invalid')).toBeNull();
    });
  });

  describe('round-trip', () => {
    test('every stage survives url → slug → stageId round-trip', () => {
      for (const group of STAGE_GROUPS) {
        for (const stage of group.stages) {
          const url = getStageUrl(stage.id);
          // Extract slugs from URL: /tools/{groupSlug}/{stageSlug}
          const parts = url.split('/');
          const groupSlug = parts[2];
          const stageSlug = parts[3];
          const resolved = getStageIdFromSlugs(groupSlug, stageSlug);
          expect(resolved).toBe(stage.id);
        }
      }
    });
  });

  describe('DEFAULT_STAGE_URL', () => {
    test('points to wallet-initialization', () => {
      expect(DEFAULT_STAGE_URL).toBe('/tools/main/wallet-initialization');
    });
  });
});
