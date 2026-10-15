import { describe, expect, test } from 'bun:test';
import { transferKey, transfersInTx } from '../src/utils/walletTransfers';

const tx = { txId: 'abc', timestamp: 1000 };

describe('transfersInTx', () => {
  test('test wallet paying the funding wallet', () => {
    // The test wallet spent 600 and got 100 change back; the funding wallet received 500.
    expect(transfersInTx(tx, { '00': 500n }, { '00': -500n })).toEqual([
      { txId: 'abc', timestamp: 1000, direction: 'test-to-funding', tokenUid: '00', amount: '500' },
    ]);
  });

  test('funding wallet paying the test wallet', () => {
    expect(transfersInTx(tx, { tok: -30n }, { tok: 30n })).toEqual([
      { txId: 'abc', timestamp: 1000, direction: 'funding-to-test', tokenUid: 'tok', amount: '30' },
    ]);
  });

  test('the amount is what the receiver got, not what the sender lost', () => {
    // A fee-based token: the sender also pays a fee in HTR.
    const out = transfersInTx(tx, { tok: 10n }, { tok: -10n, '00': -1n });
    expect(out).toEqual([
      { txId: 'abc', timestamp: 1000, direction: 'test-to-funding', tokenUid: 'tok', amount: '10' },
    ]);
  });

  test('one transfer per token', () => {
    const out = transfersInTx(tx, { '00': 100n, tok: 7n }, { '00': -100n, tok: -7n });
    expect(out.map((t) => [t.tokenUid, t.amount])).toEqual([
      ['00', '100'],
      ['tok', '7'],
    ]);
  });

  test('ignores transactions only one wallet takes part in', () => {
    expect(transfersInTx(tx, { '00': 500n }, {})).toEqual([]);
    expect(transfersInTx(tx, {}, { '00': -500n })).toEqual([]);
  });

  test('ignores tokens both wallets gained or both lost', () => {
    // Both received from a third party in the same tx.
    expect(transfersInTx(tx, { '00': 5n }, { '00': 5n })).toEqual([]);
    expect(transfersInTx(tx, { '00': -5n }, { '00': -5n })).toEqual([]);
  });

  test('accepts number balances', () => {
    expect(transfersInTx(tx, { '00': 2 }, { '00': -2 })[0].amount).toBe('2');
  });
});

describe('transferKey', () => {
  test('is unique per transaction and token', () => {
    const [htr, tok] = transfersInTx(tx, { '00': 1n, tok: 1n }, { '00': -1n, tok: -1n });
    expect(transferKey(htr)).not.toBe(transferKey(tok));
  });
});
