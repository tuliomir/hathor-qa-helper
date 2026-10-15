/**
 * The tokens added by hand (on RPC Get balance) to the address-only test
 * wallet, for the RPC stages that pick a token. Null when the test wallet
 * isn't address-only, so stages keep using the running wallet's own tokens.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { addressOnlyTokenOptions, isAddressOnly } from '../utils/addressOnlyWallet';

export function useAddressOnlyTokens(): Array<{ uid: string; name: string; symbol: string }> | null {
  const metadata = useSelector((state: RootState) => {
    const id = state.walletSelection.testWalletId;
    return id ? state.walletStore.wallets[id]?.metadata : undefined;
  });
  const allTokens = useSelector((state: RootState) => state.tokens.tokens);
  const addressOnly = metadata ? isAddressOnly(metadata) : false;
  const added = metadata?.tokens;

  return useMemo(
    () => (addressOnly ? addressOnlyTokenOptions(added ?? [], allTokens) : null),
    [addressOnly, added, allTokens]
  );
}
