/**
 * TxIdDisplay — transaction hash, live status and explorer link in one row.
 * Status fetching stays in TxStatus; this only composes the presentation.
 */

import { Identifier } from './Identifier';
import TxStatus from './TxStatus';
import { ExplorerLink } from './ExplorerLink';
import { ShieldedBadge } from './ShieldedBadge';
import type { ExplorerPage } from '../../utils/networkHelpers';

export interface TxIdDisplayProps {
  hash: string;
  /** Explorer network; ExplorerLink's default when omitted. */
  network?: string;
  /** Limit status lookups to one wallet. */
  walletId?: string;
  /** Explorer page; `nc_detail` when the hash is a nano contract ID. */
  specificPage?: ExplorerPage;
  /** Number of shielded outputs, when known. */
  shieldedCount?: number;
  /** Total outputs, for the "2 of 3 outputs shielded" badge. */
  outputCount?: number;
  className?: string;
}

export function TxIdDisplay({
  hash,
  network,
  walletId,
  specificPage,
  shieldedCount,
  outputCount,
  className = '',
}: TxIdDisplayProps) {
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <Identifier value={hash} kind={specificPage === 'nc_detail' ? 'nc' : 'tx'} />
      <TxStatus hash={hash} walletId={walletId} />
      {shieldedCount !== undefined && shieldedCount > 0 && (
        <ShieldedBadge variant="count" count={shieldedCount} total={outputCount} />
      )}
      <ExplorerLink hash={hash} network={network} specificPage={specificPage} />
    </div>
  );
}

export default TxIdDisplay;
