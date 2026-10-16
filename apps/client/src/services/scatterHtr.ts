/**
 * Scatter funds: sends the test wallet's transparent HTR back to its address
 * 0 as UTXOs of 1, 2, 3 … base units (`computeScatterOutputs`), so the
 * `htr_getUtxos` amount filters have distinct amounts to pick from. Shared by
 * the Get UTXOs stage and the RPC flow.
 */

import type { HathorWallet } from '@hathor/wallet-lib';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import type { NetworkKey } from '../constants/network';
import { WALLET_CONFIG } from '../constants/network';
import { computeScatterOutputs, scatterShortfallMessage } from '../utils/scatterFunds';
import { applyNetworkServices } from './networkServices';
import { shieldedSweepNotice, splitAvailableUtxos } from './shieldedUtxos';

export interface ScatterResult {
  txHash: string;
  /** The UTXO amounts created, ascending, in base units. */
  amounts: bigint[];
}

/** Throws with the shortfall when the HTR can't make 3 distinct UTXOs. */
export async function scatterHtr(wallet: HathorWallet, network: NetworkKey): Promise<ScatterResult> {
  const addr0 = await wallet.getAddressAtIndex(0);
  // Only transparent HTR: getBalance() also counts shielded UTXOs, which the browser cannot spend.
  const htrSplit = await splitAvailableUtxos(wallet, NATIVE_TOKEN_UID);
  const unlocked = htrSplit.transparent.amount;
  // Transfers are feeless and the outputs sum exactly to the input, so no reserve is needed.
  const amounts = computeScatterOutputs(unlocked);
  if (amounts.length === 0) {
    const shieldedNote = shieldedSweepNotice([htrSplit]);
    throw new Error(scatterShortfallMessage(unlocked) + (shieldedNote ? ` (${shieldedNote}.)` : ''));
  }
  const outputs = amounts.map((amount) => ({ address: addr0, value: amount, token: NATIVE_TOKEN_UID }));
  applyNetworkServices(network);
  const sendTx = await wallet.sendManyOutputsSendTransaction(outputs, {
    changeAddress: addr0,
    pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
  });
  const tx = await sendTx.run();
  if (!tx?.hash) throw new Error('The scatter tx was sent without a hash');
  return { txHash: tx.hash, amounts };
}
