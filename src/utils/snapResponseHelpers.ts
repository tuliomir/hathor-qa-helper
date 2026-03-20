/**
 * Snap response display helpers
 *
 * Safe utilities for parsing and displaying snap responses.
 * All values from snap responses are `unknown` at runtime — these helpers
 * ensure no object/BigInt/unexpected type crashes React rendering.
 */

/**
 * Parse a snap response string into an object, or return as-is if not a string.
 */
export function parseSnapResponse(data: unknown): unknown {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

interface EnvelopeResponse {
  type: number;
  response: unknown;
}

/**
 * Check if data is a {type: number, response: ...} envelope.
 */
export function isSnapEnvelope(data: unknown): data is EnvelopeResponse {
  return !!(
    data &&
    typeof data === 'object' &&
    'type' in data &&
    typeof (data as Record<string, unknown>).type === 'number' &&
    'response' in data
  );
}

/**
 * Check if data looks like a transaction (has hash + inputs/outputs).
 */
export function isTransactionLike(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if ('hash' in obj && ('inputs' in obj || 'outputs' in obj)) return true;
  if ('type' in obj && 'response' in obj) return isTransactionLike(obj.response);
  return false;
}

/**
 * Coerce any snap response value into a string safe for React rendering.
 *
 * This is the fix for the class of bugs where the snap returns an object
 * where a string was expected (e.g., signWithAddress returning an address
 * object {address, index, addressPath} instead of a plain string).
 */
export function safeDisplayValue(value: unknown, fallback = 'N/A'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return fallback;
    }
  }
  return String(value);
}
