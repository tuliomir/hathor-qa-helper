/**
 * Fee Initialize Stage
 *
 * Tests htr_sendNanoContractTx (initialize) RPC call with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setFeeInitializeError,
  setFeeInitializeRequest,
  setFeeInitializeResponse,
} from '../../store/slices/feeInitializeSlice';
import { setFeeNanoContractId } from '../../store/slices/feeNanoContractSlice';
import { selectIsWalletConnectConnected, selectWalletConnectFirstAddress } from '../../store/slices/walletConnectSlice';
import { RpcFeeInitializeCard } from '../rpc/RpcFeeInitializeCard';
import { RpcNotConnectedBanner } from '../rpc/RpcNotConnectedBanner';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { NETWORK_CONFIG } from '../../constants/network';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useDeepLinkCallback } from '../../hooks/useDeepLinkCallback';
import { extractErrorMessage } from '../../utils/errorUtils';

export const FeeInitializeStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const feeInitializeData = useSelector((state: RootState) => state.feeInitialize);

  // Get the actual wallet instance (not from Redux, from walletInstancesMap)
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  // Local state
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);
  const [blueprintId, setBlueprintId] = useState<string>(NETWORK_CONFIG.TESTNET.feeBlueprintId);
  const [amount, setAmount] = useState<string>('10');
  const [changeAddress, setChangeAddress] = useState<string>('');
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [pushTx, setPushTx] = useState<boolean>(false);

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

  // Derive changeAddress from selected index
  useEffect(() => {
    const deriveAddress = async () => {
      if (testWallet?.instance) {
        try {
          const address = await testWallet.instance.getAddressAtIndex(addressIndex);
          setChangeAddress(address);
        } catch (error) {
          console.error(`[FeeInitialize] Failed to derive address at index ${addressIndex}:`, error);
          // Keep the previous value or empty string on error
          setChangeAddress('');
        }
      } else {
        console.log('[FeeInitialize] Wallet not loaded yet');
        // Wallet not loaded yet, clear the address and wait
        setChangeAddress('');
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
  const handleExecuteFeeInitialize = async () => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    const startTime = Date.now();

    try {
      const { request, response } = await rpcHandlers.getRpcFeeInitialize(
        blueprintId,
        amount,
        changeAddress,
        pushTx,
      );
      const duration = Date.now() - startTime;

      // Clear deep link notification after RPC response
      clearDeepLinkNotification();

      // Store request in Redux
      dispatch(setFeeInitializeRequest({
        method: request.method,
        params: request.params,
        isDryRun,
      }));

      // Store response in Redux
      dispatch(setFeeInitializeResponse({
        response,
        duration,
      }));

      // Store the nano contract ID for use in other stages
      if (response && typeof response === 'object' && 'response' in response && response.response && typeof response.response === 'object' && 'hash' in response.response) {
        dispatch(setFeeNanoContractId({
          ncId: (response.response as { hash: string }).hash,
          blueprintId,
        }));
      }

      return { request, response };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Clear deep link notification on error too
      clearDeepLinkNotification();

      // Store error in Redux
      const errorMessage = extractErrorMessage(error);
      dispatch(setFeeInitializeError({
        error: errorMessage,
        duration,
      }));

      throw error;
    }
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Initialize Fee RPC</h1>
      <p className="text-muted mb-7.5">
        Initialize a new fee nano contract with an HTR deposit
      </p>

      {!isConnected && <RpcNotConnectedBanner />}

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

      {/* FeeInitialize Card */}
      {isConnected && !addressMismatch && rpcHandlers && (
        <RpcFeeInitializeCard
          onExecute={handleExecuteFeeInitialize}
          disabled={false}
          blueprintId={blueprintId}
          setBlueprintId={setBlueprintId}
          amount={amount}
          setAmount={setAmount}
          changeAddress={changeAddress}
          addressIndex={addressIndex}
          setAddressIndex={setAddressIndex}
          pushTx={pushTx}
          setPushTx={setPushTx}
          isDryRun={isDryRun}
          initialRequest={feeInitializeData.request}
          initialResponse={feeInitializeData.rawResponse}
          initialError={feeInitializeData.error}
        />
      )}

      {/* Persisted Data Info */}
      {feeInitializeData.timestamp && (
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
                {feeInitializeData.duration !== null && (
                  <span className="block mt-1">
                    Last request took {feeInitializeData.duration}ms
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
