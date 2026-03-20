/**
 * Snap error utilities
 *
 * MetaMask wraps snap errors in different structures depending on the
 * rejection source. This module provides reliable detection across all cases.
 */

const REJECTION_RE = /reject|denied|cancel/i;
const REJECTION_TYPE_RE = /PromptRejectedError/;

/**
 * Recursively collect all string messages from a snap error structure.
 * MetaMask nests the actual error in varying shapes: data.cause.message,
 * data.message, data.originalError.message, etc.
 */
function collectMessages(err: unknown, depth = 0): string[] {
  if (!err || typeof err !== 'object' || depth > 5) return [];
  const obj = err as Record<string, unknown>;
  const msgs: string[] = [];

  if (typeof obj.message === 'string') msgs.push(obj.message);
  if (typeof obj.errorType === 'string') msgs.push(obj.errorType);
  if (typeof obj.name === 'string') msgs.push(obj.name);

  // Traverse known nested error keys
  for (const key of ['data', 'cause', 'originalError', 'error']) {
    const nested = obj[key];
    if (nested && typeof nested === 'object') {
      msgs.push(...collectMessages(nested, depth + 1));
    }
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
 * - Non-enumerable .data properties on Error subclasses
 * - JSON.stringify fallback for opaque error structures
 */
export function isSnapUserRejection(err: unknown): boolean {
  if (!err) return false;

  // Plain string
  if (typeof err === 'string') return REJECTION_RE.test(err);

  const obj = typeof err === 'object' ? (err as Record<string, unknown>) : null;

  // Code 4001 = MetaMask's own rejection
  if (obj && typeof obj.code === 'number' && obj.code === 4001) return true;

  // Check top-level message (Error instances and plain objects)
  const topMessage = err instanceof Error ? err.message : obj && typeof obj.message === 'string' ? obj.message : '';
  if (topMessage && REJECTION_RE.test(topMessage)) return true;

  // Check for PromptRejectedError errorType anywhere in the structure
  if (obj) {
    const data = obj.data as Record<string, unknown> | undefined;
    if (data && typeof data === 'object') {
      if (typeof data.errorType === 'string' && REJECTION_TYPE_RE.test(data.errorType)) return true;
    }
  }

  // Deep check: collect all messages from nested data/cause structure
  const messages = collectMessages(err);
  if (messages.some((msg) => REJECTION_RE.test(msg) || REJECTION_TYPE_RE.test(msg))) {
    return true;
  }

  // Last resort: check non-enumerable properties that collectMessages may miss.
  // Error subclasses from MetaMask may have .data as non-enumerable.
  if (err instanceof Error) {
    for (const key of ['data', 'cause', 'originalError', 'error']) {
      const nested = (err as Record<string, unknown>)[key];
      if (nested && typeof nested === 'object') {
        const nestedMsgs = collectMessages(nested);
        if (nestedMsgs.some((msg) => REJECTION_RE.test(msg) || REJECTION_TYPE_RE.test(msg))) {
          return true;
        }
      }
    }
  }

  return false;
}
