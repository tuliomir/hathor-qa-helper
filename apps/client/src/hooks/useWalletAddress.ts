/**
 * A client wallet's address at an index, transparent (legacy chain) or
 * shielded (`K3…`). The two chains share index numbers, not keys
 * (`knowledge/shielded-semantics.md` §1). Derived by the browser wallet,
 * so the wallet must be started.
 */

import { useEffect, useState } from 'react';
import { walletInstancesMap } from '../store/slices/walletStoreSlice';
import { useAppSelector } from '../store/hooks';

export type AddressKind = 'transparent' | 'shielded';

export interface WalletAddressState {
  address: string | null;
  error: string | null;
  loading: boolean;
}

export async function deriveWalletAddress(walletId: string, index: number, kind: AddressKind): Promise<string> {
  const instance = walletInstancesMap.get(walletId);
  if (!instance) throw new Error('Wallet not started');
  return kind === 'shielded' ? instance.getAddressAtIndex(index, { legacy: false }) : instance.getAddressAtIndex(index);
}

export function useWalletAddress(walletId: string | null, index: number, kind: AddressKind): WalletAddressState {
  const ready = useAppSelector((s) => (walletId ? s.walletStore.wallets[walletId]?.status === 'ready' : false));
  const [state, setState] = useState<WalletAddressState>({ address: null, error: null, loading: false });

  useEffect(() => {
    if (!walletId || !ready || !Number.isInteger(index) || index < 0) {
      // A wallet that isn't started is not an error; ShieldedWalletSelect offers to start it.
      setState({ address: null, error: null, loading: false });
      return;
    }
    let cancelled = false;
    setState({ address: null, error: null, loading: true });
    deriveWalletAddress(walletId, index, kind)
      .then((address) => !cancelled && setState({ address, error: null, loading: false }))
      .catch(
        (err: unknown) =>
          !cancelled &&
          setState({ address: null, error: err instanceof Error ? err.message : String(err), loading: false })
      );
    return () => {
      cancelled = true;
    };
  }, [walletId, ready, index, kind]);

  return state;
}
