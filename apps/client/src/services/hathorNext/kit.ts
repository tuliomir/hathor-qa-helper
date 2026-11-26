/**
 * Hathor Next keys, wallet auth and addresses: a port of
 * hathor-wallet-mobile's src/multichain/next/kit (keys, walletAuth, hash,
 * scalar, address). tests/hathorNextKit.test.ts checks it against Hathor
 * Next's own vectors.
 *
 * A wallet's Hathor Next spend key comes from its seed (BIP32 account
 * m/44'/280'/3'), so a QA Helper wallet has the same Hathor Next address as
 * the mobile wallet holding the same seed.
 */

import { RistrettoPoint } from '@noble/curves/ed25519';
import { blake3 } from '@noble/hashes/blake3';
import { hmac } from '@noble/hashes/hmac';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha512 } from '@noble/hashes/sha512';
import { randomBytes, utf8ToBytes } from '@noble/hashes/utils';

// ── Bytes and scalars ───────────────────────────────────────────────────────

/** The Ristretto group order. */
export const ORDER = 2n ** 252n + 27742317777372353535851937790883648493n;
const SECP256K1_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

export function bytesToBigintLE(bytes: Uint8Array): bigint {
  let value = 0n;
  for (let i = bytes.length - 1; i >= 0; i -= 1) value = (value << 8n) | BigInt(bytes[i]);
  return value;
}

export function bigintToBytesLE(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 0; i < 32; i += 1) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

const bytesToBigintBE = (bytes: Uint8Array) => bytesToBigintLE(Uint8Array.from(bytes).reverse());
const bigintToBytesBE = (value: bigint) => bigintToBytesLE(value).reverse();

function modOrder(value: bigint): bigint {
  const r = value % ORDER;
  return r < 0n ? r + ORDER : r;
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) throw new Error('Not hexadecimal.');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function asciiBytes(text: string): Uint8Array {
  return Uint8Array.from(text, (c) => c.charCodeAt(0));
}

