/**
 * useRpcAddressMismatch — compares the RPC session's first address with the
 * test wallet's address 0. Stages that assume the connected wallet is the
 * test wallet block sending (not dry run) while they differ.
 */

import { useSelector } from 'react-redux';
import { useTestWalletAddress0 } from './useTestWalletAddress';
import { selectIsWalletConnectConnected, selectWalletConnectFirstAddress } from '../store/slices/walletConnectSlice';

export interface RpcAddressMismatch {
  connectedAddress: string;
  testWalletAddress: string;
}

/** The two addresses when they differ, else null. */
export function useRpcAddressMismatch(): RpcAddressMismatch | null {
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  // Address 0 from the store, so address-only test wallets are compared too.
  const testWalletAddress = useTestWalletAddress0();

  if (!isConnected || !connectedAddress || !testWalletAddress) return null;
  if (connectedAddress.toLowerCase() === testWalletAddress.toLowerCase()) return null;
  return { connectedAddress, testWalletAddress };
}

export const ADDRESS_MISMATCH_REASON = 'Connected wallet differs from the test wallet';
