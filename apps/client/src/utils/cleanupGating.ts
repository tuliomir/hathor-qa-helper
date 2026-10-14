/**
 * Test Wallet Cleanup runs one action at a time. Refresh, Retrieve and
 * Execute share one busy state: concurrent actions would spend the same
 * UTXOs twice or wipe the results of a running cleanup.
 */

export interface CleanupActivity {
  isExecuting: boolean;
  isRetrieving: boolean;
  isRefreshing: boolean;
}

/** Why every cleanup action is disabled right now, or null when idle. */
export function cleanupBusyReason({ isExecuting, isRetrieving, isRefreshing }: CleanupActivity): string | null {
  if (isExecuting) return 'Cleanup in progress…';
  if (isRetrieving) return 'Retrieving tokens from the funding wallet…';
  if (isRefreshing) return 'Refreshing wallet data…';
  return null;
}
