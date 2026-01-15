/**
 * Get Address Stage
 *
 * Tests htr_getAddress RPC call with different request types
 */

import React, { useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  setGetAddressRequest,
  setGetAddressResponse,
  setGetAddressError,
  setRequestType,
  setIndexValue,
  setValidationStatus,
  clearGetAddressData,
  type AddressRequestType,
} from '../../store/slices/getAddressSlice';
import { selectIsWalletConnectConnected } from '../../store/slices/walletConnectSlice';
import { RpcGetAddressCard } from '../rpc/RpcGetAddressCard';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useWalletStore } from '../../hooks/useWalletStore';

export const GetAddressStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const getAddressData = useSelector((state: RootState) => state.getAddress);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);

  // Get the test wallet instance for validation
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

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

    // Clear previous request/response/validation data
    dispatch(clearGetAddressData());

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

  // Validate address when response is received
  useEffect(() => {
    const validateAddress = async () => {
      // Only validate if we have a response and a wallet instance
      if (!getAddressData.response || !testWallet?.instance || getAddressData.isDryRun) {
        return;
      }

      // Skip validation if already validating or completed
      if (getAddressData.validationStatus === 'validating' ||
          getAddressData.validationStatus === 'match' ||
          getAddressData.validationStatus === 'mismatch') {
        return;
      }

      try {
        dispatch(setValidationStatus({ status: 'validating' }));

        // Derive the address locally from the wallet
        const localAddress = await testWallet.instance.getAddressAtIndex(
          getAddressData.response.index
        );

        // Compare with RPC response
        const matches = localAddress === getAddressData.response.address;

        dispatch(setValidationStatus({
          status: matches ? 'match' : 'mismatch',
          localAddress,
        }));
      } catch (error) {
        console.error('Failed to validate address:', error);
        dispatch(setValidationStatus({
          status: 'mismatch',
        }));
      }
    };

    validateAddress();
  }, [getAddressData.response, getAddressData.validationStatus, getAddressData.isDryRun, testWallet?.instance, dispatch]);

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

          {/* Address Validation Display */}
          {getAddressData.response && !getAddressData.isDryRun && (
            <div className="card-primary mb-7.5">
              <h3 className="text-lg font-bold mb-3">Address Validation</h3>

              {getAddressData.validationStatus === 'validating' && (
                <div className="flex items-center gap-2 text-muted">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Validating address...</span>
                </div>
              )}

              {getAddressData.validationStatus === 'match' && (
                <div className="p-4 bg-green-50 border border-success rounded">
                  <div className="flex items-center gap-2 text-success">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
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
                    <span className="font-semibold text-lg">Address matches local Wallet</span>
                  </div>
                  <p className="text-sm text-green-800 mt-2 mb-0">
                    The address from the RPC response matches the locally derived address at index {getAddressData.response.index}.
                  </p>
                </div>
              )}

              {getAddressData.validationStatus === 'mismatch' && (
                <div className="p-4 bg-red-50 border border-danger rounded">
                  <div className="flex items-center gap-2 text-danger mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-semibold text-lg">Address differs from local Wallet</span>
                  </div>
                  <div className="text-sm text-red-900 space-y-2">
                    <div>
                      <p className="font-semibold mb-1">RPC Address:</p>
                      <p className="font-mono text-xs bg-white p-2 rounded break-all">
                        {getAddressData.response.address}
                      </p>
                    </div>
                    {getAddressData.localAddress && (
                      <div>
                        <p className="font-semibold mb-1">Local Address (index {getAddressData.response.index}):</p>
                        <p className="font-mono text-xs bg-white p-2 rounded break-all">
                          {getAddressData.localAddress}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!testWallet && (
                <div className="p-4 bg-yellow-50 border border-warning rounded">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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
                    <span className="font-semibold">No test wallet available for validation</span>
                  </div>
                  <p className="text-sm text-yellow-800 mt-2 mb-0">
                    Please initialize a test wallet in the Wallet Initialization stage to enable address validation.
                  </p>
                </div>
              )}
            </div>
          )}
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
