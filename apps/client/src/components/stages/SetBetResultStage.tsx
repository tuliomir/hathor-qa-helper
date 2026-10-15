/**
 * Set Bet Result Stage
 *
 * Tests htr_sendNanoContractTx (set_result) RPC call with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setSetBetResultError,
  setSetBetResultFormData,
  setSetBetResultRequest,
  setSetBetResultResponse,
} from '../../store/slices/setBetResultSlice';
import { clearSetBetResultNavigation, navigateToSignOracleData } from '../../store/slices/navigationSlice';
import { RpcSetBetResultCard } from '../rpc/RpcSetBetResultCard';
import { StageHeader } from '../common/StageHeader';
import { StartFlowButton } from '../flows/StartFlowButton';
import { BET_FLOW } from '../../flows';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { useStage } from '../../hooks/useStage';
import { buildSetBetResultRequest } from '../../utils/nanoRpcRequests';
import { firstUnmetReason } from '../../utils/requirements';
import { methodDataOf, useNanoRpcExecute, useNanoStageWallet } from '../../hooks/useNanoRpcStage';
import { bool, num, str, useFlowPrefill } from '../../hooks/useFlowPrefill';

export const SetBetResultStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { setCurrentStage } = useStage();

  // Set when coming back from Sign oracle data.
  const navigationData = useSelector((state: RootState) => state.navigation.setBetResult);
  const setBetResultData = useSelector((state: RootState) => state.setBetResult);
  const latestNcId = useSelector((state: RootState) => state.betNanoContract.ncId);
  const depositedBetChoice = useSelector((state: RootState) => state.betDeposit.betChoice);

  const [ncId, setNcId] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [oracleSignature, setOracleSignature] = useState<string>('');
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [pushTx, setPushTx] = useState<boolean>(false);
  const { network, derivedAddress: oracleAddress, requirements } = useNanoStageWallet(addressIndex);

  // Initialize from Redux on mount
  useEffect(() => {
    setNcId(setBetResultData.ncId || latestNcId || '');
    setAddressIndex(setBetResultData.addressIndex);
    setResult(setBetResultData.result);
    setOracleSignature(setBetResultData.oracleSignature);
    setPushTx(setBetResultData.pushTx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data from navigation (coming from Sign oracle data)
  useEffect(() => {
    if (navigationData.ncId !== null) {
      setNcId(navigationData.ncId);
      setAddressIndex(navigationData.addressIndex ?? 0);
      setResult(navigationData.result ?? '');
      setOracleSignature(navigationData.oracleSignature ?? '');
      dispatch(clearSetBetResultNavigation());
    }
  }, [navigationData, dispatch]);

  useEffect(() => {
    if (latestNcId && !ncId) setNcId(latestNcId);
  }, [latestNcId, ncId]);

  useEffect(() => {
    dispatch(setSetBetResultFormData({ ncId, addressIndex, result, oracleSignature, pushTx }));
  }, [ncId, addressIndex, result, oracleSignature, pushTx, dispatch]);

  // Suggest the result from the deposited bet choice
  useEffect(() => {
    if (depositedBetChoice && !result) setResult(depositedBetChoice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositedBetChoice]);

  // Values an automatic flow run filled in.
  useFlowPrefill('rpc-set-bet-result', (v) => {
    setNcId(str(v, 'ncId') ?? ncId);
    setResult(str(v, 'result') ?? result);
    setOracleSignature(str(v, 'oracleSignature') ?? oracleSignature);
    setAddressIndex(num(v, 'addressIndex') ?? addressIndex);
    setPushTx(bool(v, 'pushTx') ?? pushTx);
  });

  const liveRequest = useMemo(
    () =>
      buildSetBetResultRequest({
        ncId: ncId || '<nc_id>',
        result: result || '<result>',
        oracleSignature,
        pushTx,
      }),
    [ncId, result, oracleSignature, pushTx]
  );

  const { isDryRun, execute } = useNanoRpcExecute({
    request: setSetBetResultRequest,
    response: (response, duration) => setSetBetResultResponse({ response, duration }),
    error: setSetBetResultError,
  });

  const handleExecute = async () => {
    if (!ncId) throw new Error('Enter a nano contract ID');
    return execute((h) => h.getRpcSetBetResult(ncId, oracleAddress, result, oracleSignature, pushTx), liveRequest);
  };

  const handleNavigateToSignOracleData = () => {
    dispatch(navigateToSignOracleData({ ncId, addressIndex, result }));
    setCurrentStage('rpc-sign-oracle-data');
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-set-bet-result"
        title="Set bet result"
        description="Set the result of a bet nano contract as its oracle."
        method="htr_sendNanoContractTx"
        actions={<StartFlowButton flow={BET_FLOW} label="Run the bet flow" />}
      />
      <PreconditionStrip requirements={requirements} />
      <RpcSetBetResultCard
        onExecute={handleExecute}
        liveRequest={liveRequest}
        methodData={methodDataOf(setBetResultData)}
        isDryRun={isDryRun}
        disabledReason={firstUnmetReason(requirements) ?? (ncId ? null : 'Enter a nano contract ID')}
        network={network}
        ncId={ncId}
        setNcId={setNcId}
        latestNcId={latestNcId}
        oracleAddress={oracleAddress}
        addressIndex={addressIndex}
        setAddressIndex={setAddressIndex}
        result={result}
        setResult={setResult}
        depositedBetChoice={depositedBetChoice}
        oracleSignature={oracleSignature}
        setOracleSignature={setOracleSignature}
        pushTx={pushTx}
        setPushTx={setPushTx}
        onNavigateToSignOracleData={handleNavigateToSignOracleData}
      />
    </div>
  );
};
