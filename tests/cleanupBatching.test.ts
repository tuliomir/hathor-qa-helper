/**
 * Tests for cleanup batching fallback logic
 *
 * When a unified cleanup transaction fails (e.g., tx too large),
 * the tokens should be split into smaller batches and retried.
 */

import { describe, expect, test } from 'bun:test';
import { splitIntoBatches } from '../src/utils/cleanupBatching';
import type { CleanupToken, ReturnToken } from '../src/services/cleanupTemplateBuilder';

const makeToken = (uid: string, balance = 100n, meltable = 100): CleanupToken => ({
  uid,
  balance,
  meltableAmount: meltable,
});

const makeReturnToken = (uid: string, amount = 50, addr = 'WAddr1'): ReturnToken => ({
  uid,
  amount,
  recipientAddress: addr,
});

describe('splitIntoBatches', () => {
  test('returns single batch when total tokens fit', () => {
    const melt = [makeToken('a'), makeToken('b')];
    const swap = [makeToken('c')];
    const ret: ReturnToken[] = [];

    const batches = splitIntoBatches(melt, swap, ret, 15);
    expect(batches).toHaveLength(1);
    expect(batches[0].tokensToMelt).toEqual(melt);
    expect(batches[0].swapTokens).toEqual(swap);
    expect(batches[0].returnTokens).toEqual(ret);
    // Only the last batch should include HTR transfer
    expect(batches[0].includeHtr).toBe(true);
  });

  test('splits into two batches when tokens exceed limit', () => {
    const melt = Array.from({ length: 10 }, (_, i) => makeToken(`melt-${i}`));
    const swap = Array.from({ length: 8 }, (_, i) => makeToken(`swap-${i}`));
    const ret: ReturnToken[] = [];

    // 18 tokens total, limit 10 → 2 batches
    const batches = splitIntoBatches(melt, swap, ret, 10);
    expect(batches.length).toBe(2);

    // Total tokens across batches equals input
    const totalMelt = batches.reduce((s, b) => s + b.tokensToMelt.length, 0);
    const totalSwap = batches.reduce((s, b) => s + b.swapTokens.length, 0);
    expect(totalMelt).toBe(10);
    expect(totalSwap).toBe(8);
  });

  test('only the last batch includes HTR', () => {
    const melt = Array.from({ length: 20 }, (_, i) => makeToken(`m-${i}`));
    const batches = splitIntoBatches(melt, [], [], 10);
    expect(batches.length).toBe(2);
    expect(batches[0].includeHtr).toBe(false);
    expect(batches[1].includeHtr).toBe(true);
  });

  test('handles empty token lists', () => {
    const batches = splitIntoBatches([], [], [], 10);
    // Even with no tokens, we get one batch (for HTR transfer)
    expect(batches).toHaveLength(1);
    expect(batches[0].includeHtr).toBe(true);
  });

  test('return tokens are included in batching count', () => {
    const melt = Array.from({ length: 5 }, (_, i) => makeToken(`m-${i}`));
    const swap = Array.from({ length: 5 }, (_, i) => makeToken(`s-${i}`));
    const ret = Array.from({ length: 5 }, (_, i) => makeReturnToken(`r-${i}`));

    // 15 total, limit 10 → 2 batches
    const batches = splitIntoBatches(melt, swap, ret, 10);
    expect(batches.length).toBe(2);

    const totalRet = batches.reduce((s, b) => s + b.returnTokens.length, 0);
    expect(totalRet).toBe(5);
  });

  test('preserves order: melt first, then swap, then return', () => {
    const melt = Array.from({ length: 3 }, (_, i) => makeToken(`m-${i}`));
    const swap = Array.from({ length: 3 }, (_, i) => makeToken(`s-${i}`));
    const ret = Array.from({ length: 3 }, (_, i) => makeReturnToken(`r-${i}`));

    const batches = splitIntoBatches(melt, swap, ret, 5);
    // First batch should have all 3 melt + 2 swap (fills up to 5)
    expect(batches[0].tokensToMelt.length).toBe(3);
    expect(batches[0].swapTokens.length).toBe(2);
    expect(batches[0].returnTokens.length).toBe(0);
  });

  test('default maxTokensPerBatch is 15', () => {
    const melt = Array.from({ length: 20 }, (_, i) => makeToken(`m-${i}`));
    const batches = splitIntoBatches(melt, [], []);
    expect(batches.length).toBe(2);
    expect(batches[0].tokensToMelt.length).toBe(15);
    expect(batches[1].tokensToMelt.length).toBe(5);
  });
});
