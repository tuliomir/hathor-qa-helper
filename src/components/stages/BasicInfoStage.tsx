/**
 * Basic Information Stage
 *
 * Tests basic information RPC calls:
 * - htr_getWalletInformation
 */

import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  setWalletInformationRequest,
  setWalletInformationResponse,
  setWalletInformationError,
} from '../../store/slices/walletInformationSlice';
import { selectIsWalletConnectConnected } from '../../store/slices/walletConnectSlice';
import { RpcWalletInformationCard } from '../rpc/RpcWalletInformationCard';
import { createRpcHandlers } from '../../services/rpcHandlers';

export const BasicInfoStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const walletInformationData = useSelector((state: RootState) => state.walletInformation);

  // Create RPC handlers
  const rpcHandlers = useMemo(() => {
    if (!walletConnect.client || !walletConnect.session) {
      return null;
    }

    return createRpcHandlers({
      client: walletConnect.client,
      session: walletConnect.session,
      dryRun: isDryRun,
    });
  }, [walletConnect.client, walletConnect.session, isDryRun]);

  // Wrapper for onExecute that stores results in Redux
  const handleExecuteWalletInformation = async () => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    const startTime = Date.now();

    try {
      const { request, response } = await rpcHandlers.getRpcWalletInformation();
      const duration = Date.now() - startTime;

      // Store request in Redux
      dispatch(setWalletInformationRequest({
        method: request.method,
        params: request.params,
        isDryRun,
      }));

      // Store response in Redux
      dispatch(setWalletInformationResponse({
        response,
        duration,
      }));

      return { request, response };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Store error in Redux
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setWalletInformationError({
        error: errorMessage,
        duration,
      }));

      throw error;
    }
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Basic Information RPC</h1>
      <p className="text-muted mb-7.5">
        Test basic RPC methods to retrieve wallet information
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

      {/* Wallet Information Card */}
      {isConnected && rpcHandlers && (
        <>
          <h2 className="text-2xl font-bold mb-3">Get Wallet Information</h2>
          <p className="text-sm text-muted mb-4">
            Retrieves the wallet network and first address (address0)
          </p>
          <RpcWalletInformationCard
            onExecute={handleExecuteWalletInformation}
            disabled={false}
            isDryRun={isDryRun}
            initialRequest={walletInformationData.request}
            initialResponse={walletInformationData.rawResponse}
            initialError={walletInformationData.error}
          />
        </>
      )}

      {/* Persisted Data Info */}
      {walletInformationData.timestamp && (
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
                {walletInformationData.duration !== null && (
                  <span className="block mt-1">
                    Last request took {walletInformationData.duration}ms
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
