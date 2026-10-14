/**
 * Wallet Network Control Component
 *
 * Shared component for displaying wallet status, error messages, and
 * handling network swaps. Used by both Wallet Initialization and
 * Push Notifications stages.
 */

import type { NetworkKey } from '../../constants/network';
import NetworkSwapButton from './NetworkSwapButton';
import { useConfirm } from '../../hooks/useConfirm';

interface WalletNetworkControlProps {
  walletId: string;
  network: NetworkKey;
  status: string;
  error?: string | null;
  onSwapNetwork: (walletId: string, currentNetwork: NetworkKey, status: string) => void | Promise<void>;
  onForceStop?: (walletId: string) => void | Promise<void>;
}

export default function WalletNetworkControl({
  walletId,
  network,
  status,
  error,
  onSwapNetwork,
  onForceStop,
}: WalletNetworkControlProps) {
  const isStuck = status === 'connecting' || status === 'syncing';
  const { confirm, confirmDialog } = useConfirm();

  return (
    <div>
      {confirmDialog}
      <div className="flex items-center gap-2">
        <span className="badge badge-lg">{network}</span>
        <NetworkSwapButton walletId={walletId} currentNetwork={network} walletStatus={status} onSwap={onSwapNetwork} />
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-danger rounded">
          <p className="text-xs text-red-900 m-0">{error}</p>
        </div>
      )}

      {/* Force stop for stuck wallets */}
      {isStuck && onForceStop && (
        <button
          onClick={async () => {
            if (
              await confirm({
                title: 'Force stop this wallet?',
                body: `It appears stuck in the ${status} state.`,
                confirmLabel: 'Force stop',
                tone: 'danger',
              })
            ) {
              onForceStop(walletId);
            }
          }}
          className="mt-2 btn-danger py-1 px-2 text-xs"
          title="Force stop the stuck wallet"
        >
          Force Stop
        </button>
      )}
    </div>
  );
}
