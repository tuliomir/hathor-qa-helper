/**
 * Snap Get Xpub Stage
 *
 * Tests htr_getXpub via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useRequireSnap } from '../../hooks/useRequirements';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Callout } from '../ui/Callout';
import { firstUnmetReason } from '../../utils/requirements';

const NETWORK_OPTIONS = [
  { value: 'testnet', label: 'Testnet' },
  { value: 'mainnet', label: 'Mainnet' },
] as const;

export const SnapGetXpubStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('getXpub');
  const snapRequirement = useRequireSnap();

  const [network, setNetwork] = useState<string>('testnet');

  const liveRequest = useMemo(() => ({ method: 'htr_getXpub', params: { network } }), [network]);

  const handleExecute = () => execute((h) => h.getXpub(network));

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-get-xpub"
        description="Get the snap wallet's extended public key. Needs approval in MetaMask."
        method="htr_getXpub"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <Callout tone="warning" title="Restricted to allowed origins">
        <p className="m-0">
          The snap only answers <code className="font-mono text-data-sm">htr_getXpub</code> from allowed origins. A
          &quot;not authorized for origin&quot; error means this origin is missing from the snap&apos;s{' '}
          <code className="font-mono text-data-sm">RPC_RESTRICTIONS</code>.
        </p>
        <p className="m-0 mt-1">
          In <code className="font-mono text-data-sm">hathor-rpc-lib/packages/snap/src/constants.ts</code>, add{' '}
          <code className="font-mono text-data-sm">&apos;http://localhost:5173&apos;</code> to{' '}
          <code className="font-mono text-data-sm">RPC_RESTRICTIONS[GetXpub]</code>, then rebuild the snap.
        </p>
      </Callout>

      <SnapMethodCard
        title="Get xpub"
        description="The xpub depends on the network."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-body font-medium">Network</span>
          <SegmentedControl aria-label="Network" options={NETWORK_OPTIONS} value={network} onChange={setNetwork} />
          <span className="text-caption text-ink-muted">The network whose xpub the snap returns.</span>
        </div>
      </SnapMethodCard>
    </div>
  );
};
