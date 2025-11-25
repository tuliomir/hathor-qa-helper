/**
 * Set Bet Result Stage
 *
 * Tests htr_sendNanoContractTx (set_result) RPC call with Redux state persistence
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  setSetBetResultRequest,
  setSetBetResultResponse,
  setSetBetResultError,
  setSetBetResultFormData,
} from '../../store/slices/setBetResultSlice';
import { selectWalletConnectFirstAddress, selectIsWalletConnectConnected } from '../../store/slices/walletConnectSlice';
import { navigateToSignOracleData, clearSetBetResultNavigation } from '../../store/slices/navigationSlice';
import { RpcSetBetResultCard } from '../rpc/RpcSetBetResultCard';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useStage } from '../../hooks/useStage';

export const SetBetResultStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();
  const { setCurrentStage } = useStage();

  // Check if we're coming from Sign Oracle Data with data
  const navigationData = useSelector((state: RootState) => state.navigation.setBetResult);

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const setBetResultData = useSelector((state: RootState) => state.setBetResult);
  const betNanoContract = useSelector((state: RootState) => state.betNanoContract);
  const betDepositData = useSelector((state: RootState) => state.betDeposit);
  const latestNcId = betNanoContract.ncId;
  const depositedBetChoice = betDepositData.betChoice; // The choice from the deposit stage

  // Get the actual wallet instance (not from Redux, from walletInstancesMap)
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  // Local state
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);
  const [ncId, setNcId] = useState<string>('');
  const [oracleAddress, setOracleAddress] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [oracleSignature, setOracleSignature] = useState<string>('');
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [pushTx, setPushTx] = useState<boolean>(false);

  // Initialize from Redux on mount
  useEffect(() => {
    // Load from persisted state
    setNcId(setBetResultData.ncId || latestNcId || '');
    setAddressIndex(setBetResultData.addressIndex);
    setResult(setBetResultData.result);
    setOracleSignature(setBetResultData.oracleSignature);
    setPushTx(setBetResultData.pushTx);
  }, []); // Only on mount

  // Load data from navigation if available (coming from Sign Oracle Data)
  useEffect(() => {
    if (navigationData.ncId !== null) {
      setNcId(navigationData.ncId);
      setAddressIndex(navigationData.addressIndex ?? 0);
      setResult(navigationData.result ?? '');
      setOracleSignature(navigationData.oracleSignature ?? '');
      // Clear navigation data after loading
      dispatch(clearSetBetResultNavigation());
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
    dispatch(setSetBetResultFormData({ ncId, addressIndex, result, oracleSignature, pushTx }));
  }, [ncId, addressIndex, result, oracleSignature, pushTx, dispatch]);

  // Suggest result from deposited bet choice
  useEffect(() => {
    if (depositedBetChoice && !result) {
      setResult(depositedBetChoice);
    }
  }, [depositedBetChoice]);

  // Get test wallet address at index 0
  useEffect(() => {
    const getAddress = async () => {
      if (testWallet?.instance) {
        try {
          const address = await testWallet.instance.getAddressAtIndex(0);
          setTestWalletAddress(address);
        } catch (error) {
          console.error('Failed to get test wallet address:', error);
          setTestWalletAddress(null);
        }
      } else {
        setTestWalletAddress(null);
      }
    };

    getAddress();
  }, [testWallet]);

  // Derive oracle address from selected index
  useEffect(() => {
    const deriveAddress = async () => {
      if (testWallet?.instance) {
        try {
          const address = await testWallet.instance.getAddressAtIndex(addressIndex);
          setOracleAddress(address);
        } catch (error) {
          console.error(`[SetBetResult] Failed to derive address at index ${addressIndex}:`, error);
          setOracleAddress('');
        }
      } else {
        console.log('[SetBetResult] Wallet not loaded yet');
        setOracleAddress('');
      }
    };

    deriveAddress();
  }, [testWallet, addressIndex]);

  // Check if connected address matches test wallet address at index 0
  const addressMismatch = useMemo(() => {
    if (!isConnected || !connectedAddress || !testWalletAddress) return false;

    return connectedAddress.toLowerCase() !== testWalletAddress.toLowerCase();
  }, [isConnected, connectedAddress, testWalletAddress]);

  // Create RPC handlers
  const rpcHandlers = useMemo(() => {
    if (!walletConnect.client || !walletConnect.session) {
      return null;
    }

    return createRpcHandlers({
      client: walletConnect.client,
      session: walletConnect.session,
      balanceTokens: [],
      dryRun: isDryRun,
    });
  }, [walletConnect.client, walletConnect.session, isDryRun]);

  // Wrapper for onExecute that stores results in Redux
  const handleExecuteSetBetResult = async () => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    if (!ncId) {
      throw new Error('No Nano Contract ID available');
    }

    const startTime = Date.now();

    try {
      const { request, response } = await rpcHandlers.getRpcSetBetResult(
        ncId,
        oracleAddress,
        result,
        oracleSignature,
        pushTx
      );
      const duration = Date.now() - startTime;

      // Store request in Redux
      dispatch(setSetBetResultRequest({
        method: request.method,
        params: request.params,
        isDryRun,
      }));

      // Store response in Redux
      dispatch(setSetBetResultResponse({
        response,
        duration,
      }));

      return { request, response };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Store error in Redux
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setSetBetResultError({
        error: errorMessage,
        duration,
      }));

      throw error;
    }
  };

  // Callback to navigate to Sign Oracle Data with current data
  const handleNavigateToSignOracleData = () => {
    // Store all data in Redux so Sign Oracle Data can pick it up
    dispatch(navigateToSignOracleData({ ncId, addressIndex, result }));
    // Navigate to Sign Oracle Data stage
    setCurrentStage('rpc-sign-oracle-data');
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Set Bet Result RPC</h1>
      <p className="text-muted mb-7.5">
        Set the result for a bet nano contract (oracle action)
      </p>

      {/* Connection Status Info */}
      {!isConnected && (
        <div className="card-primary mb-7.5 bg-blue-50 border border-info">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-info flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-bold text-blue-900 m-0">Not Connected</p>
              <p className="text-sm text-blue-800 mt-1 mb-0">
                Please connect your wallet in the Connection stage to enable RPC testing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Address Mismatch Warning */}
      {addressMismatch && (
        <div className="card-primary mb-7.5 bg-yellow-50 border border-warning">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-warning flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-bold text-yellow-900 m-0">Address Mismatch Warning</p>
              <p className="text-sm text-yellow-800 mt-1 mb-0">
                The connected wallet address does not match the selected test wallet address. RPC
                testing has been disabled. Please connect the correct wallet or select a different
                test wallet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Nano Contract Warning */}
      {!ncId && isConnected && !addressMismatch && (
        <div className="card-primary mb-7.5 bg-yellow-50 border border-warning">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-warning flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-bold text-yellow-900 m-0">No Nano Contract ID Available</p>
              <p className="text-sm text-yellow-800 mt-1 mb-0">
                No Nano Contract ID available. Please initialize a bet first in the Initialize Bet stage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SetBetResult Card */}
      {isConnected && !addressMismatch && rpcHandlers && (
        <RpcSetBetResultCard
          onExecute={handleExecuteSetBetResult}
          disabled={!ncId}
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
          isDryRun={isDryRun}
          initialRequest={setBetResultData.request}
          initialResponse={setBetResultData.rawResponse}
          initialError={setBetResultData.error}
          onNavigateToSignOracleData={handleNavigateToSignOracleData}
        />
      )}

      {/* Persisted Data Info */}
      {setBetResultData.timestamp && (
        <div className="card-primary mt-7.5 bg-green-50 border border-success">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-success flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-bold text-green-900 m-0">Request duration</p>
              <p className="text-sm text-green-800 mt-1 mb-0">
                {setBetResultData.duration !== null && (
                  <span className="block mt-1">
                    Last request took {setBetResultData.duration}ms
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
