/** Hathor Next addresses of seeds, derived locally (no backend). */

import { NETWORKS } from '@qa-helper/shared/networks';
import { bytesToHex, deriveAccount, encodeAddress, mnemonicToSeed, publicKeyOf } from './kit';

/** The Hathor Next address the mobile wallet shows for these words on Next testnet (testnet-alpha). */
export async function nextAddressOf(seedWords: string): Promise<string> {
  const { b } = deriveAccount(await mnemonicToSeed(seedWords));
  return encodeAddress(NETWORKS.NEXT_TESTNET.hathorNext!.serviceViewPub, bytesToHex(publicKeyOf(b)));
}