function u64LE(value: number | bigint): Uint8Array {
  const out = new Uint8Array(8);
  let rest = BigInt(value);
  for (let i = 0; i < 8; i += 1) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

// ── Domain-separated hashes ─────────────────────────────────────────────────

const SEPARATOR = Uint8Array.of(0);

function xof64(domain: string, parts: Uint8Array[]): Uint8Array {
  const hasher = blake3.create({ dkLen: 64 });
  hasher.update(asciiBytes(domain));
  hasher.update(SEPARATOR);
  for (const part of parts) hasher.update(part);
  return hasher.digest();
}

function hashToScalar(domain: string, parts: Uint8Array[]): bigint {
  return modOrder(bytesToBigintLE(xof64(domain, parts)));
}

function domainHash(domain: string, payload: Uint8Array): Uint8Array {
  const hasher = blake3.create({});
  hasher.update(asciiBytes(domain));
  hasher.update(SEPARATOR);
  hasher.update(payload);
  return hasher.digest();
}

// ── Keys ────────────────────────────────────────────────────────────────────

/** The BIP44 account Hathor Next keys derive from: m/44'/280'/3'. */
export const HATHOR_NEXT_ACCOUNT_INDEX = 3;
const HARDENED = 0x80000000;

/** BIP39 seed of a mnemonic. */
export async function mnemonicToSeed(mnemonic: string, passphrase = ''): Promise<Uint8Array> {
  const words = mnemonic.trim().split(/\s+/).join(' ');
  return pbkdf2Async(
    sha512,
    utf8ToBytes(words.normalize('NFKD')),
    utf8ToBytes(`mnemonic${passphrase.normalize('NFKD')}`),
    {
      c: 2048,
      dkLen: 64,
    }
  );
}

interface Bip32Node {
  key: Uint8Array;
  chainCode: Uint8Array;
}

function childHardened(node: Bip32Node, index: number): Bip32Node {
  if (!Number.isInteger(index) || index < 0 || index >= HARDENED) {
    throw new Error('The account index is out of range.');
  }
  const ser32 = new Uint8Array(4);
  new DataView(ser32.buffer).setUint32(0, (index | HARDENED) >>> 0, false);
  const i = hmac(sha512, node.chainCode, concatBytes(Uint8Array.of(0), node.key, ser32));
  const il = bytesToBigintBE(i.slice(0, 32));
  if (il >= SECP256K1_N) throw new Error('Invalid BIP32 child key.');
  const key = (il + bytesToBigintBE(node.key)) % SECP256K1_N;
  if (key === 0n) throw new Error('Invalid BIP32 child key.');
  return { key: bigintToBytesBE(key), chainCode: i.slice(32) };
}

/** key ‖ chain code of m/44'/280'/<account>'. */
export function accountNode64(seed64: Uint8Array, accountIndex: number): Uint8Array {
  const master = hmac(sha512, asciiBytes('Bitcoin seed'), seed64);
  const masterKey = bytesToBigintBE(master.slice(0, 32));
  if (masterKey === 0n || masterKey >= SECP256K1_N) throw new Error('Invalid BIP32 master key.');
  let node: Bip32Node = { key: master.slice(0, 32), chainCode: master.slice(32) };
  for (const index of [44, 280, accountIndex]) node = childHardened(node, index);
  return concatBytes(node.key, node.chainCode);
}

export function publicKeyOf(secret: bigint): Uint8Array {
  return RistrettoPoint.BASE.multiply(secret).toRawBytes();
}

/** The view (a) and spend (b) secrets of an account. */
export function deriveAccount(seed64: Uint8Array, accountIndex = HATHOR_NEXT_ACCOUNT_INDEX): { a: bigint; b: bigint } {
  const node64 = accountNode64(seed64, accountIndex);
  return {
    a: hashToScalar('samba/walletd/view/v1', [node64]),
    b: hashToScalar('samba/walletd/spend/v1', [node64]),
  };
}

/** A wallet's id on a backend: its service view key and the wallet's spend key. */
export function walletIdOf(pubA: Uint8Array, pubB: Uint8Array): Uint8Array {
  return domainHash('samba/walletid', concatBytes(pubA, pubB));
}

// ── Wallet auth ─────────────────────────────────────────────────────────────

export type SessionScope = 'read' | 'full';
const SCOPE_BYTE: Record<SessionScope, number> = { read: 1, full: 2 };
const LOGIN_PREFIX = asciiBytes('samba/wallet-auth-login/v1\0');
const KEYS_PREFIX = asciiBytes('samba/wallet-auth-keys/v1\0');

/** The auth key, from the spend secret. */
export function authSecret(b: bigint): bigint {
  return hashToScalar('samba/wallet-auth-key/v1', [bigintToBytesLE(b)]);
}

/** The read key, from the auth secret. */
export function readSecret(auth: bigint): bigint {
  return hashToScalar('samba/wallet-auth-key/read/v1', [bigintToBytesLE(auth)]);
}

export function loginMessage(walletId: Uint8Array, scope: SessionScope, ts: number): Uint8Array {
  if (!(scope in SCOPE_BYTE)) throw new Error('Unknown session scope.');
  return concatBytes(LOGIN_PREFIX, walletId, Uint8Array.of(SCOPE_BYTE[scope]), u64LE(ts));
}

export function keysMessage(pubB: Uint8Array, authPub: Uint8Array, readPub: Uint8Array | null, ts: number): Uint8Array {
  return concatBytes(KEYS_PREFIX, pubB, authPub, readPub ?? new Uint8Array(32), u64LE(ts));
}

function challenge(publicKey: Uint8Array, r: Uint8Array, msg: Uint8Array): bigint {
  return hashToScalar('samba/schnorr/challenge', [publicKey, r, msg]);
}

/** Schnorr over Ristretto255: R ‖ s, 64 bytes. */
export function schnorrSign(x: bigint, msg: Uint8Array, entropy: Uint8Array = randomBytes(32)): Uint8Array {
  if (x <= 0n) throw new Error('The signing key is unavailable.');
  const k = hashToScalar('hathor-wallet/schnorr-nonce/v1', [bigintToBytesLE(x), msg, entropy]);
  if (k === 0n) throw new Error('Could not sign.');
  const r = RistrettoPoint.BASE.multiply(k).toRawBytes();
  const e = challenge(publicKeyOf(x), r, msg);
  return concatBytes(r, bigintToBytesLE(modOrder(k + e * x)));
}

export function schnorrVerify(publicKey: Uint8Array, msg: Uint8Array, sig: Uint8Array): boolean {
  if (sig.length !== 64) return false;
  try {
    const x = RistrettoPoint.fromHex(publicKey);
    const rBytes = sig.slice(0, 32);
    const r = RistrettoPoint.fromHex(rBytes);
    const s = bytesToBigintLE(sig.slice(32));
    if (s >= ORDER) return false;
    const e = challenge(publicKey, rBytes, msg);
    const left = s === 0n ? RistrettoPoint.ZERO : RistrettoPoint.BASE.multiply(s);
    const right = e === 0n ? r : r.add(x.multiply(e));
    return left.equals(right);
  } catch {
    return false;
  }
}

/** Every key a backend session needs, from the spend secret. */
export interface NextKeys {
  b: bigint;
  auth: bigint;
  read: bigint;
  pubB: Uint8Array;
  authPub: Uint8Array;
  readPub: Uint8Array;
}

export function keysOf(b: bigint): NextKeys {
  const auth = authSecret(b);
  const read = readSecret(auth);
  return { b, auth, read, pubB: publicKeyOf(b), authPub: publicKeyOf(auth), readPub: publicKeyOf(read) };
}

// ── Addresses (bech32m, `samba1…`) ──────────────────────────────────────────

const ADDRESS_HRP = 'samba';
const ADDRESS_VERSION = 2;
const ADDRESS_V2_LENGTH = 116;
const ADDRESS_LEGACY_LENGTH = 134;
const LEGACY_PREFIX = 'samba:';
const V2_PREFIX = 'samba1';
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32M_CONST = 0x2bc830a3;
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

export type AddressErrorCode =
  | 'wrong-prefix'
  | 'wrong-length'
  | 'bad-character'
  | 'mixed-case'
  | 'bad-checksum'
  | 'unknown-version'
  | 'non-zero-padding'
  | 'not-a-point';

export class AddressError extends Error {
  readonly code: AddressErrorCode;

  constructor(code: AddressErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AddressError';
  }
}

function polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = (((chk & 0x1ffffff) << 5) ^ v) >>> 0;
    for (let i = 0; i < 5; i += 1) {
      if ((top >>> i) & 1) chk = (chk ^ GEN[i]) >>> 0;
    }
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const codes = [...hrp].map((c) => c.charCodeAt(0));
  return [...codes.map((c) => c >>> 5), 0, ...codes.map((c) => c & 31)];
}

