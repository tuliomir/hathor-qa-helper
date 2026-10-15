/**
 * Sign Oracle Data Stage
 *
 * Tests htr_signOracleData RPC call with Redux state persistence. The oracle
 * is the test wallet's address at the chosen index (address 0 only for an
 * address-only wallet), from useNanoStageWallet like the bet stages.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setSignOracleDataError,
  setSignOracleDataFormData,
  setSignOracleDataRequest,
  setSignOracleDataResponse,
} from '../../store/slices/signOracleDataSlice';
import { clearSignOracleDataNavigation, navigateToSetBetResult } from '../../store/slices/navigationSlice';
import { RpcSignOracleDataCard } from '../rpc/RpcSignOracleDataCard';
import { RpcAddressMismatchCallout } from '../rpc/RpcAddressMismatchCallout';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { toMethodData, useRpcStageCall } from '../../hooks/useRpcStageCall';
import { ADDRESS_MISMATCH_REASON, useRpcAddressMismatch } from '../../hooks/useRpcAddressMismatch';
import { firstUnmetReason, type Requirement } from '../../utils/requirements';
import { buildSignOracleDataRequest } from '../../utils/rpcCoreRequests';
import { getStageUrl } from '../../config/stageRoutes';
import { useNanoStageWallet } from '../../hooks/useNanoRpcStage';
import { useStage } from '../../hooks/useStage';
import { num, str, useFlowPrefill } from '../../hooks/useFlowPrefill';

const SIGN_ORACLE_DATA_ACTIONS = {
  setRequest: setSignOracleDataRequest,
  setResponse: setSignOracleDataResponse,
  setError: setSignOracleDataError,
};

export const SignOracleDataStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { setCurrentStage } = useStage();

  // Check if we're coming from Set Bet Result with data
  const navigationData = useSelector((state: RootState) => state.navigation.signOracleData);

  const mismatch = useRpcAddressMismatch();
  const { isDryRun, execute } = useRpcStageCall(SIGN_ORACLE_DATA_ACTIONS);
  const signOracleDataData = useSelector((state: RootState) => state.signOracleData);
  const betNanoContract = useSelector((state: RootState) => state.betNanoContract);
  const latestNcId = betNanoContract.ncId;

  // Form state, restored from Redux.
  const [ncId, setNcId] = useState<string>(() => signOracleDataData.ncId || latestNcId || '');
  const [data, setData] = useState<string>(signOracleDataData.data);
  const [addressIndex, setAddressIndex] = useState<number>(signOracleDataData.addressIndex);
  // Oracle address and preconditions (RPC session, test wallet address, address index).
  const { derivedAddress: oracleAddress, requirements: walletRequirements } = useNanoStageWallet(addressIndex);

  // Load data from navigation if available (coming from Set Bet Result)
  useEffect(() => {
    if (navigationData.ncId !== null) {
      setNcId(navigationData.ncId);
      setAddressIndex(navigationData.addressIndex ?? 0);
      setData(navigationData.result ?? '');
      // Clear navigation data after loading
      dispatch(clearSignOracleDataNavigation());
    }
  }, [navigationData, dispatch]);

  // Update ncId when latestNcId changes (only if current ncId is empty)
  useEffect(() => {
    if (latestNcId && !ncId) {
      setNcId(latestNcId);
    }
  }, [latestNcId, ncId]);

  // Values an automatic flow run filled in.
  useFlowPrefill('rpc-sign-oracle-data', (v) => {
    setNcId(str(v, 'ncId') ?? ncId);
    setData(str(v, 'data') ?? data);
    setAddressIndex(num(v, 'addressIndex') ?? addressIndex);
  });

  // Save form state to Redux whenever it changes
  useEffect(() => {
    dispatch(setSignOracleDataFormData({ ncId, addressIndex, data }));
  }, [ncId, addressIndex, data, dispatch]);

  const handleExecute = () =>
    execute(
      (h) => h.getRpcSignOracleData(ncId, oracleAddress, data),
      buildSignOracleDataRequest(ncId, oracleAddress, data)
    );

  // Callback to send signature back to Set Bet Result
  const handleSendToSetBetResult = (signedData: string) => {
    // Store all data in Redux so Set Bet Result can pick it up
    dispatch(navigateToSetBetResult({ ncId, addressIndex, result: data, oracleSignature: signedData }));
    // Navigate to Set Bet Result stage
    setCurrentStage('rpc-set-bet-result');
  };

  const ncRequirement: Requirement = ncId
    ? { id: 'nc-id', short: 'Nano contract', met: true, label: 'Nano contract ID set' }
    : {
        id: 'nc-id',
        short: 'Nano contract',
        met: false,
        label: 'No nano contract ID',
        action: 'Enter a nano contract ID',
        fix: { label: 'Initialize a bet', to: getStageUrl('rpc-bet-initialize') },
      };
  // Never send an empty oracle: the wallet rejects it ("String must contain at least 1 character(s)").
  // Only when the wallet preconditions don't already explain an empty oracle.
  const oracleRequirement: Requirement | null =
    oracleAddress || walletRequirements.some((r) => r.met !== true)
      ? null
      : {
          id: 'oracle-address',
          short: 'Oracle address',
          met: 'pending',
          label: 'Oracle address not derived yet',
          action: 'Wait for the oracle address',
        };
  const requirements = [...walletRequirements, ncRequirement, ...(oracleRequirement ? [oracleRequirement] : [])];

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-sign-oracle-data"
        description="Sign a bet result as the oracle of a nano contract."
        method="htr_signOracleData"
      />
      <PreconditionStrip requirements={requirements} />
      {mismatch && <RpcAddressMismatchCallout mismatch={mismatch} />}
      <RpcSignOracleDataCard
        onExecute={handleExecute}
        methodData={toMethodData(signOracleDataData)}
        isDryRun={isDryRun}
        disabledReason={mismatch ? ADDRESS_MISMATCH_REASON : firstUnmetReason(requirements)}
        ncId={ncId}
        setNcId={setNcId}
        latestNcId={latestNcId}
        oracleAddress={oracleAddress}
        addressIndex={addressIndex}
        setAddressIndex={setAddressIndex}
        data={data}
        setData={setData}
        onSendToSetBetResult={handleSendToSetBetResult}
      />
    </div>
  );
};
