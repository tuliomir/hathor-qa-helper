/**
 * Snap error utilities
 *
 * MetaMask wraps snap errors in different structures depending on the
 * rejection source. This module provides reliable detection across all cases.
 */

const REJECTION_RE = /reject|denied|cancel/i;

/**
 * Recursively collect all string messages from a snap error structure.
 * MetaMask nests the actual error in data.cause.message or data.message.
 */
function collectMessages(err: unknown): string[] {
  if (!err || typeof err !== 'object') return [];
  const obj = err as Record<string, unknown>;
  const msgs: string[] = [];

  if (typeof obj.message === 'string') msgs.push(obj.message);
  if (typeof obj.errorType === 'string') msgs.push(obj.errorType);

  if (obj.data && typeof obj.data === 'object') {
    msgs.push(...collectMessages(obj.data));
  }
  if ((obj as Record<string, unknown>).cause && typeof (obj as Record<string, unknown>).cause === 'object') {
    msgs.push(...collectMessages((obj as Record<string, unknown>).cause));
  }

  return msgs;
}

/**
 * Detect whether a snap error represents a user rejection.
 *
 * Handles:
 * - MetaMask dialog rejection (code 4001)
 * - Snap PromptRejectedError wrapped in SnapError (code -32603, nested message)
 * - Pin prompt rejection
 * - Plain string/Error with rejection keywords
 */
export function isSnapUserRejection(err: unknown): boolean {
  if (!err) return false;

  // Plain string
  if (typeof err === 'string') return REJECTION_RE.test(err);

  // Code 4001 = MetaMask's own rejection
  if (typeof err === 'object' && 'code' in (err as Record<string, unknown>)) {
    if ((err as Record<string, unknown>).code === 4001) return true;
  }

  // Check top-level message (Error instances)
  if (err instanceof Error && REJECTION_RE.test(err.message)) return true;

  // Deep check: collect all messages from nested data/cause structure
  const messages = collectMessages(err);
  return messages.some(
    (msg) => REJECTION_RE.test(msg) || msg === 'PromptRejectedError',
  );
}
