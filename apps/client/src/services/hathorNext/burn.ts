/**
 * Checks the burn the Hathor Next backend built before the wallet signs it,
 * as hathor-wallet-mobile's burnCheck does. A burn moves HTR to Hathor Next
 * by paying the transfer address, from which nothing spends, and names where
 * the HTR arrives in a data output; a wrong destination loses the HTR.
 *
 * - output 0 is the data output `"CT" ‖ 1 ‖ dest_network ‖ A ‖ B`, naming the
 *   pinned Hathor Next network and the chosen Hathor Next address;
 * - one output pays the pinned transfer address exactly the amount;
 * - at most one more pays the change to the address this wallet gave;
 * - the inputs are exactly the chosen UTXOs, and nothing else is in it.
 */

import { Address, constants, helpersUtils, Network } from '@hathor/wallet-lib';
import type Transaction from '@hathor/wallet-lib/lib/models/transaction';
import { bytesToHex, decodeAddressKeys } from './kit';

/** The value of the burn's data output, in base units: hathor-core needs a positive value. */
export const BURN_DATA_VALUE = 1n;
const PAYLOAD_LEN = 99;
const OP_PUSHDATA1 = 0x4c;
const OP_CHECKSIG = 0xac;

export class BurnRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BurnRefusedError';
  }
}

/** The payload of a data script `push(payload) OP_CHECKSIG`, or null for any other script. */
export function dataScriptPayload(script: Uint8Array): Uint8Array | null {
  if (script.length < 2 || script[script.length - 1] !== OP_CHECKSIG) return null;
  let start: number;
  let len: number;
  if (script[0] < OP_PUSHDATA1) {
    len = script[0];
    start = 1;
  } else if (script[0] === OP_PUSHDATA1) {
    len = script[1];
    start = 2;
  } else {
    return null;
  }
  if (start + len + 1 !== script.length) return null;
  return script.slice(start, start + len);
}

/** `"CT" ‖ 1 ‖ dest_network ‖ A ‖ B`, hex fields; null for anything else. */
export function parseBurnPayload(
  payload: Uint8Array | null
): { destinationNetwork: string; view: string; spend: string } | null {
  if (payload?.length !== PAYLOAD_LEN || payload[0] !== 0x43 || payload[1] !== 0x54 || payload[2] !== 1) {
    return null;
  }
  return {
    destinationNetwork: bytesToHex(payload.slice(3, 35)),
    view: bytesToHex(payload.slice(35, 67)),
    spend: bytesToHex(payload.slice(67, 99)),
  };
}

export interface BurnExpectation {
  network: Network;
  utxos: { txId: string; index: number; value: bigint }[];
  amount: bigint;
  transferAddress: string;
  changeAddress: string | null;
  destinationNetwork: string;
  /** The Hathor Next address chosen. */
  destination: string;
}

const scriptHex = (address: string, network: Network) => bytesToHex(new Address(address, { network }).getScript());

/** The parsed burn, ready to sign; throws BurnRefusedError when it is anything else. */
export function checkBurn(txHex: string, expected: BurnExpectation): Transaction {
  const refuse = (message: string): never => {
    throw new BurnRefusedError(message);
  };
  let tx: Transaction;
  try {
    tx = helpersUtils.createTxFromHex(txHex, expected.network) as Transaction;
  } catch (e) {
    return refuse(`The burn can't be read: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (tx.version !== constants.DEFAULT_TX_VERSION || (tx.tokens ?? []).length > 0 || (tx.headers ?? []).length > 0) {
    refuse('The burn is not a plain transaction.');
  }
  if (tx.signalBits !== 0) refuse('The burn carries signal bits.');

  const chosen = new Set(expected.utxos.map((u) => `${u.txId}:${u.index}`));
  const spent = tx.inputs.map((input) => `${input.hash}:${input.index}`);
  if (spent.length !== chosen.size || spent.some((key) => !chosen.has(key)) || new Set(spent).size !== spent.length) {
    refuse('The burn spends other outputs than the ones chosen.');
  }
  const total = expected.utxos.reduce((sum, u) => sum + u.value, 0n);

  const [data, ...rest] = tx.outputs;
  if (!data || BigInt(data.value) !== BURN_DATA_VALUE || data.tokenData !== 0) {
    refuse("The burn doesn't start with its data output.");
  }
  const named = parseBurnPayload(dataScriptPayload(Uint8Array.from(data.script)));
  let wanted: { view: string; spend: string };
  try {
    wanted = decodeAddressKeys(expected.destination);
  } catch (e) {
    return refuse(`The Hathor Next address can't be read: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (
    !named ||
    named.destinationNetwork !== expected.destinationNetwork ||
    named.view !== wanted.view ||
    named.spend !== wanted.spend
  ) {
    refuse('The burn sends the HTR somewhere else than the chosen Hathor Next address.');
  }

  const transferScript = scriptHex(expected.transferAddress, expected.network);
  const changeScript = expected.changeAddress ? scriptHex(expected.changeAddress, expected.network) : null;
  const transfers = rest.filter((o) => bytesToHex(Uint8Array.from(o.script)) === transferScript);
  const changes = rest.filter((o) => changeScript && bytesToHex(Uint8Array.from(o.script)) === changeScript);
  if (transfers.length !== 1 || changes.length > 1 || transfers.length + changes.length !== rest.length) {
    refuse('The burn pays other outputs than the transfer and the change.');
  }
  if (rest.some((o) => o.tokenData !== 0)) refuse('The burn moves another token than HTR.');
  if (BigInt(transfers[0].value) !== expected.amount) refuse('The burn moves another amount than the one chosen.');
  const change = changes.length ? BigInt(changes[0].value) : 0n;
  if (total !== expected.amount + BURN_DATA_VALUE + change) refuse("The burn's inputs and outputs don't add up.");
  return tx;
}

/** Each input's signed data, hex, in input order. */
export function inputDataOf(tx: Transaction): string[] {
  return tx.inputs.map((input) => {
    if (!input.data) throw new Error('An input is not signed.');
    return bytesToHex(Uint8Array.from(input.data));
  });
}
