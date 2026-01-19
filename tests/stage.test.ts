/**
 * Smoke tests for stage types and constants
 * Tests stage configuration, groups, and helper functions
 */

import { describe, expect, test } from 'bun:test';
import { getGroupForStage, type Stage, STAGE_GROUPS, type StageGroup, type StageId, STAGES, } from '../src/types/stage';

describe('stage types', () => {
  describe('STAGE_GROUPS', () => {
    test('is defined and non-empty', () => {
      expect(STAGE_GROUPS).toBeDefined();
      expect(Array.isArray(STAGE_GROUPS)).toBe(true);
      expect(STAGE_GROUPS.length).toBeGreaterThan(0);
    });

    test('contains main-qa group', () => {
      const mainQA = STAGE_GROUPS.find((g) => g.id === 'main-qa');
      expect(mainQA).toBeDefined();
      expect(mainQA!.title).toBe('Main QA');
    });

    test('contains rpc group', () => {
      const rpc = STAGE_GROUPS.find((g) => g.id === 'rpc');
      expect(rpc).toBeDefined();
      expect(rpc!.title).toBe('RPC Requests');
    });

    test('contains bet-nano-contracts group', () => {
      const bet = STAGE_GROUPS.find((g) => g.id === 'bet-nano-contracts');
      expect(bet).toBeDefined();
      expect(bet!.title).toBe('Bet Nano Contract');
    });

    test('contains auditing group', () => {
      const auditing = STAGE_GROUPS.find((g) => g.id === 'auditing');
      expect(auditing).toBeDefined();
      expect(auditing!.title).toBe('Auditing');
    });

    test('contains multisig group', () => {
      const multisig = STAGE_GROUPS.find((g) => g.id === 'multisig');
      expect(multisig).toBeDefined();
      expect(multisig!.title).toBe('MultiSig');
    });

    test('all groups have required properties', () => {
      STAGE_GROUPS.forEach((group: StageGroup) => {
        expect(group.id).toBeDefined();
        expect(group.title).toBeDefined();
        expect(Array.isArray(group.stages)).toBe(true);
        expect(group.stages.length).toBeGreaterThan(0);
      });
    });

    test('all stages in groups have required properties', () => {
      STAGE_GROUPS.forEach((group: StageGroup) => {
        group.stages.forEach((stage: Stage) => {
          expect(stage.id).toBeDefined();
          expect(stage.title).toBeDefined();
          expect(stage.description).toBeDefined();
          expect(typeof stage.id).toBe('string');
          expect(typeof stage.title).toBe('string');
          expect(typeof stage.description).toBe('string');
        });
      });
    });
  });

  describe('STAGES', () => {
    test('is defined and non-empty', () => {
      expect(STAGES).toBeDefined();
      expect(Array.isArray(STAGES)).toBe(true);
      expect(STAGES.length).toBeGreaterThan(0);
    });

    test('contains stages and separators', () => {
      const separators = STAGES.filter((item) => 'type' in item && item.type === 'separator');
      const stages = STAGES.filter((item) => 'id' in item && !('type' in item));

      expect(separators.length).toBeGreaterThan(0);
      expect(stages.length).toBeGreaterThan(0);
    });

    test('has separator for each group', () => {
      const separators = STAGES.filter((item) => 'type' in item && item.type === 'separator');
      expect(separators.length).toBe(STAGE_GROUPS.length);
    });
  });

  describe('getGroupForStage', () => {
    test('returns correct group for wallet-initialization', () => {
      const group = getGroupForStage('wallet-initialization');
      expect(group).toBe('main-qa');
    });

    test('returns correct group for rpc-connection', () => {
      const group = getGroupForStage('rpc-connection');
      expect(group).toBe('rpc');
    });

    test('returns correct group for rpc-get-balance', () => {
      const group = getGroupForStage('rpc-get-balance');
      expect(group).toBe('rpc');
    });

    test('returns correct group for rpc-bet-initialize', () => {
      const group = getGroupForStage('rpc-bet-initialize');
      expect(group).toBe('bet-nano-contracts');
    });

    test('returns correct group for transaction-history', () => {
      const group = getGroupForStage('transaction-history');
      expect(group).toBe('auditing');
    });

    test('returns correct group for multisig-wallet-management', () => {
      const group = getGroupForStage('multisig-wallet-management');
      expect(group).toBe('multisig');
    });

    test('returns null for invalid stage id', () => {
      const group = getGroupForStage('invalid-stage' as StageId);
      expect(group).toBeNull();
    });

    test('can find group for all defined stages', () => {
      const allStageIds: StageId[] = STAGE_GROUPS.flatMap((g) => g.stages.map((s) => s.id));

      allStageIds.forEach((stageId) => {
        const group = getGroupForStage(stageId);
        expect(group).not.toBeNull();
      });
    });
  });

  describe('stage id uniqueness', () => {
    test('all stage ids are unique', () => {
      const allStageIds = STAGE_GROUPS.flatMap((g) => g.stages.map((s) => s.id));
      const uniqueIds = new Set(allStageIds);

      expect(uniqueIds.size).toBe(allStageIds.length);
    });
  });

  describe('group id uniqueness', () => {
    test('all group ids are unique', () => {
      const groupIds = STAGE_GROUPS.map((g) => g.id);
      const uniqueIds = new Set(groupIds);

      expect(uniqueIds.size).toBe(groupIds.length);
    });
  });

  describe('specific stages exist', () => {
    const expectedStages: StageId[] = [
      'wallet-initialization',
      'address-validation',
      'custom-tokens',
      'rpc-connection',
      'rpc-get-balance',
      'rpc-send-transaction',
      'rpc-create-token',
      'rpc-bet-initialize',
      'transaction-history',
      'multisig-wallet-management',
    ];

    expectedStages.forEach((stageId) => {
      test(`stage "${stageId}" exists`, () => {
        const found = STAGE_GROUPS.some((g) => g.stages.some((s) => s.id === stageId));
        expect(found).toBe(true);
      });
    });
  });
});
