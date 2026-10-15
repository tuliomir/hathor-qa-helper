/**
 * The test wallet's address 0 from the store: saved for address-only
 * wallets, known for seed wallets once they are running. Null otherwise.
 */

import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { walletAddress0 } from '../utils/addressOnlyWallet';

export function useTestWalletAddress0(): string | null {
  return useSelector((state: RootState) => {
    const id = state.walletSelection.testWalletId;
    return walletAddress0(id ? state.walletStore.wallets[id] : undefined);
  });
}
