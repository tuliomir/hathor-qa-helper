/**
 * Whether one wallet can send shielded outputs to another right now, and
 * why not. Both must be started on a network with shielded outputs, the
 * sender's signer must be ready (it creates the outputs), and the
 * recipient's shielded address 0 must be known.
 */

import { useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { NETWORK_CONFIG } from '../constants/network';
import { deriveWalletAddress } from './useWalletAddress';
import { useSigner } from './useSigner';

export interface ShieldedTransfer {
  /** Signer session to send through; null until it is ready. */
  sessionId: string | null;
  /** Recipient's shielded (`K3…`) address 0. */
  recipient: string | null;
  /** Why the send is unavailable, or null when it can go. */
  unavailable: string | null;
}

export function useShieldedTransfer(fromWalletId: string | null, toWalletId: string | null): ShieldedTransfer {
  const from = useAppSelector((s) => (fromWalletId ? s.walletStore.wallets[fromWalletId] : undefined));
  const to = useAppSelector((s) => (toWalletId ? s.walletStore.wallets[toWalletId] : undefined));
  const signer = useSigner(fromWalletId);
  const [recipient, setRecipient] = useState<string | null>(null);
  const toReady = to?.status === 'ready';

  useEffect(() => {
    setRecipient(null);
    if (!toWalletId || !toReady || !to || !NETWORK_CONFIG[to.metadata.network].supportsShielded) return;
    let cancelled = false;
    deriveWalletAddress(toWalletId, 0, 'shielded')
      .then((address) => !cancelled && setRecipient(address))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [toWalletId, toReady, to?.metadata.network]); // eslint-disable-line react-hooks/exhaustive-deps

  let unavailable: string | null = null;
  if (!from || !to) unavailable = 'Needs both wallets';
  else if (!NETWORK_CONFIG[from.metadata.network].supportsShielded || from.metadata.network !== to.metadata.network)
    unavailable = `Both wallets must be on ${NETWORK_CONFIG.SHIELDED_TESTNET.label}`;
  else if (from.status !== 'ready' || !toReady) unavailable = 'Both wallets must be synced';
  else if (signer?.state === 'starting') unavailable = `${from.metadata.friendlyName} is preparing to sign`;
  else if (signer?.state === 'error') unavailable = `${from.metadata.friendlyName} cannot sign: ${signer.error}`;
  else if (signer?.state !== 'ready') unavailable = 'The QA server is not running (bun run dev:server)';
  else if (!recipient) unavailable = `No shielded address for ${to.metadata.friendlyName} yet`;

  return {
    sessionId: signer?.state === 'ready' ? (signer.session?.id ?? null) : null,
    recipient,
    unavailable,
  };
}
