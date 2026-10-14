/**
 * Snap Get Connected Network Stage
 *
 * Tests htr_getConnectedNetwork via MetaMask Snap
 */

import React, { useMemo } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useRequireSnap } from '../../hooks/useRequirements';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { firstUnmetReason } from '../../utils/requirements';

export const SnapGetNetworkStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('getConnectedNetwork');
  const snapRequirement = useRequireSnap();

  const liveRequest = useMemo(() => ({ method: 'htr_getConnectedNetwork' }), []);

  const handleExecute = () => execute((h) => h.getConnectedNetwork());

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-get-connected-network"
        description="Get the network the MetaMask Snap is connected to."
        method="htr_getConnectedNetwork"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Get network"
        description="No parameters."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <p className="m-0 text-body text-ink-muted">
          This method takes no parameters and returns the snap&apos;s network.
        </p>
      </SnapMethodCard>
    </div>
  );
};
