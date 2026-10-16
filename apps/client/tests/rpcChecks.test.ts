import { describe, expect, test } from 'bun:test';
import bitcore from 'bitcore-lib';
import Network from '@hathor/wallet-lib/lib/models/network';
import Address from '@hathor/wallet-lib/lib/models/address';
import P2PKH from '@hathor/wallet-lib/lib/models/p2pkh';
import ScriptData from '@hathor/wallet-lib/lib/models/script_data';
import Output from '@hathor/wallet-lib/lib/models/output';
import Input from '@hathor/wallet-lib/lib/models/input';
import Transaction from '@hathor/wallet-lib/lib/models/transaction';
import { signMessage } from '@hathor/wallet-lib/lib/utils/crypto';
import {
  addressAnswer,
  balanceProblems,
  createdTokenProblems,
  dataOutputCheck,
  feeHeaderCheck,
  htrUtxoFilterCases,
  paysCheck,
  signProblems,
  tokenOnChainChecks,
  unpushedTxProblems,
  utxoFilterProblems,
  utxosAnswer,
  walletInformationProblems,
} from '../src/flows/rpcChecks';

const network = new Network('testnet');
const key = new bitcore.PrivateKey(undefined, network.bitcoreNetwork);
const ADDR = key.toAddress(network.bitcoreNetwork).toString();
const OTHER = new bitcore.PrivateKey(undefined, network.bitcoreNetwork).toAddress(network.bitcoreNetwork).toString();
const HASH = 'ab'.repeat(32);

describe('response checks', () => {
  test('wallet information', () => {
    const ok = { type: 12, response: { network: 'testnet', address0: ADDR } };
    expect(walletInformationProblems(ok, { address0: ADDR })).toEqual([]);
    expect(walletInformationProblems(ok, { address0: OTHER })).toHaveLength(1);
    expect(walletInformationProblems({ type: 4, response: {} }, { address0: ADDR })).toHaveLength(3);
  });

  test('address answers carry a path that ends in their index', () => {
    const answer = { type: 2, response: { address: ADDR, index: 7, addressPath: "m/44'/280'/0'/0/7" } };
    expect(addressAnswer(answer)).toEqual({
      answer: { address: ADDR, index: 7, addressPath: "m/44'/280'/0'/0/7" },
      problems: [],
    });
    expect(addressAnswer({ ...answer, response: { ...answer.response, index: 8 } }).problems).toHaveLength(1);
  });

  test('balance compares the unlocked HTR', () => {
    const answer = { type: 3, response: [{ token: { id: '00' }, balance: { unlocked: '20', locked: '0' } }] };
    expect(balanceProblems(answer, { unlocked: 20n })).toEqual([]);
    expect(balanceProblems(answer, { unlocked: 21n })[0]).toContain('0.20 HTR');
  });

  test('a signature verifies against the address it claims', () => {
    const signature = signMessage('Hello, Hathor!', key);
    const answer = {
      type: 1,
      response: { message: 'Hello, Hathor!', signature, address: { address: ADDR, index: 3, addressPath: '' } },
    };
    expect(signProblems(answer, { message: 'Hello, Hathor!', address: ADDR, index: 3 })).toEqual([]);
    const forged = { ...answer, response: { ...answer.response, signature: signMessage('Other', key) } };
    expect(signProblems(forged, { message: 'Hello, Hathor!', address: ADDR, index: 3 })).toEqual([
      `The signature does not verify for ${ADDR}`,
    ]);
  });

  test('an unpushed tx is hex that pays the address', () => {
    const script = new P2PKH(new Address(ADDR, { network })).createScript();
    const tx = new Transaction([new Input(HASH, 0)], [new Output(1n, script)]);
    const hex = tx.toHex();
    expect(unpushedTxProblems({ type: 8, response: hex }, { address: ADDR, value: 1n })).toEqual([]);
    expect(unpushedTxProblems({ type: 8, response: hex }, { address: OTHER, value: 1n })).toHaveLength(1);
    expect(unpushedTxProblems({ type: 8, response: { hash: HASH } }, { address: ADDR, value: 1n })[0]).toContain(
      'pushed the tx anyway'
    );
  });

  test('a created token has its amount and only the authorities asked for', () => {
    const answer = {
      type: 6,
      response: {
        hash: HASH,
        name: 'QA Flow Deposit',
        symbol: 'QDABC',
        outputs: [
          { value: '100', tokenData: 1 },
          { value: '2', tokenData: 129 },
          { value: '5', tokenData: 0 },
        ],
      },
    };
    const expected = { name: 'QA Flow Deposit', symbol: 'QDABC', amount: 100n, mint: false, melt: true };
    expect(createdTokenProblems(answer, expected)).toEqual([]);
    expect(createdTokenProblems(answer, { ...expected, mint: true })).toEqual(['The tx has no mint authority']);
    expect(createdTokenProblems(answer, { ...expected, melt: false })).toEqual(['The tx has a melt authority']);
  });
});

