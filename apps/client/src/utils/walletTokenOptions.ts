/**
 * Token choices for a started wallet: HTR, then the custom tokens wallet-lib
 * reports for it. A token missing from the token registry (details not
 * fetched yet) is still listed, under a shortened UID.
 */

import type { Token } from '../store/slices/tokensSlice';

export interface WalletTokenOption {
  uid: string;
  symbol: string;
  name: string;
}

export const HTR_OPTION: WalletTokenOption = { uid: '00', symbol: 'HTR', name: 'Hathor' };

export function walletTokenOptions(
  tokenUids: readonly string[] | undefined,
  registry: readonly Token[]
): WalletTokenOption[] {
  const custom = (tokenUids ?? [])
    .filter((uid) => uid !== HTR_OPTION.uid)
    .map((uid) => {
      const known = registry.find((t) => t.uid === uid);
      return known
        ? { uid, symbol: known.symbol, name: known.name }
        : { uid, symbol: `${uid.slice(0, 8)}…`, name: uid };
    });
  return [HTR_OPTION, ...custom];
}
