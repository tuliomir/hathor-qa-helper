/**
 * Snap Set Bet Result Stage
 *
 * Tests htr_sendNanoContractTx (set_result) for the Bet nano contract via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';

export const SnapSetBetResultStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('snapSetBetResult');

  const [ncId, setNcId] = useState('');
  const [result, setResult] = useState('');
  const [oracleSignedData, setOracleSignedData] = useState('');

  const params = useMemo(
    () => ({
      method: 'set_result',
      nc_id: ncId,
      blueprint_id: null,
      actions: [],
      args: [result, oracleSignedData],
    }),
    [ncId, result, oracleSignedData]
  );

  const liveRequest = useMemo(() => ({ method: 'htr_sendNanoContractTx', params }), [params]);

  const handleExecute = () => execute((h) => h.sendNanoContractTx(params));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Set Bet Result (Snap)</h1>
      <p className="text-muted mb-7.5">Set the result of a Bet nano contract via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Set Bet Result"
          description="Submit the oracle-signed result to resolve the bet"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">NC ID</label>
            <input
              type="text"
              value={ncId}
              onChange={(e) => setNcId(e.target.value)}
              placeholder="Nano contract ID"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Result</label>
            <input
              type="text"
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="e.g. heads"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Oracle Signed Data</label>
            <textarea
              value={oracleSignedData}
              onChange={(e) => setOracleSignedData(e.target.value)}
              placeholder="Base64/hex signed result from oracle"
              className="input min-h-20"
              rows={3}
            />
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
