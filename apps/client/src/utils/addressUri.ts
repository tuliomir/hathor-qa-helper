/**
 * The `hathor:` address URI, as the mobile wallet shows and scans it
 * (`knowledge/shielded-semantics.md` §5).
 *
 * The mobile Send scanner accepts a bare address, `hathor:<address>` or
 * `{"address": "…"}`. It rejects JSON payment requests and query strings,
 * so a receive QR must be the plain URI.
 */

export const ADDRESS_URI_PREFIX = 'hathor:';

export function toAddressUri(address: string): string {
  return `${ADDRESS_URI_PREFIX}${address}`;
}

/**
 * The address in a scanned or pasted payload: a bare address, a `hathor:`
 * URI, or JSON with an `address` field (a payment request; its own
 * `address` may carry the prefix too). Returns '' when there is none.
 */
export function parseScannedAddress(payload: string): string {
  const text = payload.trim();
  if (text.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(text);
      const address = (parsed as { address?: unknown } | null)?.address;
      return typeof address === 'string' ? stripPrefix(address.trim()) : '';
    } catch {
      return text;
    }
  }
  return stripPrefix(text);
}

function stripPrefix(text: string): string {
  return text.startsWith(ADDRESS_URI_PREFIX) ? text.slice(ADDRESS_URI_PREFIX.length).trim() : text;
}
