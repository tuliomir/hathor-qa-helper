/**
 * Snap Sign Oracle Data Stage
 *
 * Tests htr_signOracleData via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';

export const SnapSignOracleDataStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('signOracleData');

  const [ncId, setNcId] = useState('');
  const [data, setData] = useState('');
  const [oracle, setOracle] = useState('');

  const liveRequest = useMemo(
    () => ({
      method: 'htr_signOracleData',
      params: {
        nc_id: ncId || '<nc_id>',
        data: data || '<data>',
        oracle: oracle || '<oracle>',
      },
    }),
    [ncId, data, oracle],
  );

  const handleExecute = () => execute((h) => h.signOracleData(ncId, data, oracle));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Sign Oracle Data (Snap)</h1>
      <p className="text-muted mb-7.5">
        Sign oracle data for a nano contract via MetaMask Snap
      </p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Sign Oracle Data"
          description="Sign data as oracle for a nano contract"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Nano Contract ID</label>
            <input type="text" value={ncId} onChange={(e) => setNcId(e.target.value)} placeholder="NC ID" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Data</label>
            <input type="text" value={data} onChange={(e) => setData(e.target.value)} placeholder="Data to sign" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Oracle Address</label>
            <input type="text" value={oracle} onChange={(e) => setOracle(e.target.value)} placeholder="Oracle address" className="input" />
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
