/**
 * NetworkSwapButton — icon button that moves a wallet to the next network
 * (see nextNetwork). Disabled while the wallet is connecting or syncing.
 */

import { MdSwapVert } from 'react-icons/md';
import { NETWORK_CONFIG, nextNetwork, type NetworkKey } from '../../constants/network';

interface NetworkSwapButtonProps {
  walletId: string;
  /** Names the wallet in the accessible label. */
  walletName?: string;
  currentNetwork: NetworkKey;
  walletStatus: string;
  onSwap: (walletId: string, currentNetwork: NetworkKey, status: string) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}

export default function NetworkSwapButton({
  walletId,
  walletName,
  currentNetwork,
  walletStatus,
  onSwap,
  className = '',
  disabled = false,
}: NetworkSwapButtonProps) {
  const target = NETWORK_CONFIG[nextNetwork(currentNetwork)].label;
  const isSwapping = walletStatus === 'connecting' || walletStatus === 'syncing';

  return (
    <button
      type="button"
      onClick={() => onSwap(walletId, currentNetwork, walletStatus)}
      title={`Switch to ${target}`}
      aria-label={walletName ? `Switch ${walletName} to ${target}` : `Switch to ${target}`}
      className={`btn btn-ghost btn-xs btn-square ${className}`}
      disabled={disabled || isSwapping}
    >
      <MdSwapVert aria-hidden="true" />
    </button>
  );
}
