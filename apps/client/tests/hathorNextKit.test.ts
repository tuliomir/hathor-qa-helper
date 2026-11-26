/**
 * The Hathor Next kit against Hathor Next's own vectors (samba-wallet-sdk
 * derivation, samba-crypto wallet auth, wallet-sdk v2 addresses), copied
 * verbatim from hathor-wallet-mobile's __tests__/multichain/next/fixtures.
 */

import { describe, expect, test } from 'bun:test';
import derivation from './fixtures/hathorNext/derivation.json';
import walletAuth from './fixtures/hathorNext/wallet-auth.json';
import addresses from './fixtures/hathorNext/address-v2.json';
import {
  AddressError,
  authSecret,
  bigintToBytesLE,
  bytesToBigintLE,
  bytesToHex,
  decodeAddress,
  decodeAddressKeys,
  deriveAccount,
  encodeAddress,
  hexToBytes,
  keysMessage,
  loginMessage,
  mnemonicToSeed,
  normalizeNextAddress,
  publicKeyOf,
  readSecret,
  schnorrSign,
  schnorrVerify,
  type SessionScope,
} from '../src/services/hathorNext/kit';

const scalar = (hex: string) => bytesToBigintLE(hexToBytes(hex));
const hex = (value: bigint) => bytesToHex(bigintToBytesLE(value));

function errorOf(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return null;
}

describe('Hathor Next key derivation', () => {
  for (const v of derivation.vectors) {
    test(`account ${v.account_index}, passphrase "${v.passphrase}"`, async () => {
      const keys = deriveAccount(await mnemonicToSeed(derivation.mnemonic, v.passphrase), v.account_index);
      expect(hex(keys.a)).toBe(v.a);
      expect(hex(keys.b)).toBe(v.b);
      expect(bytesToHex(publicKeyOf(keys.a))).toBe(v.pub_a);
      expect(bytesToHex(publicKeyOf(keys.b))).toBe(v.pub_b);
    });
  }
});

describe('Hathor Next wallet auth', () => {
  for (const v of walletAuth.derivations) {
    test(`auth and read keys of b=${v.b.slice(0, 8)}…`, () => {
      const auth = authSecret(scalar(v.b));
      const read = readSecret(auth);
      expect(hex(auth)).toBe(v.auth_secret);
      expect(bytesToHex(publicKeyOf(auth))).toBe(v.auth_pub);
      expect(hex(read)).toBe(v.read_secret);
      expect(bytesToHex(publicKeyOf(read))).toBe(v.read_pub);
    });
  }

  test('login messages match and their signatures verify', () => {
    for (const v of walletAuth.login_messages) {
      const message = loginMessage(hexToBytes(v.wallet_id), v.scope as SessionScope, v.ts);
      expect(bytesToHex(message)).toBe(v.message);
      const signer = walletAuth.derivations.find((d) =>
        [d.auth_pub, d.read_pub].some((pub) => schnorrVerify(hexToBytes(pub), message, hexToBytes(v.signature)))
      );
      expect(signer).toBeDefined();
    }
  });

  test('key registrations match and verify', () => {
    for (const v of walletAuth.keys_messages) {
      const message = keysMessage(
        hexToBytes(v.pub_b),
        hexToBytes(v.auth_pub),
        v.read_pub ? hexToBytes(v.read_pub) : null,
        v.ts
      );
      expect(bytesToHex(message)).toBe(v.message);
      expect(schnorrVerify(hexToBytes(v.pub_b), message, hexToBytes(v.sig_b))).toBe(true);
      expect(schnorrVerify(hexToBytes(v.auth_pub), message, hexToBytes(v.sig_auth))).toBe(true);
    }
  });

  test('a signature verifies only for its message and key', () => {
    const auth = authSecret(scalar(walletAuth.derivations[0].b));
    const message = loginMessage(new Uint8Array(32).fill(9), 'full', 1788000000);
    const sig = schnorrSign(auth, message);
    expect(schnorrVerify(publicKeyOf(auth), message, sig)).toBe(true);
    expect(schnorrVerify(publicKeyOf(auth), loginMessage(new Uint8Array(32).fill(9), 'read', 1788000000), sig)).toBe(
      false
    );
    expect(schnorrVerify(publicKeyOf(readSecret(auth)), message, sig)).toBe(false);
  });
});

describe('Hathor Next addresses', () => {
  for (const v of addresses.valid) {
    test(`reads ${v.name}`, () => {
      expect(decodeAddress(v.address)).toEqual({ form: v.form as 'v2' | 'legacy', view: v.view, spend: v.spend });
      if (v.form === 'v2') expect(encodeAddress(v.view, v.spend)).toBe(v.address.toLowerCase());
    });
  }

  for (const v of addresses.invalid) {
    test(`refuses ${v.name}`, () => {
      const error = errorOf(() => decodeAddress(v.address));
      expect(error).toBeInstanceOf(AddressError);
      expect((error as AddressError).code).toBe(v.error as AddressError['code']);
    });
  }

  for (const v of addresses.not_points) {
    test(`refuses keys off the curve: ${v.name}`, () => {
      expect(decodeAddress(v.address).view).toBe(v.view);
      expect((errorOf(() => decodeAddressKeys(v.address)) as AddressError).code).toBe('not-a-point');
    });
  }

  test('normalizes to the lowercase v2 form', () => {
    const upper = addresses.valid.find((v) => v.name.includes('uppercase') && v.form === 'v2')!;
    expect(normalizeNextAddress(` ${upper.address} `)).toEqual({ address: upper.canonical });
    expect(normalizeNextAddress('samba1nope')).toHaveProperty('error');
  });
});
