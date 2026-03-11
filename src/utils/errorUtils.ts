/**
 * Extract a human-readable error message from an unknown error value.
 *
 * Handles Error instances, WalletConnect RPC error objects ({ message }),
 * plain strings, and arbitrary objects by trying common patterns.
 */
export function extractErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}
