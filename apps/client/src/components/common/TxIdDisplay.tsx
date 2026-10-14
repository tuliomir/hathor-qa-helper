/**
 * TxIdDisplay — transaction hash, live status and explorer link in one row.
 * Status fetching stays in TxStatus; this only composes the presentation.
 */

import { Identifier } from './Identifier';
import TxStatus from './TxStatus';
import { ExplorerLink } from './ExplorerLink';

export interface TxIdDisplayProps {
  hash: string;
  /** Explorer network; ExplorerLink's default when omitted. */
  network?: string;
  /** Limit status lookups to one wallet. */
  walletId?: string;
  className?: string;
}

export function TxIdDisplay({ hash, network, walletId, className = '' }: TxIdDisplayProps) {
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <Identifier value={hash} kind="tx" />
      <TxStatus hash={hash} walletId={walletId} />
      <ExplorerLink hash={hash} network={network} />
    </div>
  );
}

export default TxIdDisplay;
