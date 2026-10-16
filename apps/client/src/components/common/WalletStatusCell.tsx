/**
 * WalletStatusCell — a wallet's runtime state (from walletRuntimeView), its
 * HTR balance when ready, and the reason when a start failed.
 */

import type { WalletStatus } from '../../types/wallet';
import { formatBalance } from '../../utils/balanceUtils';
import { walletRuntimeView } from '../../utils/walletRuntimeView';
import { StatusChip } from '../ui/StatusChip';

export interface WalletStatusCellProps {
  wallet: { status: WalletStatus; error?: string; balance?: bigint };
}

export function WalletStatusCell({ wallet }: WalletStatusCellProps) {
  const view = walletRuntimeView(wallet);
  return (
    <span className="flex flex-col items-start gap-0.5">
      <StatusChip status={wallet.status} label={view.label} tone={view.tone} />
      {wallet.status === 'ready' && (
        <span className="whitespace-nowrap font-mono text-data-sm">
          {formatBalance(wallet.balance ?? 0n)} <span className="font-sans text-ink-muted">HTR</span>
        </span>
      )}
      {view.detail && (
        <span className="text-caption text-error" title={view.rawError ?? undefined}>
          {view.detail}
        </span>
      )}
    </span>
  );
}

export default WalletStatusCell;
