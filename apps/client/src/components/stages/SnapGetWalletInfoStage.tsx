/**
 * Snap Get Wallet Information Stage
 *
 * Tests htr_getWalletInformation via MetaMask Snap
 */

import React, { useMemo } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useRequireSnap } from '../../hooks/useRequirements';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { firstUnmetReason } from '../../utils/requirements';

export const SnapGetWalletInfoStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('getWalletInformation');
  const snapRequirement = useRequireSnap();

  const liveRequest = useMemo(() => ({ method: 'htr_getWalletInformation' }), []);

  const handleExecute = () => execute((h) => h.getWalletInformation());

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-get-wallet-info"
        description="Get the snap wallet's network and its address at index 0."
        method="htr_getWalletInformation"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Get wallet information"
        description="No parameters."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <p className="m-0 text-body text-ink-muted">
          This method takes no parameters and returns the wallet&apos;s network and address 0.
        </p>
      </SnapMethodCard>
    </div>
  );
};
