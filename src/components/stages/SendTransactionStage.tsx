/**
 * Send Transaction Stage
 *
 * Tests htr_sendTransaction RPC call with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import type { SendTransactionOutput } from '../../store/slices/sendTransactionSlice';
import {
	clearSendTransactionData,
	setSendTransactionError,
	setSendTransactionFormData,
	setSendTransactionRequest,
	setSendTransactionResponse,
} from '../../store/slices/sendTransactionSlice';
import { selectIsWalletConnectConnected } from '../../store/slices/walletConnectSlice';
import { RpcSendTransactionCard } from '../rpc/RpcSendTransactionCard';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useWalletStore } from '../../hooks/useWalletStore';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

interface Token {
  uid: string;
  name: string;
  symbol: string;
}

export const SendTransactionStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const sendTransactionData = useSelector((state: RootState) => state.sendTransaction);
  const allTokens = useSelector((state: RootState) => state.tokens.tokens);

  // Get the actual wallet instance
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  // Local state for available tokens
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Load available tokens from wallet
  useEffect(() => {
    const loadTokens = async () => {
      if (!testWallet?.instance || !testWallet.tokenUids) {
        setAvailableTokens([{ uid: NATIVE_TOKEN_UID, name: 'Hathor', symbol: 'HTR' }]);
        return;
      }

      setIsLoadingTokens(true);

      try {
        const tokensWithBalance: Token[] = [];

        // Always include HTR
        tokensWithBalance.push({ uid: NATIVE_TOKEN_UID, name: 'Hathor', symbol: 'HTR' });

        // Check custom tokens
        for (const uid of testWallet.tokenUids) {
          if (uid === NATIVE_TOKEN_UID) continue;

          try {
            const tokenInfo = allTokens.find((t) => t.uid === uid);
            if (tokenInfo) {
              tokensWithBalance.push({
                uid: tokenInfo.uid,
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
              });
            }
          } catch (err) {
            console.error(`Failed to load token ${uid}:`, err);
          }
        }

        setAvailableTokens(tokensWithBalance);
      } catch (error) {
        console.error('Failed to load tokens:', error);
        setAvailableTokens([{ uid: NATIVE_TOKEN_UID, name: 'Hathor', symbol: 'HTR' }]);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    loadTokens();
  }, [testWallet, allTokens]);

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

  // Save form data to Redux whenever it changes in the card
  useEffect(() => {
    // This will be called by the card when form data changes
  }, []);

  // Wrapper for onExecute that stores results in Redux
  const handleExecuteSendTransaction = async (outputs: SendTransactionOutput[], pushTx: boolean) => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    // Save form data to Redux
    dispatch(setSendTransactionFormData({ outputs, pushTx }));

    // Clear previous data before new request
    dispatch(clearSendTransactionData());

    const startTime = Date.now();

    try {
      const { request, response } = await rpcHandlers.getRpcSendTransaction(outputs, pushTx);
      const duration = Date.now() - startTime;

      // Convert BigInt to strings for Redux serialization
      const serializedResponse = response ? JSON.parse(JSONBigInt.stringify(response)) : null;

      // Store request in Redux
      dispatch(setSendTransactionRequest({
        method: request.method,
        params: request.params,
        isDryRun,
      }));

      // Store response in Redux (with BigInt converted to strings)
      dispatch(setSendTransactionResponse({
        response: serializedResponse,
        duration,
      }));

      return { request, response: serializedResponse };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Store error in Redux
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setSendTransactionError({
        error: errorMessage,
        duration,
      }));

      throw error;
    }
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Send Transaction RPC</h1>
      <p className="text-muted mb-7.5">
        Test the htr_sendTransaction RPC method to send transactions with one or more outputs
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

      {/* Send Transaction Card */}
      {isConnected && rpcHandlers && testWallet && (
        <RpcSendTransactionCard
          onExecute={handleExecuteSendTransaction}
          disabled={false}
          isDryRun={isDryRun}
          network={testWallet.metadata.network}
          testWallet={testWallet.instance}
          availableTokens={availableTokens}
          isLoadingTokens={isLoadingTokens}
          initialRequest={sendTransactionData.request}
          initialResponse={sendTransactionData.rawResponse}
          initialError={sendTransactionData.error}
          initialFormData={sendTransactionData.formData}
        />
      )}

      {/* Persisted Data Info */}
      {sendTransactionData.timestamp && (
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
                {sendTransactionData.duration !== null && (
                  <span className="block mt-1">
                    Last request took {sendTransactionData.duration}ms
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
