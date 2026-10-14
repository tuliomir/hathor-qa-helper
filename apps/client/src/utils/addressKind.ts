/**
 * Address kind detection for AddressInput: decodes base58, checks the
 * checksum and reads the version byte, so detection does not depend on
 * prefixes (mainnet shielded addresses don't start with K3).
 *
 * Layouts (wallet-lib): transparent = version(1) + hash(20) + checksum(4),
 * 34 chars; shielded = version(1) + scan pubkey(33) + spend pubkey(33) +
 * checksum(4), 97 chars. Checksum = first 4 bytes of sha256(sha256(payload)).
 */

import { helpersUtils } from '@hathor/wallet-lib';
import { Buffer } from 'buffer';
import { NETWORKS, type NetworkKey } from '@qa-helper/shared/networks';

export type AddressNetwork = 'testnet' | 'mainnet';
export type AddressAccept = 'transparent' | 'shielded' | 'any';

export interface AddressDetection {
  kind: 'empty' | 'transparent' | 'shielded' | 'invalid';
  /** Network of the version byte, when it was recognised. */
  network?: AddressNetwork;
  type?: 'p2pkh' | 'p2sh';
  /** For invalid values: which kind it looks like it was meant to be. */
  intended?: 'transparent' | 'shielded';
  error?: string;
}

const TRANSPARENT_CHARS = 34;
const SHIELDED_CHARS = 97;
const TRANSPARENT_BYTES = 25;
const SHIELDED_BYTES = 71;

/** Version bytes from wallet-lib's Network model. */
const VERSIONS: Record<number, { network: AddressNetwork; kind: 'transparent' | 'shielded'; type?: 'p2pkh' | 'p2sh' }> =
  {
    0x49: { network: 'testnet', kind: 'transparent', type: 'p2pkh' },
    0x87: { network: 'testnet', kind: 'transparent', type: 'p2sh' },
    0x5d: { network: 'testnet', kind: 'shielded' },
    0x28: { network: 'mainnet', kind: 'transparent', type: 'p2pkh' },
    0x64: { network: 'mainnet', kind: 'transparent', type: 'p2sh' },
    0x3c: { network: 'mainnet', kind: 'shielded' },
  };

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALPHABET_INDEX = new Map([...ALPHABET].map((c, i) => [c, BigInt(i)]));

function base58Decode(s: string): Uint8Array {
  let n = 0n;
  for (const c of s) n = n * 58n + (ALPHABET_INDEX.get(c) as bigint);
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  for (const c of s) {
    if (c !== '1') break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

export function detectAddressKind(value: string, network?: NetworkKey): AddressDetection {
  const s = value.trim();
  if (s === '') return { kind: 'empty' };

  const bad = [...s].find((c) => !ALPHABET_INDEX.has(c));
  if (bad !== undefined) return { kind: 'invalid', error: `Not base58: contains "${bad}"` };

  const intended = s.length > (TRANSPARENT_CHARS + SHIELDED_CHARS) / 2 ? 'shielded' : 'transparent';
  const expected = intended === 'shielded' ? SHIELDED_CHARS : TRANSPARENT_CHARS;
  if (s.length !== expected) {
    return { kind: 'invalid', intended, error: `${expected} characters expected, got ${s.length}` };
  }

  const bytes = base58Decode(s);
  if (bytes.length !== (intended === 'shielded' ? SHIELDED_BYTES : TRANSPARENT_BYTES)) {
    return { kind: 'invalid', intended, error: 'Not a valid address' };
  }
  const payload = Buffer.from(bytes.subarray(0, -4));
  const checksum = Buffer.from(bytes.subarray(-4));
  if (!helpersUtils.getChecksum(payload).equals(checksum)) {
    return { kind: 'invalid', intended, error: 'Checksum mismatch: check for a typo' };
  }

  const version = VERSIONS[bytes[0]];
  if (!version || version.kind !== intended) {
    return {
      kind: 'invalid',
      intended,
      error: `Unknown version byte 0x${bytes[0].toString(16).padStart(2, '0')}`,
    };
  }

  if (network && NETWORKS[network].libName !== version.network) {
    return {
      kind: 'invalid',
      intended,
      network: version.network,
      error: `Address is for ${version.network}; active network is ${NETWORKS[network].label}`,
    };
  }

  return version.kind === 'transparent'
    ? { kind: 'transparent', network: version.network, type: version.type }
    : { kind: 'shielded', network: version.network };
}

/** The message AddressInput shows for a detection in a field that accepts `accept`, or null. */
export function addressAcceptError(
  detection: AddressDetection,
  accept: AddressAccept,
  network?: NetworkKey
): string | null {
  switch (detection.kind) {
    case 'empty':
      return null;
    case 'invalid':
      return detection.error ?? 'Not a valid address';
    case 'shielded':
      if (accept === 'transparent') return 'This is a shielded address; this field needs a transparent address';
      if (network && !NETWORKS[network].supportsShielded) return 'Shielded addresses need Shielded testnet';
      return null;
    case 'transparent':
      return accept === 'shielded' ? 'This is a transparent address; this field needs a shielded address' : null;
  }
}
