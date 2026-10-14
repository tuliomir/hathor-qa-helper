/**
 * Test Wallet Cleanup runs one action at a time: while a refresh, a
 * retrieve or the cleanup itself is in flight, the other actions are
 * disabled with a reason.
 */

import { describe, expect, test } from 'bun:test';
import { cleanupBusyReason } from '../src/utils/cleanupGating';

const idle = { isExecuting: false, isRetrieving: false, isRefreshing: false };

describe('cleanupBusyReason', () => {
  test('is null when nothing is running', () => {
    expect(cleanupBusyReason(idle)).toBeNull();
  });

  test('blocks everything while the cleanup executes', () => {
    expect(cleanupBusyReason({ ...idle, isExecuting: true })).toBe('Cleanup in progress…');
  });

  test('blocks everything while tokens are retrieved', () => {
    expect(cleanupBusyReason({ ...idle, isRetrieving: true })).toBe('Retrieving tokens from the funding wallet…');
  });

  test('blocks everything while wallet data refreshes', () => {
    expect(cleanupBusyReason({ ...idle, isRefreshing: true })).toBe('Refreshing wallet data…');
  });

  test('reports the cleanup first when several actions overlap', () => {
    expect(cleanupBusyReason({ isExecuting: true, isRetrieving: true, isRefreshing: true })).toBe(
      'Cleanup in progress…'
    );
  });
});
