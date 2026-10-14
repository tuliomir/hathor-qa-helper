/**
 * Snap adapter for MethodCard (kept until the stage sweep moves every snap
 * stage to MethodCard directly). Adds the snap specifics: MetaMask
 * rejection detection, the formatted snap response view, tx-hash
 * extraction and mainnet arming from the snap's reported network.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { MethodCard } from '../common/MethodCard';
import { SnapResponseDisplay } from './SnapResponseDisplay';
import { parseSnapResponse, isSnapEnvelope, isTransactionLike } from '../../utils/snapResponseHelpers';
import { isSnapUserRejection } from '../../utils/snapErrors';
import { selectSnapNetwork } from '../../store/slices/snapSlice';
import type { SnapMethodData } from '../../store/slices/snapMethodsSlice';
import type { ExplorerPage } from '../../utils/networkHelpers';

interface SnapMethodCardProps {
  title: string;
  description: string;
  /** Primary button label; defaults to `title`. */
  actionLabel?: string;
  liveRequest: { method: string; params?: unknown } | null;
  methodData: SnapMethodData | null;
  isDryRun: boolean;
  onExecute: () => Promise<unknown>;
  disabled?: boolean;
  disabledReason?: string | null;
  /** Extra Compose footer actions next to the primary button. */
  secondaryActions?: React.ReactNode;
  /** Extra content at the bottom of the Inspect panel. */
  inspectExtra?: React.ReactNode;
  /** `nc_detail` when the response creates a nano contract. */
  txExplorerPage?: ExplorerPage;
  children: React.ReactNode;
}

function snapTxHash(response: unknown): string | null {
  const parsed = parseSnapResponse(response);
  const inner = isSnapEnvelope(parsed) ? (parsed as { response: unknown }).response : parsed;
  if (inner && typeof inner === 'object' && isTransactionLike(inner)) {
    return ((inner as Record<string, unknown>).hash as string | undefined) ?? null;
  }
  return null;
}

export const SnapMethodCard: React.FC<SnapMethodCardProps> = ({ disabled, disabledReason, ...props }) => {
  const snapNetwork = useSelector(selectSnapNetwork);
  return (
    <MethodCard
      {...props}
      disabled={disabled}
      disabledReason={disabledReason ?? (disabled ? 'Fill in the required inputs' : null)}
      wallet="MetaMask"
      isMainnet={snapNetwork === 'mainnet'}
      isRejection={isSnapUserRejection}
      getTxHash={snapTxHash}
      explorerNetwork={snapNetwork ?? undefined}
      renderResponse={(response) => <SnapResponseDisplay response={response} showRaw={false} />}
    />
  );
};
