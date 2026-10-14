/**
 * Snap Sign Oracle Data Stage
 *
 * Tests htr_signOracleData via MetaMask Snap.
 * Supports bidirectional navigation with Snap Set Bet Result.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MdArrowForward } from 'react-icons/md';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useStage } from '../../hooks/useStage';
import { useRequireSnap } from '../../hooks/useRequirements';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { AddressInput } from '../common/AddressInput';
import { Field } from '../ui/Field';
import { Callout } from '../ui/Callout';
import { selectSnapAddress, selectSnapBetNc } from '../../store/slices/snapSlice';
import { navigateToSnapSetBetResult, clearSnapSignOracleDataNavigation } from '../../store/slices/navigationSlice';
import { parseSnapResponse, isSnapEnvelope } from '../../utils/snapResponseHelpers';
import { firstUnmetReason } from '../../utils/requirements';
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
  const { isDryRun, methodData, execute } = useSnapMethod('signOracleData');
  const snapRequirement = useRequireSnap();

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
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-sign-oracle-data"
        description="Sign data as the oracle of a nano contract with the snap wallet."
        method="htr_signOracleData"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Sign oracle data"
        description="Set bet result can open this stage with the contract and result filled in."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <Field label="Nano contract ID">
          <input
            type="text"
            value={ncId}
            onChange={(e) => setNcId(e.target.value)}
            placeholder="NC ID"
            className="input w-full font-mono text-data"
          />
        </Field>
        <Field label="Data">
          <input
            type="text"
            value={data}
            onChange={(e) => setData(e.target.value)}
            placeholder="Data to sign"
            className="input w-full"
          />
        </Field>
        <AddressInput
          label="Oracle address"
          value={oracle}
          onChange={setOracle}
          placeholder="Oracle address"
          suggestedValue={snapAddress ?? undefined}
          sources={['snap']}
        />
      </SnapMethodCard>

      {signedResult && (
        <Callout
          tone="success"
          title="Oracle signature ready"
          action={
            <button type="button" onClick={handleSendToSetBetResult} className="btn btn-primary btn-sm">
              Send to Set bet result
              <MdArrowForward aria-hidden="true" />
            </button>
          }
        >
          Use it to resolve the bet in Set bet result.
        </Callout>
      )}
    </div>
  );
};
