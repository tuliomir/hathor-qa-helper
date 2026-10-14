/**
 * Snap Set Bet Result Stage
 *
 * Tests htr_sendNanoContractTx (set_result) for the Bet nano contract via MetaMask Snap.
 * Bidirectional flow with Snap Sign Oracle Data for oracle signature.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MdArrowForward } from 'react-icons/md';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useStage } from '../../hooks/useStage';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { useRequireSnap } from '../../hooks/useRequirements';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Field } from '../ui/Field';
import { firstUnmetReason } from '../../utils/requirements';
import { selectSnapBetNc } from '../../store/slices/snapSlice';
import { navigateToSnapSignOracleData, clearSnapSetBetResultNavigation } from '../../store/slices/navigationSlice';
import type { RootState, AppDispatch } from '../../store';

export const SnapSetBetResultStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { setCurrentStage } = useStage();
  const { isDryRun, methodData, execute } = useSnapMethod('snapSetBetResult');
  const snapRequirement = useRequireSnap();

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
      args: [{ type: 'str', signature: oracleSignedData, value: result }],
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
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-set-bet-result"
        description="Submit the oracle-signed result that resolves a Bet nano contract."
        method="htr_sendNanoContractTx"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Set bet result"
        description="Sign the result as the oracle first, then submit it here."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <Field label="NC ID">
          <input
            type="text"
            value={ncId}
            onChange={(e) => setNcId(e.target.value)}
            placeholder="Nano contract ID"
            className="input w-full font-mono text-data"
          />
        </Field>
        <Field label="Result">
          <input
            type="text"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="Result_1"
            className="input w-full"
          />
        </Field>
        <Field
          label="Oracle signed data"
          hint="Sign oracle data fills this in when you come back from it."
          trailing={
            <button
              type="button"
              onClick={handleNavigateToSignOracleData}
              disabled={!ncId || !result}
              title={!ncId || !result ? 'Fill in the NC ID and result first' : undefined}
              className="btn btn-secondary btn-xs"
            >
              Sign oracle data
              <MdArrowForward aria-hidden="true" />
            </button>
          }
        >
          <textarea
            value={oracleSignedData}
            onChange={(e) => setOracleSignedData(e.target.value)}
            placeholder="Signed result from the oracle"
            className="textarea min-h-20 w-full font-mono text-data"
            rows={3}
          />
        </Field>
      </SnapMethodCard>
    </div>
  );
};
