/**
 * Tests for command-palette stage search and ranking.
 */

import { describe, expect, test } from 'bun:test';
import { pushRecentStage, searchStages } from '../src/utils/stageSearch';

const ids = (query: string) => searchStages(query).map((r) => r.stage.id);

describe('searchStages', () => {
  test('an empty query returns nothing', () => {
    expect(searchStages('')).toEqual([]);
    expect(searchStages('   ')).toEqual([]);
  });

  test('a method name finds both Get balance stages, with their family', () => {
    const results = searchStages('htr_getBalance');
    expect(
      results
        .slice(0, 2)
        .map((r) => r.stage.id)
        .sort()
    ).toEqual(['rpc-get-balance', 'snap-get-balance']);
    expect(
      results
        .slice(0, 2)
        .map((r) => r.family.chip)
        .sort()
    ).toEqual(['RPC', 'Snap']);
  });

  test('method search is case-insensitive', () => {
    expect(ids('HTR_GETXPUB')[0]).toBe('snap-get-xpub');
  });

  test('a title query ranks exact titles first', () => {
    expect(ids('get balance').slice(0, 2).sort()).toEqual(['rpc-get-balance', 'snap-get-balance']);
  });

  test('a family word narrows the match', () => {
    expect(ids('snap balance')[0]).toBe('snap-get-balance');
    expect(ids('rpc balance')[0]).toBe('rpc-get-balance');
  });

  test('a title prefix beats a match in the description', () => {
    expect(ids('cleanup')[0]).toBe('test-wallet-cleanup');
    expect(ids('wallet init')[0]).toBe('wallet-initialization');
  });

  test('group names match', () => {
    const results = ids('fee nano');
    expect(results).toContain('rpc-fee-initialize');
    expect(results).toContain('snap-fee-initialize');
  });

  test('loose subsequences still match titles', () => {
    expect(ids('xpb')).toContain('snap-get-xpub');
  });

  test('every word must match somewhere', () => {
    expect(ids('balance zzzz')).toEqual([]);
  });

  test('nonsense returns nothing', () => {
    expect(ids('qqqqqq')).toEqual([]);
  });

  test('ties keep the navigation order', () => {
    const results = ids('get utxos');
    expect(results.indexOf('rpc-get-utxos')).toBeLessThan(results.indexOf('snap-get-utxos'));
  });
});

describe('pushRecentStage', () => {
  test('puts the stage first without duplicates', () => {
    expect(pushRecentStage(['rpc-get-balance', 'snap-connection'], 'snap-connection')).toEqual([
      'snap-connection',
      'rpc-get-balance',
    ]);
  });

  test('keeps at most five', () => {
    const list = pushRecentStage(
      ['rpc-get-balance', 'snap-connection', 'rpc-connection', 'custom-tokens', 'address-validation'],
      'wallet-initialization'
    );
    expect(list).toHaveLength(5);
    expect(list[0]).toBe('wallet-initialization');
    expect(list).not.toContain('address-validation');
  });
});
