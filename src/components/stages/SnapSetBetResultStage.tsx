/**
 * Snap Set Bet Result Stage
 *
 * Tests htr_sendNanoContractTx (set_result) for the Bet nano contract via MetaMask Snap.
 * Bidirectional flow with Snap Sign Oracle Data for oracle signature.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useStage } from '../../hooks/useStage';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import { selectSnapBetNc } from '../../store/slices/snapSlice';
import {
  navigateToSnapSignOracleData,
  clearSnapSetBetResultNavigation,
} from '../../store/slices/navigationSlice';
import type { RootState, AppDispatch } from '../../store';

export const SnapSetBetResultStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { setCurrentStage } = useStage();
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('snapSetBetResult');

  const betNc = useSelector(selectSnapBetNc);
  const navData = useSelector((state: RootState) => state.navigation.snapSetBetResult);

  const [ncId, setNcId] = useState(betNc.ncId ?? '');
  const [result, setResult] = useState(betNc.betChoice ?? '');
  const [oracleSignedData, setOracleSignedData] = useState('');

  // Receive signed data from Snap Sign Oracle Data
  useEffect(() => {
    if (navData.oracleSignedData) {
      if (navData.ncId) setNcId(navData.ncId);
      if (navData.result) setResult(navData.result);
      setOracleSignedData(navData.oracleSignedData);
      dispatch(clearSnapSetBetResultNavigation());
    }
  }, [navData, dispatch]);

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

  const handleNavigateToSignOracleData = () => {
    dispatch(navigateToSnapSignOracleData({ ncId, result }));
    setCurrentStage('snap-sign-oracle-data');
  };

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
              placeholder="e.g. Result_1"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Oracle Signed Data</label>
            <textarea
              value={oracleSignedData}
              onChange={(e) => setOracleSignedData(e.target.value)}
              placeholder="Signed result from oracle — use the button below to sign via Snap"
              className="input min-h-20"
              rows={3}
            />
            <button
              type="button"
              onClick={handleNavigateToSignOracleData}
              disabled={!ncId || !result}
              className="btn-primary py-1.5 px-3 text-sm mt-2"
            >
              Sign Oracle Data via Snap →
            </button>
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