function checksum(data: number[]): number[] {
  const pm = (polymod([...hrpExpand(ADDRESS_HRP), ...data, 0, 0, 0, 0, 0, 0]) ^ BECH32M_CONST) >>> 0;
  return [0, 1, 2, 3, 4, 5].map((i) => (pm >>> (5 * (5 - i))) & 31);
}

// ASCII-only, as Rust's to_ascii_lowercase: toLowerCase() folds some non-ASCII letters into the alphabet.
const asciiLower = (s: string) => s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));

/** The v2 address of a view key and a spend key, 32 bytes hex each. */
export function encodeAddress(viewHex: string, spendHex: string): string {
  if (!/^[0-9a-fA-F]{64}$/.test(viewHex) || !/^[0-9a-fA-F]{64}$/.test(spendHex)) {
    throw new TypeError('A key must be 64 hex characters');
  }
  const bytes = [...hexToBytes(viewHex), ...hexToBytes(spendHex)];
  const data = [ADDRESS_VERSION];
  let acc = 0;
  let bits = 0;
  for (const b of bytes) {
    acc = ((acc << 8) | b) & 0xfff;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      data.push((acc >>> bits) & 31);
    }
  }
  if (bits > 0) data.push((acc << (5 - bits)) & 31);
  return V2_PREFIX + [...data, ...checksum(data)].map((d) => CHARSET[d]).join('');
}

