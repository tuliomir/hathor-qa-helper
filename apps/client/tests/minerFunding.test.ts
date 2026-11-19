import { describe, expect, test } from 'bun:test';
import bitcore from 'bitcore-lib';
import walletUtils from '@hathor/wallet-lib/lib/utils/wallet';
import { deriveAddressFromXPubP2PKH } from '@hathor/wallet-lib/lib/utils/address';
import {
  buildFundingTx,
  deriveMinerKeys,
  fetchNetworkParams,
  findMinerUtxos,
  isSpendable,
  type HistoryOutput,
  type HistoryTx,
} from '../src/services/minerFunding';

const SEED =
  'upon tennis increase embark dismiss diamond monitor face magnet jungle scout salute rural master shoulder cry juice jeans radar present close meat antenna mind';
const NODE = 'http://node/v1a/';
const NOW = 1_800_000_000;
const PARAMS = { rewardLock: 300, bestHeight: 10_000 };

const [KEY0, KEY1] = deriveMinerKeys(SEED, 'testnet', 2);
const ADDR = KEY0.address;
const OTHER = KEY1.address;

function out(overrides: Partial<HistoryOutput> = {}): HistoryOutput {
  return { value: 6400, token: '00', spent_by: null, decoded: { address: ADDR, timelock: null }, ...overrides };
}

function block(height: number, outputs: HistoryOutput[] = [out()]): HistoryTx {
  return { tx_id: `block-${height}`, version: 0, timestamp: 1, is_voided: false, height, outputs };
}

function tx(id: string, outputs: HistoryOutput[], extra: Partial<HistoryTx> = {}): HistoryTx {
  return { tx_id: id, version: 1, timestamp: 1, is_voided: false, outputs, ...extra };
}

describe('deriveMinerKeys', () => {
  test('matches the addresses wallet-lib derives for the same seed', () => {
    const xpub = walletUtils.getXPubKeyFromSeed(SEED, { networkName: 'testnet', accountDerivationIndex: "0'/0" });
    expect(KEY0.address).toBe(deriveAddressFromXPubP2PKH(xpub, 0, 'testnet').base58);
    expect(KEY1.address).toBe(deriveAddressFromXPubP2PKH(xpub, 1, 'testnet').base58);
  });

  test('rejects invalid words', () => {
    expect(() => deriveMinerKeys('not a seed', 'testnet', 1)).toThrow();
  });
});

describe('isSpendable', () => {
  const check = (t: HistoryTx, o: HistoryOutput = t.outputs[0]) => isSpendable(t, o, ADDR, PARAMS, NOW);

  test('a mature, unspent HTR reward to our address', () => {
    expect(check(block(100))).toBe(true);
  });

  test('a reward exactly at the lock is spendable, one block short is not', () => {
    expect(check(block(PARAMS.bestHeight - PARAMS.rewardLock))).toBe(true);
    expect(check(block(PARAMS.bestHeight - PARAMS.rewardLock + 1))).toBe(false);
  });

  test('a 1-block lock lets the previous block be spent', () => {
    expect(isSpendable(block(9_999), out(), ADDR, { rewardLock: 1, bestHeight: 10_000 }, NOW)).toBe(true);
  });

  test('spent, voided, other token, other address', () => {
    expect(check(block(100, [out({ spent_by: 'abc' })]))).toBe(false);
    expect(check({ ...block(100), is_voided: true })).toBe(false);
    expect(check(block(100, [out({ token: '00ff' })]))).toBe(false);
    expect(check(block(100, [out({ decoded: { address: OTHER } })]))).toBe(false);
  });

  test('timelocks', () => {
    expect(check(tx('t', [out({ decoded: { address: ADDR, timelock: NOW + 60 } })]))).toBe(false);
    expect(check(tx('t', [out({ decoded: { address: ADDR, timelock: NOW - 60 } })]))).toBe(true);
  });

  test('a plain transaction output has no reward lock', () => {
    expect(check(tx('t', [out()]))).toBe(true);
  });
});

