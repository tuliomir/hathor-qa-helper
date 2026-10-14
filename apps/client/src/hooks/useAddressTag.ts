/**
 * Wallet tag for an address the user owns ("Test addr 0"), so self-sends
 * are obvious. Compares against addr0 of the selected wallets, the snap and
 * the well-known multisig.
 */

import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { selectSnapAddress } from '../store/slices/snapSlice';
import { WELL_KNOWN_ADDRESSES } from '../constants/addresses';

export function useAddressTag(value: string | null | undefined): string | null {
  const snapAddress = useSelector(selectSnapAddress);
  const testAddr0 = useSelector((state: RootState) => {
    const id = state.walletSelection.testWalletId;
    return id ? state.walletStore.wallets[id]?.firstAddress : undefined;
  });
  const fundAddr0 = useSelector((state: RootState) => {
    const id = state.walletSelection.fundingWalletId;
    return id ? state.walletStore.wallets[id]?.firstAddress : undefined;
  });

  if (!value) return null;
  if (value === testAddr0) return 'Test addr 0';
  if (value === fundAddr0) return 'Funding addr 0';
  if (value === snapAddress) return 'Snap addr 0';
  if (value === WELL_KNOWN_ADDRESSES.MULTISIG_ADDR0) return 'Multisig addr 0';
  return null;
}
