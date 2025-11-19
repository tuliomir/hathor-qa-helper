/**
 * Bet Initialize Stage
 *
 * Tests htr_sendNanoContractTx (initialize) RPC call with Redux state persistence
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  setBetInitializeRequest,
  setBetInitializeResponse,
  setBetInitializeError,
} from '../../store/slices/betInitializeSlice';
import { setBetNanoContractId } from '../../store/slices/betNanoContractSlice';
import { selectWalletConnectFirstAddress, selectIsWalletConnectConnected } from '../../store/slices/walletConnectSlice';
import { RpcBetInitializeCard } from '../rpc/RpcBetInitializeCard';
import { createRpcHandlers } from '../../services/rpcHandlers';

export const BetInitializeStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const testWallet = useSelector((state: RootState) =>
    testWalletId ? state.walletStore.wallets[testWalletId] : null
  );
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const betInitializeData = useSelector((state: RootState) => state.betInitialize);

  // Local state
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);
  const [blueprintId, setBlueprintId] = useState<string>('');
  const [oracleAddress, setOracleAddress] = useState<string>('');
  const [token, setToken] = useState<string>('00');
  const [deadline, setDeadline] = useState<string>(() => {
    const date = new Date(Date.now() + 3600 * 1000);
    return date.toISOString().slice(0, 16);
  });
  const [pushTx, setPushTx] = useState<boolean>(false);

  // Get test wallet address at index 0
  useEffect(() => {
    const getAddress = async () => {
      if (testWallet?.instance) {
        try {
          // Type assertion since we know the instance has getAddressAtIndex method
          const wallet = testWallet.instance as { getAddressAtIndex: (index: number) => Promise<string> };
          const address = await wallet.getAddressAtIndex(0);
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
  const handleExecuteBetInitialize = async () => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    const startTime = Date.now();

    try {
      const deadlineDate = new Date(deadline);
      const { request, response } = await rpcHandlers.getRpcInitializeBet(
        blueprintId,
        oracleAddress,
        token,
        deadlineDate,
        pushTx
      );
      const duration = Date.now() - startTime;

      // Store request in Redux
      dispatch(setBetInitializeRequest({
        method: request.method,
        params: request.params,
        isDryRun,
      }));

      // Store response in Redux
      dispatch(setBetInitializeResponse({
        response,
        duration,
      }));

      // Store the nano contract ID for use in other stages
      if ((response as any)?.response?.hash) {
        dispatch(setBetNanoContractId({
          ncId: (response as any).response.hash,
          blueprintId,
        }));
      }

      return { request, response };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Store error in Redux
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setBetInitializeError({
        error: errorMessage,
        duration,
      }));

      throw error;
    }
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Initialize Bet RPC</h1>
      <p className="text-muted mb-7.5">
        Initialize a new bet nano contract with oracle and token configuration
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

      {/* BetInitialize Card */}
      {isConnected && !addressMismatch && rpcHandlers && (
        <RpcBetInitializeCard
          onExecute={handleExecuteBetInitialize}
          disabled={false}
          blueprintId={blueprintId}
          setBlueprintId={setBlueprintId}
          oracleAddress={oracleAddress}
          setOracleAddress={setOracleAddress}
          token={token}
          setToken={setToken}
          deadline={deadline}
          setDeadline={setDeadline}
          pushTx={pushTx}
          setPushTx={setPushTx}
          isDryRun={isDryRun}
          initialRequest={betInitializeData.request}
          initialResponse={betInitializeData.rawResponse}
          initialError={betInitializeData.error}
        />
      )}

      {/* Persisted Data Info */}
      {betInitializeData.timestamp && (
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
                {betInitializeData.duration !== null && (
                  <span className="block mt-1">
                    Last request took {betInitializeData.duration}ms
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
