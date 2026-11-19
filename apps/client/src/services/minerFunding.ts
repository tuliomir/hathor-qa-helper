/**
 * Fund from Miner: spend a miner's oldest mining rewards without loading the
 * miner wallet.
 *
 * `HathorWallet.start()` replays a miner address's whole history, which takes
 * many minutes. Here we derive the first addresses from the seed, page their
 * history oldest-first until a few spendable HTR outputs turn up, and spend
 * them whole with a hand-built, hand-signed transaction.
 */

import Network from '@hathor/wallet-lib/lib/models/network';
import Address from '@hathor/wallet-lib/lib/models/address';
import P2PKH from '@hathor/wallet-lib/lib/models/p2pkh';
import Input from '@hathor/wallet-lib/lib/models/input';
import Output from '@hathor/wallet-lib/lib/models/output';
import Transaction from '@hathor/wallet-lib/lib/models/transaction';
import MineTransaction from '@hathor/wallet-lib/lib/wallet/mineTransaction';
import walletUtils from '@hathor/wallet-lib/lib/utils/wallet';
import transactionUtils from '@hathor/wallet-lib/lib/utils/transaction';
import { publicKeyToP2PKH } from '@hathor/wallet-lib/lib/utils/address';
import { HATHOR_BIP44_CODE, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import type { LibNetworkName } from '@qa-helper/shared/networks';

export type FetchJson = (url: string) => Promise<unknown>;

type PrivateKey = ReturnType<typeof walletUtils.getXPrivKeyFromSeed>['privateKey'];

/** What the fullnode reports, read once per search. */
export interface NetworkParams {
  /** Blocks a mining reward must wait before it can be spent (`reward_spend_min_blocks`). */
  rewardLock: number;
  bestHeight: number;
  weightConstants: { txMinWeight: number; txWeightCoefficient: number; txMinWeightK: number };
}

/** An output as `thin_wallet/address_history` returns it. */
export interface HistoryOutput {
  value: number;
  token: string;
  spent_by: string | null;
  decoded: { address?: string; timelock?: number | null };
}

/** A transaction or block as `thin_wallet/address_history` returns it. */
export interface HistoryTx {
  tx_id: string;
  version: number;
  timestamp: number;
  is_voided: boolean;
  /** Present on blocks only. */
  height?: number;
  outputs: HistoryOutput[];
}

export interface MinerKey {
  index: number;
  address: string;
  privateKey: PrivateKey;
}

export interface MinerUtxo {
  txId: string;
  index: number;
  value: bigint;
  address: string;
  /** Set when the output is a mining reward. */
  height?: number;
}

export interface UtxoSearchResult {
  utxos: MinerUtxo[];
  pagesRead: number;
  /** Why the search ended. */
  stop: 'found' | 'history-end' | 'page-cap';
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}`);
  return res.json();
}

export async function fetchNetworkParams(
  fullNodeUrl: string,
  get: FetchJson = defaultFetchJson
): Promise<NetworkParams> {
  const [version, status] = (await Promise.all([get(`${fullNodeUrl}version`), get(`${fullNodeUrl}status`)])) as [
    {
      reward_spend_min_blocks?: number;
      min_tx_weight?: number;
      min_tx_weight_coefficient?: number;
      min_tx_weight_k?: number;
    },
    { dag?: { best_block?: { height?: number } } },
  ];
  const rewardLock = version?.reward_spend_min_blocks;
  const bestHeight = status?.dag?.best_block?.height;
  if (typeof rewardLock !== 'number') throw new Error('The fullnode /version has no reward_spend_min_blocks');
  if (typeof bestHeight !== 'number') throw new Error('The fullnode /status has no best block height');
  return {
    rewardLock,
    bestHeight,
    weightConstants: {
      txMinWeight: version.min_tx_weight ?? 0,
      txWeightCoefficient: version.min_tx_weight_coefficient ?? 0,
      txMinWeightK: version.min_tx_weight_k ?? 0,
    },
  };
}

/** Throws with a readable message when the words are not a valid seed. */
export function validateSeed(seed: string): string {
  try {
    return walletUtils.wordsValid(seed.trim()).words;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Invalid seed words');
  }
}

/** Keys and addresses at `m/44'/280'/0'/0/{0..count-1}`, as wallet-lib derives them. */
export function deriveMinerKeys(seed: string, networkName: LibNetworkName, count: number): MinerKey[] {
  const root = walletUtils.getXPrivKeyFromSeed(validateSeed(seed), { networkName });
  const change = root.deriveNonCompliantChild(`m/44'/${HATHOR_BIP44_CODE}'/0'/0`);
  const network = new Network(networkName);
  return Array.from({ length: count }, (_, index) => {
    const privateKey = change.deriveNonCompliantChild(index).privateKey;
    return { index, address: publicKeyToP2PKH(privateKey.publicKey, network), privateKey };
  });
}

/**
 * Whether one output of a history entry can be spent right now by `address`.
 *
 * @param tx       the history entry (block or transaction) holding the output
 * @param output   the output itself
 * @param address  the miner address we hold the key for
 * @param params   reward lock and best height from the fullnode
 * @param nowSeconds current unix time, for timelocks
 */
export function isSpendable(
  tx: HistoryTx,
  output: HistoryOutput,
  address: string,
  params: Pick<NetworkParams, 'rewardLock' | 'bestHeight'>,
  nowSeconds: number
): boolean {
  if (tx.is_voided || output.spent_by !== null) return false;
  if (output.token !== NATIVE_TOKEN_UID || output.decoded.address !== address) return false;
  const timelock = output.decoded.timelock;
  if (timelock != null && timelock > nowSeconds) return false;
  if (transactionUtils.isBlock(tx)) {
    // A block without a height can't be checked against the lock: skip it rather than risk a rejected send.
    if (tx.height === undefined) return false;
    return params.bestHeight - tx.height >= params.rewardLock;
  }
  return true;
}

/**
 * Page `address`'s history oldest-first and collect up to `want` spendable
 * HTR outputs. Stops early so a busy miner address never turns into a full sync.
 */
export async function findMinerUtxos({
  fullNodeUrl,
  address,
  want,
  params,
  maxPages = 20,
  nowSeconds = Math.floor(Date.now() / 1000),
  get = defaultFetchJson,
}: {
  fullNodeUrl: string;
  address: string;
  want: number;
  params: Pick<NetworkParams, 'rewardLock' | 'bestHeight'>;
  maxPages?: number;
  nowSeconds?: number;
  get?: FetchJson;
}): Promise<UtxoSearchResult> {
  const utxos: MinerUtxo[] = [];
  let hash: string | null = null;
  let pagesRead = 0;

  while (pagesRead < maxPages) {
    const query = new URLSearchParams({ 'addresses[]': address });
    if (hash) query.set('hash', hash);
    const body = (await get(`${fullNodeUrl}thin_wallet/address_history?${query}`)) as {
      success?: boolean;
      message?: string;
      history?: HistoryTx[];
      has_more?: boolean;
      first_hash?: string | null;
    };
    if (!body?.success) throw new Error(body?.message || 'The fullnode refused the address history request');
    pagesRead += 1;

    for (const tx of body.history ?? []) {
      tx.outputs.forEach((output, index) => {
        if (utxos.length >= want || !isSpendable(tx, output, address, params, nowSeconds)) return;
        utxos.push({ txId: tx.tx_id, index, value: BigInt(output.value), address, height: tx.height });
      });
      if (utxos.length >= want) return { utxos, pagesRead, stop: 'found' };
    }

    if (!body.has_more || !body.first_hash) return { utxos, pagesRead, stop: 'history-end' };
    hash = body.first_hash;
  }
  return { utxos, pagesRead, stop: 'page-cap' };
}

/**
 * Spend `utxos` whole to `destination`: one HTR output, no change. Signed and
 * weighted, ready to mine.
 */
export function buildFundingTx({
  utxos,
  keys,
  destination,
  networkName,
  weightConstants,
}: {
  utxos: MinerUtxo[];
  keys: MinerKey[];
  destination: string;
  networkName: LibNetworkName;
  weightConstants: NetworkParams['weightConstants'];
}): Transaction {
  if (utxos.length === 0) throw new Error('No UTXOs to spend');
  const network = new Network(networkName);
  const target = new Address(destination, { network });
  target.validateAddress();

  const total = utxos.reduce((sum, u) => sum + u.value, 0n);
  const script = new P2PKH(target).createScript();
  const tx = new Transaction(
    utxos.map((u) => new Input(u.txId, u.index)),
    [new Output(total, script, { tokenData: 0 })]
  );
  tx.prepareToSend(weightConstants);

  const hashToSign = tx.getDataToSignHash();
  tx.inputs.forEach((input, i) => {
    const key = keys.find((k) => k.address === utxos[i].address);
    if (!key) throw new Error(`No key for ${utxos[i].address}`);
    const signature = transactionUtils.getSignature(hashToSign, key.privateKey);
    input.setData(transactionUtils.createInputData(signature, key.privateKey.publicKey.toDER()));
  });
  return tx;
}

/**
 * Mine through the tx-mining service wallet-lib's `config` points at (call
 * `applyNetworkServices` first) and push to the fullnode. Returns the tx id.
 */
export async function mineAndPush(tx: Transaction, fullNodeUrl: string): Promise<string> {
  const miner = new MineTransaction(tx, { maxTxMiningRetries: 3 });
  miner.start();
  const mined = await miner.promise;
  tx.parents = mined.parents;
  tx.timestamp = mined.timestamp;
  tx.nonce = mined.nonce;
  tx.weight = mined.weight;

  const res = await fetch(`${fullNodeUrl}push_tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hex_tx: tx.toHex() }),
  });
  const body = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
  if (!body?.success) throw new Error(body?.message || `push_tx failed with ${res.status}`);
  tx.updateHash();
  if (!tx.hash) throw new Error('Pushed, but the tx has no hash');
  return tx.hash;
}

export { NATIVE_TOKEN_UID };
