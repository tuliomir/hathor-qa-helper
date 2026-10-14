/**
 * Sign Oracle Data Stage
 *
 * Tests htr_signOracleData RPC call with Redux state persistence
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
import { useRequireRpcSession } from '../../hooks/useRequirements';
import { toMethodData, useRpcStageCall } from '../../hooks/useRpcStageCall';
import { ADDRESS_MISMATCH_REASON, useRpcAddressMismatch } from '../../hooks/useRpcAddressMismatch';
import { firstUnmetReason, type Requirement } from '../../utils/requirements';
import { buildSignOracleDataRequest } from '../../utils/rpcCoreRequests';
import { getStageUrl } from '../../config/stageRoutes';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useStage } from '../../hooks/useStage';

const SIGN_ORACLE_DATA_ACTIONS = {
  setRequest: setSignOracleDataRequest,
  setResponse: setSignOracleDataResponse,
  setError: setSignOracleDataError,
};

export const SignOracleDataStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();
  const { setCurrentStage } = useStage();

  // Check if we're coming from Set Bet Result with data
  const navigationData = useSelector((state: RootState) => state.navigation.signOracleData);

  const rpcSession = useRequireRpcSession();
  const mismatch = useRpcAddressMismatch();
  const { isDryRun, execute } = useRpcStageCall(SIGN_ORACLE_DATA_ACTIONS);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const signOracleDataData = useSelector((state: RootState) => state.signOracleData);
  const betNanoContract = useSelector((state: RootState) => state.betNanoContract);
  const latestNcId = betNanoContract.ncId;

  // Get the actual wallet instance
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  // Form state, restored from Redux.
  const [ncId, setNcId] = useState<string>(() => signOracleDataData.ncId || latestNcId || '');
  const [oracleAddress, setOracleAddress] = useState<string>('');
  const [data, setData] = useState<string>(signOracleDataData.data);
  const [addressIndex, setAddressIndex] = useState<number>(signOracleDataData.addressIndex);

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

  // Save form state to Redux whenever it changes
  useEffect(() => {
    dispatch(setSignOracleDataFormData({ ncId, addressIndex, data }));
  }, [ncId, addressIndex, data, dispatch]);

  // Derive oracle address from selected index
  useEffect(() => {
    const deriveAddress = async () => {
      if (testWallet?.instance) {
        try {
          const address = await testWallet.instance.getAddressAtIndex(addressIndex);
          setOracleAddress(address);
        } catch (error) {
          console.error(`[SignOracleData] Failed to derive address at index ${addressIndex}:`, error);
          setOracleAddress('');
        }
      } else {
        console.log('[SignOracleData] Wallet not loaded yet');
        setOracleAddress('');
      }
    };

    deriveAddress();
  }, [testWallet, addressIndex]);

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
  const requirements = [rpcSession, ncRequirement];

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
