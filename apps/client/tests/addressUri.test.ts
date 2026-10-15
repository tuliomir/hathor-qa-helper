import { describe, expect, it } from 'bun:test';
import { parseScannedAddress, toAddressUri } from '../src/utils/addressUri';

const W = 'WZ7pDnkPnxbs14GHdUFivFzPbzitwNtvZo';
const K3 = `K3${'a'.repeat(95)}`;

describe('toAddressUri', () => {
  it('prefixes the address the way the mobile receive QR does', () => {
    expect(toAddressUri(K3)).toBe(`hathor:${K3}`);
  });
});

describe('parseScannedAddress', () => {
  it('accepts a bare address', () => {
    expect(parseScannedAddress(` ${W}\n`)).toBe(W);
  });

  it('strips the hathor: prefix', () => {
    expect(parseScannedAddress(`hathor:${K3}`)).toBe(K3);
  });

  it('reads the address of a JSON payload, prefixed or not', () => {
    expect(parseScannedAddress(JSON.stringify({ address: W }))).toBe(W);
    expect(parseScannedAddress(JSON.stringify({ address: `hathor:${W}`, amount: '1' }))).toBe(W);
  });

  it('returns empty for JSON without an address', () => {
    expect(parseScannedAddress('{"token":"00"}')).toBe('');
  });

  it('keeps malformed JSON-looking text as is', () => {
    expect(parseScannedAddress('{not json')).toBe('{not json');
  });
});
