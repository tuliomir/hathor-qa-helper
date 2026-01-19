/**
 * Sign Oracle Data Stage
 *
 * Tests htr_signOracleData RPC call with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
	setSignOracleDataError,
	setSignOracleDataFormData,
	setSignOracleDataRequest,
	setSignOracleDataResponse,
} from '../../store/slices/signOracleDataSlice';
import { selectIsWalletConnectConnected, selectWalletConnectFirstAddress } from '../../store/slices/walletConnectSlice';
import { clearSignOracleDataNavigation, navigateToSetBetResult } from '../../store/slices/navigationSlice';
import { RpcSignOracleDataCard } from '../rpc/RpcSignOracleDataCard';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useStage } from '../../hooks/useStage';
import { useDeepLinkCallback } from '../../hooks/useDeepLinkCallback';

export const SignOracleDataStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();
  const { setCurrentStage } = useStage();

  // Check if we're coming from Set Bet Result with data
  const navigationData = useSelector((state: RootState) => state.navigation.signOracleData);

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const signOracleDataData = useSelector((state: RootState) => state.signOracleData);
  const betNanoContract = useSelector((state: RootState) => state.betNanoContract);
  const latestNcId = betNanoContract.ncId;

  // Get the actual wallet instance
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  // Local state
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);
  const [ncId, setNcId] = useState<string>('');
  const [oracleAddress, setOracleAddress] = useState<string>('');
  const [data, setData] = useState<string>('');
  const [addressIndex, setAddressIndex] = useState<number>(0);

  // Initialize from Redux on mount
  useEffect(() => {
    // Load from persisted state
    setNcId(signOracleDataData.ncId || latestNcId || '');
    setAddressIndex(signOracleDataData.addressIndex);
    setData(signOracleDataData.data);
  }, []); // Only on mount

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

  // Check if connected address matches test wallet address at index 0
  const addressMismatch = useMemo(() => {
    if (!isConnected || !connectedAddress || !testWalletAddress) return false;

    return connectedAddress.toLowerCase() !== testWalletAddress.toLowerCase();
  }, [isConnected, connectedAddress, testWalletAddress]);

  // Deep link callback and cleanup for RPC requests
  const { onDeepLinkAvailable, clearDeepLinkNotification } = useDeepLinkCallback();

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
      onDeepLinkAvailable,
    });
  }, [walletConnect.client, walletConnect.session, isDryRun, onDeepLinkAvailable]);

  // Wrapper for onExecute that stores results in Redux
  const handleExecuteSignOracleData = async () => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    if (!ncId) {
      throw new Error('No Nano Contract ID available');
    }

    const startTime = Date.now();

    try {
      const { request, response } = await rpcHandlers.getRpcSignOracleData(
        ncId,
        oracleAddress,
        data
      );
      const duration = Date.now() - startTime;

      // Clear deep link notification after RPC response
      clearDeepLinkNotification();

      // Store request in Redux
      dispatch(setSignOracleDataRequest({
        method: request.method,
        params: request.params,
        isDryRun,
      }));

      // Store response in Redux
      dispatch(setSignOracleDataResponse({
        response,
        duration,
      }));

      return { request, response };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Clear deep link notification on error too
      clearDeepLinkNotification();

      // Store error in Redux
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setSignOracleDataError({
        error: errorMessage,
        duration,
      }));

      throw error;
    }
  };

  // Callback to send signature back to Set Bet Result
  const handleSendToSetBetResult = (signedData: string) => {
    // Store all data in Redux so Set Bet Result can pick it up
    dispatch(navigateToSetBetResult({ ncId, addressIndex, result: data, oracleSignature: signedData }));
    // Navigate to Set Bet Result stage
    setCurrentStage('rpc-set-bet-result');
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Sign Oracle Data RPC</h1>
      <p className="text-muted mb-7.5">
        Sign data as the oracle for a nano contract
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

      {/* SignOracleData Card */}
      {isConnected && !addressMismatch && rpcHandlers && (
        <RpcSignOracleDataCard
          onExecute={handleExecuteSignOracleData}
          disabled={!ncId}
          ncId={ncId}
          setNcId={setNcId}
          latestNcId={latestNcId}
          oracleAddress={oracleAddress}
          addressIndex={addressIndex}
          setAddressIndex={setAddressIndex}
          data={data}
          setData={setData}
          onSendToSetBetResult={handleSendToSetBetResult}
          isDryRun={isDryRun}
          initialRequest={signOracleDataData.request}
          initialResponse={signOracleDataData.rawResponse}
          initialError={signOracleDataData.error}
        />
      )}

      {/* Persisted Data Info */}
      {signOracleDataData.timestamp && (
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
                {signOracleDataData.duration !== null && (
                  <span className="block mt-1">
                    Last request took {signOracleDataData.duration}ms
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
