/**
 * Snap Get Address Stage
 *
 * Tests htr_getAddress via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import Select from '../common/Select';

export const SnapGetAddressStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('getAddress');

  const [type, setType] = useState<string>('index');
  const [index, setIndex] = useState<number>(0);

  const liveRequest = useMemo(
    () => ({ method: 'htr_getAddress', params: { type, index } }),
    [type, index],
  );

  const handleExecute = () =>
    execute((h) => h.getAddress(type, index));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Get Address (Snap)</h1>
      <p className="text-muted mb-7.5">
        Retrieve addresses by type and index via MetaMask Snap
      </p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Get Address"
          description="Retrieve an address from the Snap wallet"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Address Type</label>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="index">Index</option>
              <option value="first_empty">First Empty</option>
              <option value="client">Client</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Address Index</label>
            <input
              type="number"
              value={index}
              onChange={(e) => setIndex(parseInt(e.target.value) || 0)}
              min={0}
              className="input"
            />
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