describe('findMinerUtxos', () => {
  function pages(...history: HistoryTx[][]) {
    const urls: string[] = [];
    const get = async (url: string) => {
      urls.push(url);
      const i = urls.length - 1;
      return { success: true, history: history[i], has_more: i < history.length - 1, first_hash: `page-${i + 1}` };
    };
    return { get, urls };
  }

  test('stops on the first page once it has enough', async () => {
    const { get, urls } = pages([block(1), block(2), block(3)], [block(4)]);
    const res = await findMinerUtxos({
      fullNodeUrl: NODE,
      address: ADDR,
      want: 2,
      params: PARAMS,
      nowSeconds: NOW,
      get,
    });
    expect(res.stop).toBe('found');
    expect(res.utxos.map((u) => u.txId)).toEqual(['block-1', 'block-2']);
    expect(res.utxos[0].value).toBe(6400n);
    expect(urls).toHaveLength(1);
  });

  test('pages forward with the hash the fullnode gave', async () => {
    const { get, urls } = pages([block(1, [out({ spent_by: 'x' })])], [block(2)]);
    const res = await findMinerUtxos({
      fullNodeUrl: NODE,
      address: ADDR,
      want: 1,
      params: PARAMS,
      nowSeconds: NOW,
      get,
    });
    expect(res).toMatchObject({ stop: 'found', pagesRead: 2 });
    expect(new URL(urls[1]).searchParams.get('hash')).toBe('page-1');
    expect(new URL(urls[1]).searchParams.get('addresses[]')).toBe(ADDR);
  });

  test('reports the end of history and the page cap', async () => {
    const spent = block(1, [out({ spent_by: 'x' })]);
    const end = await findMinerUtxos({
      fullNodeUrl: NODE,
      address: ADDR,
      want: 1,
      params: PARAMS,
      nowSeconds: NOW,
      get: pages([spent]).get,
    });
    expect(end).toMatchObject({ stop: 'history-end', utxos: [] });
    const cap = await findMinerUtxos({
      fullNodeUrl: NODE,
      address: ADDR,
      want: 1,
      params: PARAMS,
      nowSeconds: NOW,
      maxPages: 2,
      get: pages([spent], [spent], [block(5)]).get,
    });
    expect(cap).toMatchObject({ stop: 'page-cap', pagesRead: 2, utxos: [] });
  });
});

describe('fetchNetworkParams', () => {
  test('reads the reward lock, best height and weight constants', async () => {
    const get = async (url: string) =>
      url.endsWith('version')
        ? { reward_spend_min_blocks: 1, min_tx_weight: 8, min_tx_weight_coefficient: 0, min_tx_weight_k: 0 }
        : { dag: { best_block: { height: 42 } } };
    expect(await fetchNetworkParams(NODE, get)).toEqual({
      rewardLock: 1,
      bestHeight: 42,
      weightConstants: { txMinWeight: 8, txWeightCoefficient: 0, txMinWeightK: 0 },
    });
  });

  test('fails loudly when the node does not report the lock', async () => {
    await expect(fetchNetworkParams(NODE, async () => ({}))).rejects.toThrow('reward_spend_min_blocks');
  });
});

describe('buildFundingTx', () => {
  test('spends every UTXO whole to one output, each input signed by its key', () => {
    const utxos = [
      { txId: '00'.repeat(32), index: 0, value: 6400n, address: KEY0.address },
      { txId: '11'.repeat(32), index: 2, value: 6400n, address: KEY1.address },
    ];
    const t = buildFundingTx({
      utxos,
      keys: [KEY0, KEY1],
      destination: OTHER,
      networkName: 'testnet',
      weightConstants: { txMinWeight: 8, txWeightCoefficient: 0, txMinWeightK: 0 },
    });
    expect(t.outputs).toHaveLength(1);
    expect(t.outputs[0].value).toBe(12800n);
    expect(t.weight).toBeGreaterThanOrEqual(8);

    const hash = t.getDataToSignHash();
    t.inputs.forEach((input, i) => {
      const data = input.data!;
      const sig = data.subarray(1, 1 + data[0]);
      const pub = data.subarray(2 + data[0]);
      const pubKey = new bitcore.PublicKey(pub);
      expect(pubKey.toString()).toBe([KEY0, KEY1][i].privateKey.publicKey.toString());
      const signature = bitcore.crypto.Signature.fromDER(sig);
      expect(bitcore.crypto.ECDSA.verify(hash, signature, pubKey)).toBe(true);
    });
  });

  test('rejects an address from another network', () => {
    const [mainKey] = deriveMinerKeys(SEED, 'mainnet', 1);
    expect(() =>
      buildFundingTx({
        utxos: [{ txId: '00'.repeat(32), index: 0, value: 1n, address: KEY0.address }],
        keys: [KEY0],
        destination: mainKey.address,
        networkName: 'testnet',
        weightConstants: { txMinWeight: 8, txWeightCoefficient: 0, txMinWeightK: 0 },
      })
    ).toThrow();
  });
});
