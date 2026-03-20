/**
 * Snap Change Network Stage
 *
 * Tests htr_changeNetwork via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import Select from '../common/Select';

export const SnapChangeNetworkStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('changeNetwork');

  const [newNetwork, setNewNetwork] = useState('testnet');

  const liveRequest = useMemo(() => ({ method: 'htr_changeNetwork', params: { newNetwork } }), [newNetwork]);

  const handleExecute = () => execute((h) => h.changeNetwork(newNetwork));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Change Network (Snap)</h1>
      <p className="text-muted mb-7.5">Change the connected network via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Change Network"
          description="Switch the Snap to a different network"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Network</label>
            <Select value={newNetwork} onChange={(e) => setNewNetwork(e.target.value)}>
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </Select>
            <p className="text-xs text-muted mt-1">Select the target network for the Snap</p>
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
