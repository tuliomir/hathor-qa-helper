/**
 * The burn check refuses any burn but the one asked for (after
 * hathor-wallet-mobile's burnCheck.test.js).
 */

import { describe, expect, test } from 'bun:test';
import { Address, Input, Network, Output, Transaction } from '@hathor/wallet-lib';
import { BURN_DATA_VALUE, BurnRefusedError, checkBurn, inputDataOf } from '../src/services/hathorNext/burn';
import { bytesToHex, encodeAddress, hexToBytes, publicKeyOf } from '../src/services/hathorNext/kit';

const network = new Network('testnet');
const TRANSFER = 'WScTqhLsBQnz3HMdQqh66JBgWqb255XffL';
const CHANGE = 'WXkMhVgRVmTXTVh47wauPKm1xcrW8Qf3Vb';
const DEST_NETWORK = 'd5'.repeat(32);
const VIEW = bytesToHex(publicKeyOf(7n));
const SPEND = bytesToHex(publicKeyOf(11n));
const NEXT_ADDRESS = encodeAddress(VIEW, SPEND);
const UTXOS = [
  { txId: '01'.repeat(32), index: 0, value: 600n },
  { txId: '02'.repeat(32), index: 3, value: 400n },
];

function payload({ dest = DEST_NETWORK, view = VIEW, spend = SPEND } = {}) {
  return Uint8Array.from([0x43, 0x54, 1, ...hexToBytes(dest), ...hexToBytes(view), ...hexToBytes(spend)]);
}

const dataScript = (bytes: Uint8Array) => Buffer.from([0x4c, bytes.length, ...bytes, 0xac]);
const p2pkh = (address: string) => new Address(address, { network }).getScript();

function burnHex({
  amount = 700n,
  change = 299n,
  data = payload(),
  inputs = UTXOS,
  extra = [] as Output[],
}: { amount?: bigint; change?: bigint; data?: Uint8Array; inputs?: typeof UTXOS; extra?: Output[] } = {}) {
  const outputs = [
    new Output(BURN_DATA_VALUE, dataScript(data)),
    new Output(amount, p2pkh(TRANSFER)),
    ...(change ? [new Output(change, p2pkh(CHANGE))] : []),
    ...extra,
  ];
  return new Transaction(
    inputs.map((u) => new Input(u.txId, u.index)),
    outputs,
    { timestamp: 1790000000, parents: ['aa'.repeat(32), 'bb'.repeat(32)], weight: 1, nonce: 0 }
  ).toHex();
}

const expected = {
  network,
  utxos: UTXOS,
  amount: 700n,
  transferAddress: TRANSFER,
  changeAddress: CHANGE,
  destinationNetwork: DEST_NETWORK,
  destination: NEXT_ADDRESS,
};

describe('checkBurn', () => {
  test('passes the burn asked for', () => {
    const tx = checkBurn(burnHex(), expected);
    expect(tx.outputs).toHaveLength(3);
  });

  test('passes a burn without change', () => {
    expect(() =>
      checkBurn(burnHex({ change: 0n, amount: 999n }), { ...expected, amount: 999n, changeAddress: null })
    ).not.toThrow();
  });

  test('refuses another Hathor Next address', () => {
    const other = payload({ spend: bytesToHex(publicKeyOf(13n)) });
    expect(() => checkBurn(burnHex({ data: other }), expected)).toThrow(BurnRefusedError);
  });

  test('refuses another Hathor Next network', () => {
    expect(() => checkBurn(burnHex({ data: payload({ dest: 'e6'.repeat(32) }) }), expected)).toThrow(/somewhere else/);
  });

  test('refuses another amount', () => {
    expect(() => checkBurn(burnHex({ amount: 701n, change: 298n }), expected)).toThrow(/another amount/);
  });

  test('refuses an extra output', () => {
    const extra = [new Output(1n, p2pkh(CHANGE))];
    expect(() => checkBurn(burnHex({ change: 298n, extra }), expected)).toThrow(/other outputs/);
  });

  test('refuses other inputs', () => {
    const inputs = [UTXOS[0], { txId: '03'.repeat(32), index: 0, value: 400n }];
    expect(() => checkBurn(burnHex({ inputs }), expected)).toThrow(/other outputs than the ones chosen/);
  });

  test("refuses sums that don't add up", () => {
    expect(() => checkBurn(burnHex({ change: 200n }), expected)).toThrow(/add up/);
  });

  test('an unsigned input has no data', () => {
    expect(() => inputDataOf(checkBurn(burnHex(), expected))).toThrow(/not signed/);
  });
});
