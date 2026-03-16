/**
 * Extract a human-readable error message from an unknown error value.
 *
 * Handles Error instances, WalletConnect RPC error objects ({ message }),
 * MetaMask snap errors (nested in data.cause.message), plain strings,
 * and arbitrary objects by trying common patterns.
 *
 * For snap errors, the top-level message is often "Snap Error" or
 * "Internal JSON-RPC error." — the actual useful message is nested deeper.
 */
export function extractErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (typeof error === 'string') return error;

  if (error !== null && typeof error === 'object') {
    const obj = error as Record<string, unknown>;

    // Try to find the deepest, most specific message in the error chain.
    // Snap errors nest the real message in data.cause.message or data.message.
    const deepMessage = findDeepestMessage(obj);
    if (deepMessage) return deepMessage;

    // Fall back to top-level message
    if (error instanceof Error) return error.message;
    if (typeof obj.message === 'string' && obj.message) return obj.message;
  }

  return fallback;
}

/**
 * Traverse nested error structures to find the most specific error message.
 * Returns the deepest non-generic message, or null if none found.
 */
function findDeepestMessage(obj: Record<string, unknown>): string | null {
  const genericMessages = new Set([
    'snap error',
    'internal json-rpc error.',
    'internal json-rpc error',
    'unknown error',
  ]);

  let best: string | null = null;

  function traverse(o: unknown, depth: number): void {
    if (!o || typeof o !== 'object' || depth > 5) return;
    const record = o as Record<string, unknown>;

    if (typeof record.message === 'string' && record.message) {
      if (!genericMessages.has(record.message.toLowerCase())) {
        best = record.message;
      } else if (!best) {
        best = record.message;
      }
    }

    for (const key of ['data', 'cause', 'originalError', 'error']) {
      if (record[key] && typeof record[key] === 'object') {
        traverse(record[key], depth + 1);
      }
    }
  }

  traverse(obj, 0);
  return best;
}
