/**
 * Snap Sign Oracle Data Stage
 *
 * Tests htr_signOracleData via MetaMask Snap.
 * Supports bidirectional navigation with Snap Set Bet Result.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useStage } from '../../hooks/useStage';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import { AddressInput } from '../common/AddressInput';
import { selectSnapAddress, selectSnapBetNc } from '../../store/slices/snapSlice';
import {
  navigateToSnapSetBetResult,
  clearSnapSignOracleDataNavigation,
} from '../../store/slices/navigationSlice';
import { parseSnapResponse, isSnapEnvelope } from '../../utils/snapResponseHelpers';
import type { RootState, AppDispatch } from '../../store';

function extractSignedData(rawResponse: unknown): string | null {
  const parsed = parseSnapResponse(rawResponse);
  const inner = isSnapEnvelope(parsed) ? (parsed as { response: unknown }).response : parsed;
  if (!inner || typeof inner !== 'object') return null;
  const data = inner as Record<string, unknown>;
  if (data.signedData && typeof data.signedData === 'object') {
    const sd = data.signedData as Record<string, unknown>;
    if (typeof sd.signature === 'string') return sd.signature;
  }
  if (typeof data.signedData === 'string') return data.signedData;
  if (typeof data.signature === 'string') return data.signature;
  return null;
}

export const SnapSignOracleDataStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { setCurrentStage } = useStage();
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('signOracleData');

  const snapAddress = useSelector(selectSnapAddress);
  const betNc = useSelector(selectSnapBetNc);
  const navData = useSelector((state: RootState) => state.navigation.snapSignOracleData);

  const [ncId, setNcId] = useState(betNc.ncId ?? '');
  const [data, setData] = useState('');
  const [oracle, setOracle] = useState(snapAddress ?? '');
  const [signedResult, setSignedResult] = useState<string | null>(null);

  // Receive navigation data from Snap Set Bet Result
  useEffect(() => {
    if (navData.ncId) {
      setNcId(navData.ncId);
      if (navData.result) setData(navData.result);
      dispatch(clearSnapSignOracleDataNavigation());
    }
  }, [navData, dispatch]);

  const liveRequest = useMemo(
    () => ({
      method: 'htr_signOracleData',
      params: {
        nc_id: ncId || '<nc_id>',
        data: data || '<data>',
        oracle: oracle || '<oracle>',
      },
    }),
    [ncId, data, oracle]
  );

  const handleExecute = async () => {
    setSignedResult(null);
    const result = await execute((h) => h.signOracleData(ncId, data, oracle));
    const sig = extractSignedData(result.response);
    if (sig) setSignedResult(sig);
    return result;
  };

  const handleSendToSetBetResult = () => {
    if (!signedResult) return;
    dispatch(navigateToSnapSetBetResult({ ncId, result: data, oracleSignedData: signedResult }));
    setCurrentStage('snap-set-bet-result');
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Sign Oracle Data (Snap)</h1>
      <p className="text-muted mb-7.5">Sign oracle data for a nano contract via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <>
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
              <input
                type="text"
                value={ncId}
                onChange={(e) => setNcId(e.target.value)}
                placeholder="NC ID"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Data</label>
              <input
                type="text"
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="Data to sign"
                className="input"
              />
            </div>
            <AddressInput
              label="Oracle Address"
              value={oracle}
              onChange={setOracle}
              placeholder="Oracle address"
              suggestedValue={snapAddress ?? undefined}
              sources={['snap']}
            />
          </SnapMethodCard>

          {/* Send signed data back to Set Bet Result */}
          {signedResult && (
            <div className="card-primary mb-7.5 bg-green-50 border border-success">
              <p className="text-sm text-green-800 mb-2">Oracle signature ready.</p>
              <button
                type="button"
                onClick={handleSendToSetBetResult}
                className="btn-primary py-1.5 px-3 text-sm"
              >
                ← Send to Set Bet Result
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
