import { describe, expect, test } from 'bun:test';
import { addressAcceptError, detectAddressKind } from '../src/utils/addressKind';

// Fixtures derived with wallet-lib's encoders from private keys 1 and 2.
const TESTNET_P2PKH = 'WZMJS5eeCEgiqxNK1QRbE1HR4wFQwmCjJV';
const TESTNET_P2SH = 'wWJhUp8WDRR3Yq1gXR5MHnAC6DDu3b6pTC';
const MAINNET_P2PKH = 'HHCPwVp8mHPoremTCZS5DsJTJHkHUy7aHK';
const MAINNET_P2SH = 'hRUb21hRN7CNvf8efjRCKPdf4ZCt7wXJuL';
const TESTNET_SHIELDED =
  'K3KokZRo7DyNRRiyijpsVix2VADrd4HeA8vWLR5itAj81BVC4Vv7xoXbrYyKYwsLMWhefXqXKgJvC6HcVkDuJ7AJ7qUMS7fVc';
const MAINNET_SHIELDED =
  'Ce61z7k3hbx6xtx7ZN86iu5L16XSCpPoFp3V2pCJzWfXpCD9cEemGQQ3WuJysuaF8qbr6yPUZB2ui6t2eEbN2rFxp7mn7PtMW';

describe('detectAddressKind', () => {
  test('empty and whitespace', () => {
    expect(detectAddressKind('').kind).toBe('empty');
    expect(detectAddressKind('   ').kind).toBe('empty');
  });

  test('transparent testnet P2PKH and P2SH', () => {
    expect(detectAddressKind(TESTNET_P2PKH)).toEqual({ kind: 'transparent', network: 'testnet', type: 'p2pkh' });
    expect(detectAddressKind(TESTNET_P2SH)).toEqual({ kind: 'transparent', network: 'testnet', type: 'p2sh' });
    expect(detectAddressKind('wRxmoq2bDxViPqFGmAsZVBwHNwjEyFj9zz').kind).toBe('transparent');
  });

  test('transparent mainnet P2PKH and P2SH', () => {
    expect(detectAddressKind(MAINNET_P2PKH)).toEqual({ kind: 'transparent', network: 'mainnet', type: 'p2pkh' });
    expect(detectAddressKind(MAINNET_P2SH)).toEqual({ kind: 'transparent', network: 'mainnet', type: 'p2sh' });
  });

  test('shielded testnet: 97 chars starting K3', () => {
    expect(TESTNET_SHIELDED).toHaveLength(97);
    expect(detectAddressKind(TESTNET_SHIELDED)).toEqual({ kind: 'shielded', network: 'testnet' });
  });

  test('shielded mainnet is found by version byte, not prefix', () => {
    expect(detectAddressKind(MAINNET_SHIELDED)).toEqual({ kind: 'shielded', network: 'mainnet' });
  });

  test('surrounding whitespace is ignored', () => {
    expect(detectAddressKind(`  ${TESTNET_P2PKH}\n`).kind).toBe('transparent');
  });

  test('wrong length: shielded-looking value one char short', () => {
    const r = detectAddressKind(TESTNET_SHIELDED.slice(0, 96));
    expect(r.kind).toBe('invalid');
    expect(r.intended).toBe('shielded');
    expect(r.error).toBe('97 characters expected, got 96');
  });

  test('wrong length: transparent-looking value one char long', () => {
    const r = detectAddressKind(`${TESTNET_P2PKH}a`);
    expect(r.kind).toBe('invalid');
    expect(r.intended).toBe('transparent');
    expect(r.error).toBe('34 characters expected, got 35');
  });

  test('typo breaks the checksum', () => {
    const typo = `${TESTNET_P2PKH.slice(0, 10)}${TESTNET_P2PKH[10] === 'a' ? 'b' : 'a'}${TESTNET_P2PKH.slice(11)}`;
    const r = detectAddressKind(typo);
    expect(r.kind).toBe('invalid');
    expect(r.error).toMatch(/checksum/i);
  });

  test('wrong network: mainnet address while the network is testnet', () => {
    const r = detectAddressKind(MAINNET_P2PKH, 'TESTNET');
    expect(r).toMatchObject({ kind: 'invalid', intended: 'transparent', network: 'mainnet' });
    expect(r.error).toBe('Address is for mainnet; active network is Testnet');
  });

  test('wrong network: testnet shielded address on mainnet', () => {
    const r = detectAddressKind(TESTNET_SHIELDED, 'MAINNET');
    expect(r).toMatchObject({ kind: 'invalid', intended: 'shielded', network: 'testnet' });
    expect(r.error).toBe('Address is for testnet; active network is Mainnet');
  });

  test('shielded testnet network accepts testnet version bytes', () => {
    expect(detectAddressKind(TESTNET_SHIELDED, 'SHIELDED_TESTNET').kind).toBe('shielded');
    expect(detectAddressKind(TESTNET_P2PKH, 'SHIELDED_TESTNET').kind).toBe('transparent');
  });

  test('garbage: characters outside base58', () => {
    const r = detectAddressKind('W0OIl-not-an-address');
    expect(r.kind).toBe('invalid');
    expect(r.error).toBe('Not base58: contains "0"');
  });

  test('garbage: base58 of the right length with an unknown version byte', () => {
    // 34 base58 chars that decode to 25 bytes with a valid checksum but version 0x00 never happen
    // naturally; a run of "1" decodes to leading zero bytes.
    const r = detectAddressKind('1111111111111111111111111111111111');
    expect(r.kind).toBe('invalid');
  });
});

describe('addressAcceptError', () => {
  const t = detectAddressKind(TESTNET_P2PKH);
  const s = detectAddressKind(TESTNET_SHIELDED);

  test('transparent field rejects shielded with a specific message', () => {
    expect(addressAcceptError(s, 'transparent')).toBe(
      'This is a shielded address; this field needs a transparent address'
    );
    expect(addressAcceptError(t, 'transparent')).toBeNull();
  });

  test('shielded field rejects transparent', () => {
    expect(addressAcceptError(t, 'shielded')).toBe(
      'This is a transparent address; this field needs a shielded address'
    );
    expect(addressAcceptError(s, 'shielded')).toBeNull();
  });

  test('any accepts both, and empty is never an error', () => {
    expect(addressAcceptError(t, 'any')).toBeNull();
    expect(addressAcceptError(s, 'any')).toBeNull();
    expect(addressAcceptError(detectAddressKind(''), 'shielded')).toBeNull();
  });

  test('invalid values report their own error', () => {
    expect(addressAcceptError(detectAddressKind('abc'), 'any')).toBe('34 characters expected, got 3');
  });

  test('shielded address on a network without shielded support', () => {
    expect(addressAcceptError(s, 'any', 'TESTNET')).toBe('Shielded addresses need Shielded testnet');
    expect(addressAcceptError(s, 'any', 'SHIELDED_TESTNET')).toBeNull();
  });
});
