/**
 * Read side of signers for the Shielded stages. `useSignerSync` (shell)
 * starts and stops them; stages never do.
 */

import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectQaServer, signerForWallet, type SignerInfo } from '../store/slices/qaServerSlice';
import { healthProbeFinished, healthProbeStarted } from '../store/slices/helperServerSlice';
import { probeHealth } from '../services/helperServerHealth';
import { NETWORK_CONFIG } from '../constants/network';
import { isAddressOnly } from '../utils/addressOnlyWallet';
import type { WalletMetadata } from '../types/walletStore';
import type { WalletStatus } from '../types/wallet';

export function useSigner(walletId: string | null): SignerInfo | null {
  const qaServer = useAppSelector(selectQaServer);
  const firstAddress = useAppSelector((s) => (walletId ? s.walletStore.wallets[walletId]?.firstAddress : undefined));
  return useMemo(
    () => (walletId ? signerForWallet(qaServer, walletId, firstAddress) : null),
    [qaServer, walletId, firstAddress]
  );
}

export interface ShieldedWallet {
  id: string;
  name: string;
  metadata: WalletMetadata;
  status: WalletStatus;
  role: 'funding' | 'test' | null;
}

/** Seed wallets on a network with shielded outputs, funding and test wallets first. */
export function useShieldedWallets(): ShieldedWallet[] {
  const wallets = useAppSelector((s) => s.walletStore.wallets);
  const { fundingWalletId, testWalletId } = useAppSelector((s) => s.walletSelection);
  return useMemo(() => {
    const role = (id: string): ShieldedWallet['role'] =>
      id === fundingWalletId ? 'funding' : id === testWalletId ? 'test' : null;
    const rank = { funding: 0, test: 1 } as const;
    return Object.values(wallets)
      .filter((w) => !isAddressOnly(w.metadata) && NETWORK_CONFIG[w.metadata.network]?.supportsShielded)
      .map((w) => ({
        id: w.metadata.id,
        name: w.metadata.friendlyName,
        metadata: w.metadata,
        status: w.status,
        role: role(w.metadata.id),
      }))
      .sort((a, b) => (a.role ? rank[a.role] : 2) - (b.role ? rank[b.role] : 2) || a.name.localeCompare(b.name));
  }, [wallets, fundingWalletId, testWalletId]);
}

/** One health check now (the "Check again" button); the shell keeps polling on its own schedule. */
export function useCheckServerNow() {
  const dispatch = useAppDispatch();
  return useCallback(async () => {
    dispatch(healthProbeStarted({ manual: true }));
    const outcome = await probeHealth();
    dispatch(
      healthProbeFinished({
        outcome,
        latencyMs: outcome.kind === 'online' ? outcome.latencyMs : undefined,
        at: Date.now(),
      })
    );
  }, [dispatch]);
}
