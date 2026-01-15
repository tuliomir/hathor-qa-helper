/**
 * Get UTXOs Stage
 *
 * Tests htr_getUtxos RPC call with token selection and filters
 */

import React, { useMemo, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  setGetUtxosRequest,
  setGetUtxosResponse,
  setGetUtxosError,
  setGetUtxosFormData,
  clearGetUtxosData,
} from '../../store/slices/getUtxosSlice';
import { selectIsWalletConnectConnected } from '../../store/slices/walletConnectSlice';
import { RpcGetUtxosCard } from '../rpc/RpcGetUtxosCard';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useWalletStore } from '../../hooks/useWalletStore';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

interface Token {
  uid: string;
  name: string;
  symbol: string;
}

export const GetUtxosStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const getUtxosData = useSelector((state: RootState) => state.getUtxos);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const allTokens = useSelector((state: RootState) => state.tokens.tokens);

  // Get the test wallet instance
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  // Local state for form inputs
  const [tokenUid, setTokenUid] = useState<string>(getUtxosData.tokenUid);
  const [maxUtxos, setMaxUtxos] = useState<number>(getUtxosData.maxUtxos);
  const [amountSmallerThan, setAmountSmallerThan] = useState<string>(
    getUtxosData.amountSmallerThan !== null ? String(getUtxosData.amountSmallerThan) : ''
  );
  const [amountBiggerThan, setAmountBiggerThan] = useState<string>(
    getUtxosData.amountBiggerThan !== null ? String(getUtxosData.amountBiggerThan) : ''
  );

  // State for available tokens (with non-zero balance)
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
        const htrBalance = await testWallet.instance.getBalance(NATIVE_TOKEN_UID);
        if (htrBalance[0]?.balance?.unlocked && htrBalance[0].balance.unlocked > 0n) {
          tokensWithBalance.push({ uid: NATIVE_TOKEN_UID, name: 'Hathor', symbol: 'HTR' });
        }

        // Check custom tokens
        for (const uid of testWallet.tokenUids) {
          if (uid === NATIVE_TOKEN_UID) continue;

          try {
            const balance = await testWallet.instance.getBalance(uid);
            if (balance[0]?.balance?.unlocked && balance[0].balance.unlocked > 0n) {
              const tokenInfo = allTokens.find((t) => t.uid === uid);
              if (tokenInfo) {
                tokensWithBalance.push({
                  uid: tokenInfo.uid,
                  name: tokenInfo.name,
                  symbol: tokenInfo.symbol,
                });
              }
            }
          } catch (err) {
            console.error(`Failed to load balance for token ${uid}:`, err);
          }
        }

        setAvailableTokens(tokensWithBalance);

        // If current token is not in the list, select the first available token
        if (tokensWithBalance.length > 0 && !tokensWithBalance.find((t) => t.uid === tokenUid)) {
          setTokenUid(tokensWithBalance[0].uid);
        }
      } catch (error) {
        console.error('Failed to load tokens:', error);
        setAvailableTokens([{ uid: NATIVE_TOKEN_UID, name: 'Hathor', symbol: 'HTR' }]);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    loadTokens();
  }, [testWallet, allTokens, tokenUid]);

  // Save form state to Redux whenever it changes
  useEffect(() => {
    dispatch(
      setGetUtxosFormData({
        tokenUid,
        maxUtxos,
        amountSmallerThan: amountSmallerThan ? parseInt(amountSmallerThan, 10) : null,
        amountBiggerThan: amountBiggerThan ? parseInt(amountBiggerThan, 10) : null,
      })
    );
  }, [tokenUid, maxUtxos, amountSmallerThan, amountBiggerThan, dispatch]);

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
  const handleExecuteGetUtxos = async () => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    // Clear previous data
    dispatch(clearGetUtxosData());

    const startTime = Date.now();

    try {
      const { request, response } = await rpcHandlers.getRpcGetUtxos(
        tokenUid,
        maxUtxos,
        amountSmallerThan ? parseInt(amountSmallerThan, 10) : null,
        amountBiggerThan ? parseInt(amountBiggerThan, 10) : null
      );
      const duration = Date.now() - startTime;

      // Store request in Redux
      dispatch(
        setGetUtxosRequest({
          method: request.method,
          params: request.params,
          isDryRun,
        })
      );

      // Store response in Redux
      dispatch(
        setGetUtxosResponse({
          response,
          duration,
        })
      );

      return { request, response };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Store error in Redux
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(
        setGetUtxosError({
          error: errorMessage,
          duration,
        })
      );

      throw error;
    }
  };

  const selectedToken = availableTokens.find((t) => t.uid === tokenUid);

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Get UTXOs RPC</h1>
      <p className="text-muted mb-7.5">
        Retrieve unspent transaction outputs (UTXOs) for a specific token
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

      {/* No Wallet Warning */}
      {isConnected && !testWallet && (
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
              <p className="font-bold text-yellow-900 m-0">No Test Wallet Selected</p>
              <p className="text-sm text-yellow-800 mt-1 mb-0">
                Please select a test wallet in the Wallet Initialization stage to load available tokens.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Inputs */}
      {isConnected && rpcHandlers && testWallet && (
        <>
          {/* Token Selection */}
          <div className="card-primary mb-7.5">
            <label htmlFor="token-select" className="block mb-1.5 font-bold">
              Token:
            </label>
            <select
              id="token-select"
              value={tokenUid}
              onChange={(e) => setTokenUid(e.target.value)}
              className="input"
              disabled={isLoadingTokens || availableTokens.length === 0}
            >
              {isLoadingTokens ? (
                <option>Loading tokens...</option>
              ) : availableTokens.length === 0 ? (
                <option>No tokens with balance found</option>
              ) : (
                availableTokens.map((token) => (
                  <option key={token.uid} value={token.uid}>
                    {token.symbol} - {token.name}
                  </option>
                ))
              )}
            </select>
            <p className="text-muted text-xs mt-1.5 mb-0">
              Select the token to query UTXOs for (only tokens with non-zero balance are shown)
            </p>
          </div>

          {/* Max UTXOs */}
          <div className="card-primary mb-7.5">
            <label htmlFor="max-utxos" className="block mb-1.5 font-bold">
              Max UTXOs:
            </label>
            <input
              id="max-utxos"
              type="number"
              min={1}
              step={1}
              value={maxUtxos}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                  setMaxUtxos(val);
                }
              }}
              className="input"
            />
            <p className="text-muted text-xs mt-1.5 mb-0">
              Maximum number of UTXOs to return
            </p>
          </div>

          {/* Amount Filters */}
          <div className="card-primary mb-7.5">
            <h3 className="text-lg font-bold mb-3">Amount Filters (Optional)</h3>

            <div className="mb-4">
              <label htmlFor="amount-smaller-than" className="block mb-1.5 font-semibold">
                Amount Smaller Than:
              </label>
              <input
                id="amount-smaller-than"
                type="number"
                min={0}
                step={1}
                value={amountSmallerThan}
                onChange={(e) => setAmountSmallerThan(e.target.value)}
                placeholder="Leave empty for no filter"
                className="input"
              />
              <p className="text-muted text-xs mt-1.5 mb-0">
                Filter UTXOs with amount less than this value
              </p>
            </div>

            <div>
              <label htmlFor="amount-bigger-than" className="block mb-1.5 font-semibold">
                Amount Bigger Than:
              </label>
              <input
                id="amount-bigger-than"
                type="number"
                min={0}
                step={1}
                value={amountBiggerThan}
                onChange={(e) => setAmountBiggerThan(e.target.value)}
                placeholder="Leave empty for no filter"
                className="input"
              />
              <p className="text-muted text-xs mt-1.5 mb-0">
                Filter UTXOs with amount greater than this value
              </p>
            </div>
          </div>

          {/* Selected Token Info */}
          {selectedToken && (
            <div className="card-primary mb-7.5 bg-gray-50">
              <h3 className="text-lg font-bold mb-2">Selected Token</h3>
              <div className="space-y-1">
                <p className="text-sm mb-0">
                  <span className="font-semibold">Symbol:</span> {selectedToken.symbol}
                </p>
                <p className="text-sm mb-0">
                  <span className="font-semibold">Name:</span> {selectedToken.name}
                </p>
                <p className="text-sm mb-0">
                  <span className="font-semibold">UID:</span>
                  <span className="font-mono text-xs ml-1">{selectedToken.uid}</span>
                </p>
              </div>
            </div>
          )}

          {/* RPC Card */}
          <RpcGetUtxosCard
            onExecute={handleExecuteGetUtxos}
            disabled={false}
            isDryRun={isDryRun}
            network={testWallet.metadata.network}
            initialRequest={getUtxosData.request}
            initialResponse={getUtxosData.rawResponse}
            initialError={getUtxosData.error}
          />
        </>
      )}

      {/* Persisted Data Info */}
      {getUtxosData.timestamp && (
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
                {getUtxosData.duration !== null && (
                  <span className="block mt-1">
                    Last request took {getUtxosData.duration}ms
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
