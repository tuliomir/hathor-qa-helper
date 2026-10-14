/**
 * Snap Get Connected Network Stage
 *
 * Tests htr_getConnectedNetwork via MetaMask Snap
 */

import React, { useMemo } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';

export const SnapGetNetworkStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('getConnectedNetwork');

  const liveRequest = useMemo(() => ({ method: 'htr_getConnectedNetwork' }), []);

  const handleExecute = () => execute((h) => h.getConnectedNetwork());

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Get Network (Snap)</h1>
      <p className="text-muted mb-7.5">Get the connected network information via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Get Network"
          description="No parameters required"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <p className="text-sm text-muted">
            This method takes no parameters. Click Execute to retrieve the current network.
          </p>
        </SnapMethodCard>
      )}
    </div>
  );
};
