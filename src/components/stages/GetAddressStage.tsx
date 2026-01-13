/**
 * Get Address Stage
 *
 * Tests htr_getAddress RPC call with different request types
 */

import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  setGetAddressRequest,
  setGetAddressResponse,
  setGetAddressError,
  setRequestType,
  setIndexValue,
  type AddressRequestType,
} from '../../store/slices/getAddressSlice';
import { selectIsWalletConnectConnected } from '../../store/slices/walletConnectSlice';
import { RpcGetAddressCard } from '../rpc/RpcGetAddressCard';
import { createRpcHandlers } from '../../services/rpcHandlers';

export const GetAddressStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const getAddressData = useSelector((state: RootState) => state.getAddress);

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
  const handleExecuteGetAddress = async (type: AddressRequestType, index?: number) => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    const startTime = Date.now();

    try {
      const { request, response } = await rpcHandlers.getRpcGetAddress(type, index);
      const duration = Date.now() - startTime;

      // Store request in Redux
      dispatch(setGetAddressRequest({
        method: request.method,
        params: request.params,
        isDryRun,
      }));

      // Store response in Redux
      dispatch(setGetAddressResponse({
        response,
        duration,
      }));

      return { request, response };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Store error in Redux
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setGetAddressError({
        error: errorMessage,
        duration,
      }));

      throw error;
    }
  };

  const handleRequestTypeChange = (type: AddressRequestType) => {
    dispatch(setRequestType(type));
  };

  const handleIndexValueChange = (index: number) => {
    dispatch(setIndexValue(index));
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Get Address RPC</h1>
      <p className="text-muted mb-7.5">
        Retrieve wallet addresses using different request types
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

      {/* Get Address Card */}
      {isConnected && rpcHandlers && (
        <>
          <RpcGetAddressCard
            onExecute={handleExecuteGetAddress}
            disabled={false}
            isDryRun={isDryRun}
            requestType={getAddressData.requestType}
            indexValue={getAddressData.indexValue}
            onRequestTypeChange={handleRequestTypeChange}
            onIndexValueChange={handleIndexValueChange}
            initialRequest={getAddressData.request}
            initialResponse={getAddressData.rawResponse}
            initialError={getAddressData.error}
          />
        </>
      )}

      {/* Persisted Data Info */}
      {getAddressData.timestamp && (
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
                {getAddressData.duration !== null && (
                  <span className="block mt-1">
                    Last request took {getAddressData.duration}ms
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
