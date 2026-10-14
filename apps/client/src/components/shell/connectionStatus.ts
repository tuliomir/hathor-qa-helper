/**
 * Status of the RPC (WalletConnect) session and the MetaMask Snap, as shown
 * in the stage navigation and the wallet context bar.
 */

import { useAppSelector } from '../../store/hooks';
import type { StatusTone } from '../../utils/statusTone';

export interface ConnectionStatus {
  tone: StatusTone;
  word: string;
  detail: string;
}

export function useRpcStatus(): ConnectionStatus {
  const hasSession = useAppSelector((s) => Boolean(s.walletConnect.session));
  const connecting = useAppSelector((s) => s.walletConnect.isConnecting);
  const peer = useAppSelector((s) => s.walletConnect.session?.peer?.metadata?.name ?? null);

  if (hasSession)
    return { tone: 'success', word: 'On', detail: peer ? `RPC session connected to ${peer}` : 'RPC session connected' };
  if (connecting) return { tone: 'progress', word: 'Connecting', detail: 'RPC session connecting' };
  return { tone: 'idle', word: 'Off', detail: 'RPC session not connected' };
}

export function useSnapStatus(): ConnectionStatus & { network: string | null } {
  const connected = useAppSelector((s) => s.snap.isConnected);
  const network = useAppSelector((s) => s.snap.network);

  if (connected) {
    return {
      tone: 'success',
      word: 'On',
      detail: network ? `Snap connected on ${network}` : 'Snap connected',
      network,
    };
  }
  return { tone: 'idle', word: 'Off', detail: 'Snap not connected', network };
}
