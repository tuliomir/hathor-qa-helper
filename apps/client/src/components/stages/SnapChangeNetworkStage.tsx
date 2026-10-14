/**
 * Snap Change Network Stage
 *
 * Tests htr_changeNetwork via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useRequireSnap } from '../../hooks/useRequirements';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { SegmentedControl } from '../ui/SegmentedControl';
import { firstUnmetReason } from '../../utils/requirements';

const NETWORK_OPTIONS = [
  { value: 'testnet', label: 'Testnet' },
  { value: 'mainnet', label: 'Mainnet' },
] as const;

export const SnapChangeNetworkStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('changeNetwork');
  const snapRequirement = useRequireSnap();

  const [newNetwork, setNewNetwork] = useState<string>('testnet');

  const liveRequest = useMemo(() => ({ method: 'htr_changeNetwork', params: { newNetwork } }), [newNetwork]);

  const handleExecute = () => execute((h) => h.changeNetwork(newNetwork));

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-change-network"
        description="Switch the MetaMask Snap to another network."
        method="htr_changeNetwork"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Change network"
        description="The snap asks for approval before switching."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-body font-medium">Network</span>
          <SegmentedControl
            className="self-start"
            aria-label="Target network"
            options={NETWORK_OPTIONS}
            value={newNetwork}
            onChange={setNewNetwork}
          />
          <span className="text-caption text-ink-muted">The network the snap switches to.</span>
        </div>
      </SnapMethodCard>
    </div>
  );
};