describe('UTXO filters over scattered amounts', () => {
  // 0.15 HTR scattered: 1, 2, 3, 4, 5.
  const scattered = [1n, 2n, 3n, 4n, 5n];
  const { above, between } = htrUtxoFilterCases(scattered);
  const mine = (a: string) => a === ADDR;
  const utxo = (amount: bigint, address = ADDR) => ({ address, amount, locked: false });

  test('picks strict bounds from the amounts', () => {
    expect([above.amountBiggerThan, above.amountSmallerThan, above.matching, above.count]).toEqual([
      2n,
      null,
      [3n, 4n, 5n],
      3,
    ]);
    expect([between.amountBiggerThan, between.amountSmallerThan, between.matching, between.count]).toEqual([
      1n,
      5n,
      [2n, 3n, 4n],
      2,
    ]);
  });

  test('accepts the matching UTXOs, in any order, up to the limit', () => {
    expect(utxoFilterProblems([utxo(5n), utxo(3n), utxo(4n)], above, mine)).toEqual([]);
    expect(utxoFilterProblems([utxo(4n), utxo(2n)], between, mine)).toEqual([]);
  });

  test('flags the bound itself, extra or missing UTXOs, and foreign addresses', () => {
    expect(utxoFilterProblems([utxo(2n), utxo(3n), utxo(4n)], above, mine)).toEqual([
      'The UTXO of 0.02 HTR does not match the filter',
    ]);
    expect(utxoFilterProblems([utxo(2n), utxo(3n), utxo(4n)], between, mine)).toEqual(['Expected 2 UTXOs, got 3']);
    expect(utxoFilterProblems([utxo(2n), utxo(3n, OTHER)], between, mine)).toEqual([
      `The UTXO at ${OTHER} is not the test wallet's`,
    ]);
  });

  test('reads the answer and its available total', () => {
    const answer = {
      type: 5,
      response: {
        total_amount_available: '7',
        utxos: [
          { address: ADDR, amount: '3', tx_id: HASH, locked: false, index: 0 },
          { address: ADDR, amount: '4', tx_id: HASH, locked: false, index: 1 },
        ],
      },
    };
    expect(utxosAnswer(answer).problems).toEqual([]);
    expect(
      utxosAnswer({ ...answer, response: { ...answer.response, total_amount_available: '8' } }).problems
    ).toHaveLength(1);
  });
});

describe('on-chain checks', () => {
  test('a token as thin_wallet/token reports it', () => {
    // A fee token on testnet (trimmed).
    const info = { version: 2, total: 987654, mint: [{ tx_id: HASH, index: 2 }], melt: [{ tx_id: HASH, index: 3 }] };
    const expected = { name: 'x', symbol: 'x', amount: 987654n, mint: true, melt: true, version: 'fee' as const };
    expect(tokenOnChainChecks(info, expected).every((c) => c.ok)).toBe(true);
    expect(
      tokenOnChainChecks(info, { ...expected, version: 'deposit', mint: false }).filter((c) => !c.ok)
    ).toHaveLength(2);
  });

  test('fee header, payment and data output', () => {
    const data = 'QA flow data output';
    const tx = {
      fees: [{ token_uid: '00', amount: 1 }],
      outputs: [
        { value: 1, token_data: 0, decoded: { address: ADDR }, script: '' },
        { value: 1, token_data: 0, script: new ScriptData(data).createScript().toString('base64') },
      ],
    };
    expect(feeHeaderCheck(tx, 1n).ok).toBe(true);
    expect(feeHeaderCheck(tx, 0n).ok).toBe(false);
    expect(feeHeaderCheck({ fees: [] }, null).ok).toBe(false);
    expect(paysCheck(tx, { address: ADDR, value: 1n }).ok).toBe(true);
    expect(paysCheck(tx, { address: OTHER, value: 1n }).ok).toBe(false);
    expect(dataOutputCheck(tx, data).ok).toBe(true);
    expect(dataOutputCheck(tx, 'other').ok).toBe(false);
  });
});
