/**
 * Wallet Network Control Component
 *
 * A wallet's network chip with a swap button, its error message, and a
 * force stop for wallets stuck connecting or syncing.
 */

import type { NetworkKey } from '../../constants/network';
import NetworkChip from './NetworkChip';
import NetworkSwapButton from './NetworkSwapButton';
import { useConfirm } from '../../hooks/useConfirm';

interface WalletNetworkControlProps {
  walletId: string;
  walletName?: string;
  network: NetworkKey;
  status: string;
  error?: string | null;
  onSwapNetwork: (
    walletId: string,
    currentNetwork: NetworkKey,
    status: string,
    target: NetworkKey
  ) => void | Promise<void>;
  onForceStop?: (walletId: string) => void | Promise<void>;
}

export default function WalletNetworkControl({
  walletId,
  walletName,
  network,
  status,
  error,
  onSwapNetwork,
  onForceStop,
}: WalletNetworkControlProps) {
  const isStuck = status === 'connecting' || status === 'syncing';
  const { confirm, confirmDialog } = useConfirm();

  const forceStop = async () => {
    const ok = await confirm({
      title: 'Force stop this wallet?',
      body: `It appears stuck in the ${status} state.`,
      confirmLabel: 'Force stop',
      tone: 'danger',
    });
    if (ok) onForceStop?.(walletId);
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      {confirmDialog}
      <div className="flex items-center gap-1">
        <NetworkChip network={network} size="sm" />
        <NetworkSwapButton
          walletId={walletId}
          walletName={walletName}
          currentNetwork={network}
          walletStatus={status}
          onSwap={onSwapNetwork}
        />
      </div>

      {error && (
        <p className="m-0 text-caption text-error" role="alert">
          {error}
        </p>
      )}

      {isStuck && onForceStop && (
        <button type="button" onClick={forceStop} className="btn btn-error btn-outline btn-xs">
          Force stop
        </button>
      )}
    </div>
  );
}