export interface DecodedAddress {
  form: 'v2' | 'legacy';
  view: string;
  spend: string;
}

function decodeLegacy(s: string): DecodedAddress {
  if (asciiLower(s.slice(LEGACY_PREFIX.length, LEGACY_PREFIX.length + V2_PREFIX.length)) === V2_PREFIX) {
    throw new AddressError('wrong-prefix', 'wrong prefix: an address starts with `samba1`');
  }
  const chars = [...s];
  if (chars.length !== ADDRESS_LEGACY_LENGTH) {
    throw new AddressError(
      'wrong-length',
      `wrong length: ${chars.length} characters, a legacy address has ${ADDRESS_LEGACY_LENGTH}`
    );
  }
  const body = chars.slice(LEGACY_PREFIX.length);
  const bad = body.findIndex((c) => !/^[0-9a-fA-F]$/.test(c));
  if (bad >= 0) {
    throw new AddressError(
      'bad-character',
      `character '${body[bad]}' at position ${LEGACY_PREFIX.length + bad} is not a hex digit`
    );
  }
  const hex = asciiLower(body.join(''));
  return { form: 'legacy', view: hex.slice(0, 64), spend: hex.slice(64) };
}

/** The keys an address names, hex; throws AddressError for anything but a valid address. */
export function decodeAddress(s: string): DecodedAddress {
  if (asciiLower(s.slice(0, LEGACY_PREFIX.length)) === LEGACY_PREFIX) return decodeLegacy(s);
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) {
    throw new AddressError('mixed-case', 'mixed case: an address is all lowercase or all uppercase');
  }
  if (!asciiLower(s).startsWith(V2_PREFIX)) {
    throw new AddressError('wrong-prefix', 'wrong prefix: an address starts with `samba1`');
  }
  const chars = [...s];
  if (chars.length !== ADDRESS_V2_LENGTH) {
    throw new AddressError(
      'wrong-length',
      `wrong length: ${chars.length} characters, a v2 address has ${ADDRESS_V2_LENGTH}`
    );
  }
  const data: number[] = [];
  for (let i = V2_PREFIX.length; i < chars.length; i += 1) {
    const c = chars[i];
    const v = c.length === 1 ? CHARSET.indexOf(asciiLower(c)) : -1;
    if (v < 0)
      throw new AddressError('bad-character', `character '${c}' at position ${i} is not in the bech32 alphabet`);
    data.push(v);
  }
  if (polymod([...hrpExpand(ADDRESS_HRP), ...data]) !== BECH32M_CONST) {
    throw new AddressError('bad-checksum', 'bad checksum: the address has a typo');
  }
  if (data[0] !== ADDRESS_VERSION) {
    throw new AddressError(
      'unknown-version',
      `unknown address version ${data[0]}: this build reads version ${ADDRESS_VERSION}`
    );
  }
  const bytes: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const v of data.slice(1, data.length - 6)) {
    acc = ((acc << 5) | v) & 0xfff;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >>> bits) & 0xff);
    }
  }
  if ((acc & ((1 << bits) - 1)) !== 0) {
    throw new AddressError(
      'non-zero-padding',
      'non-canonical address: the padding bits after the spend key are not zero'
    );
  }
  const hex = bytesToHex(Uint8Array.from(bytes));
  return { form: 'v2', view: hex.slice(0, 64), spend: hex.slice(64) };
}

/** decodeAddress, also refusing keys that are not Ristretto points. */
export function decodeAddressKeys(s: string): DecodedAddress {
  const decoded = decodeAddress(s);
  for (const key of [decoded.view, decoded.spend]) {
    try {
      RistrettoPoint.fromHex(key);
    } catch {
      throw new AddressError('not-a-point', 'not an address: a key is not a curve point');
    }
  }
  return decoded;
}

/** The canonical (lowercase v2) form of an address, or an error message. */
export function normalizeNextAddress(s: string): { address: string } | { error: string } {
  try {
    const { view, spend } = decodeAddressKeys(s.trim());
    return { address: encodeAddress(view, spend) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
