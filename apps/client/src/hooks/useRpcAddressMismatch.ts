/**
 * useRpcAddressMismatch — compares the RPC session's first address with the
 * test wallet's address 0. Stages that assume the connected wallet is the
 * test wallet block sending (not dry run) while they differ.
 */

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useWalletStore } from './useWalletStore';
import { selectIsWalletConnectConnected, selectWalletConnectFirstAddress } from '../store/slices/walletConnectSlice';

export interface RpcAddressMismatch {
  connectedAddress: string;
  testWalletAddress: string;
}

/** The two addresses when they differ, else null. */
export function useRpcAddressMismatch(): RpcAddressMismatch | null {
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const { getWallet } = useWalletStore();
  // Instances live outside Redux (walletInstancesMap); Redux only has metadata.
  const instance = (testWalletId ? getWallet(testWalletId)?.instance : null) as
    | { getAddressAtIndex?: (index: number) => Promise<string> }
    | null
    | undefined;
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!instance?.getAddressAtIndex) {
      setTestWalletAddress(null);
      return;
    }
    instance
      .getAddressAtIndex(0)
      .then((address) => !cancelled && setTestWalletAddress(address))
      .catch((error) => {
        console.error('Failed to get test wallet address:', error);
        if (!cancelled) setTestWalletAddress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [instance]);

  if (!isConnected || !connectedAddress || !testWalletAddress) return null;
  if (connectedAddress.toLowerCase() === testWalletAddress.toLowerCase()) return null;
  return { connectedAddress, testWalletAddress };
}

export const ADDRESS_MISMATCH_REASON = 'Connected wallet differs from the test wallet';
