/**
 * Snap Sign Oracle Data Stage
 *
 * Tests htr_signOracleData via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import { selectSnapAddress } from '../../store/slices/snapSlice';

export const SnapSignOracleDataStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('signOracleData');

  const snapAddress = useSelector(selectSnapAddress);

  const [ncId, setNcId] = useState('000000000272a945622653b6bd80dbd0e291a76daccc8170ba9f9c59e3ff46e3');
  const [data, setData] = useState('Sample Oracle Data');
  const [oracle, setOracle] = useState(snapAddress ?? '');

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
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => { if (snapAddress) setOracle(snapAddress); }}
                disabled={!snapAddress}
                className="btn-secondary py-1 px-2.5 text-xs whitespace-nowrap"
                title="Use address 0 from the connected Snap wallet"
              >
                Snap Addr0
              </button>
            </div>
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
