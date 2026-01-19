/**
 * Create Token Stage
 *
 * Tests htr_createToken RPC call with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setCreateTokenError,
  setCreateTokenRequest,
  setCreateTokenResponse,
} from '../../store/slices/createTokenSlice';
import { refreshWalletBalance, refreshWalletTokens } from '../../store/slices/walletStoreSlice';
import { selectIsWalletConnectConnected, selectWalletConnectFirstAddress } from '../../store/slices/walletConnectSlice';
import { RpcCreateTokenCard } from '../rpc/RpcCreateTokenCard';
import type { CreateTokenParams } from '../../services/rpcHandlers';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useDeepLinkCallback } from '../../hooks/useDeepLinkCallback';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';

export const CreateTokenStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const fundingWalletId = useSelector((state: RootState) => state.walletSelection.fundingWalletId);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const createTokenData = useSelector((state: RootState) => state.createToken);

  // Get the actual wallet instances (not from Redux, from walletInstancesMap)
  const testWallet = testWalletId ? getWallet(testWalletId) : null;
  const fundingWallet = fundingWalletId ? getWallet(fundingWalletId) : null;

  // Local state
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);
  const [fundingWalletAddress, setFundingWalletAddress] = useState<string | null>(null);

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

  // Get funding wallet address at index 0
  useEffect(() => {
    const getAddress = async () => {
      if (fundingWallet?.instance) {
        try {
          const address = await fundingWallet.instance.getAddressAtIndex(0);
          setFundingWalletAddress(address);
        } catch (error) {
          console.error('Failed to get funding wallet address:', error);
          setFundingWalletAddress(null);
        }
      } else {
        setFundingWalletAddress(null);
      }
    };

    getAddress();
  }, [fundingWallet]);

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
      dryRun: isDryRun,
      onDeepLinkAvailable,
    });
  }, [walletConnect.client, walletConnect.session, isDryRun, onDeepLinkAvailable]);

  // Wrapper for onExecute that stores results in Redux
  const handleExecuteCreateToken = async (params: CreateTokenParams) => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    const startTime = Date.now();

    try {
      const { request, response } = await rpcHandlers.getRpcCreateToken(params);
      const duration = Date.now() - startTime;

      // Clear deep link notification after RPC response
      clearDeepLinkNotification();

      // Convert BigInt to strings for Redux serialization
      const serializedResponse = response ? JSON.parse(JSONBigInt.stringify(response)) : null;

      // Store request in Redux
      dispatch(setCreateTokenRequest({
        method: request.method,
        params: request.params,
        isDryRun,
      }));

      // Store response in Redux (with BigInt converted to strings)
      dispatch(setCreateTokenResponse({
        response: serializedResponse,
        duration,
      }));

      // If token was created successfully (not dry run and response exists), refresh wallet tokens
      if (!isDryRun && response && testWalletId) {
        try {
          // Dispatch wallet token refresh actions
          await Promise.all([
            dispatch(refreshWalletTokens(testWalletId)).unwrap(),
            dispatch(refreshWalletBalance(testWalletId)).unwrap(),
          ]);
          console.log('Wallet tokens refreshed after token creation');
        } catch (refreshError) {
          console.error('Failed to refresh wallet tokens:', refreshError);
          // Don't throw - token was created successfully, refresh is just a bonus
        }
      }

      return { request, response: serializedResponse };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Clear deep link notification on error too
      clearDeepLinkNotification();

      // Store error in Redux
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setCreateTokenError({
        error: errorMessage,
        duration,
      }));

      throw error;
    }
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Create Token RPC</h1>
      <p className="text-muted mb-7.5">
        Test the htr_createToken RPC method to create custom tokens with mint/melt authorities
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

      {/* CreateToken Card */}
      {isConnected && !addressMismatch && rpcHandlers && testWallet && (
        <RpcCreateTokenCard
          onExecute={handleExecuteCreateToken}
          disabled={false}
          isDryRun={isDryRun}
          walletAddress={testWalletAddress}
          fundingWalletAddress={fundingWalletAddress}
          network={testWallet.metadata.network}
          initialRequest={createTokenData.request}
          initialResponse={createTokenData.rawResponse}
          initialError={createTokenData.error}
        />
      )}

      {/* Persisted Data Info */}
      {createTokenData.timestamp && (
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
                {createTokenData.duration !== null && (
                  <span className="block mt-1">
                    Last request took {createTokenData.duration}ms
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
