/**
 * Network Swap Button Component
 * Reusable button to swap wallet network between TESTNET and MAINNET
 */

import { MdSwapVert } from 'react-icons/md';
import type { NetworkKey } from '../../constants/network';

interface NetworkSwapButtonProps {
  walletId: string;
  currentNetwork: NetworkKey;
  walletStatus: string;
  onSwap: (walletId: string, currentNetwork: NetworkKey, status: string) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}

export default function NetworkSwapButton({
  walletId,
  currentNetwork,
  walletStatus,
  onSwap,
  className = '',
  disabled = false,
}: NetworkSwapButtonProps) {
  const targetNetwork = currentNetwork === 'TESTNET' ? 'MAINNET' : 'TESTNET';
  const isSwapping = walletStatus === 'connecting' || walletStatus === 'syncing';

  return (
    <button
      onClick={() => onSwap(walletId, currentNetwork, walletStatus)}
      title={`Switch to ${targetNetwork}`}
      className={`btn btn-square text-2xs p-1 bg-gray-200 hover:bg-gray-300 border-0 ${className}`}
      disabled={disabled || isSwapping}
    >
      <MdSwapVert />
    </button>
  );
}
