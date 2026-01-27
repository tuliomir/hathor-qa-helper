/**
 * Bet Deposit Stage
 *
 * Tests htr_sendNanoContractTx (bet/deposit) RPC call with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setBetDepositError,
  setBetDepositFormData,
  setBetDepositRequest,
  setBetDepositResponse,
} from '../../store/slices/betDepositSlice';
import { selectIsWalletConnectConnected, selectWalletConnectFirstAddress } from '../../store/slices/walletConnectSlice';
import { RpcBetDepositCard } from '../rpc/RpcBetDepositCard';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useDeepLinkCallback } from '../../hooks/useDeepLinkCallback';
import { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

export const BetDepositStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const betDepositData = useSelector((state: RootState) => state.betDeposit);
  const betNanoContract = useSelector((state: RootState) => state.betNanoContract);
  const latestInitializedNcId = betNanoContract.ncId;
  const initialToken = betNanoContract.token;

  // Get the actual wallet instance (not from Redux, from walletInstancesMap)
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  // Local state
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);
  const [ncId, setNcId] = useState<string>(latestInitializedNcId || '');
  const [betChoice, setBetChoice] = useState<string>('Result_1');
  const [amount, setAmount] = useState<string>('1');
  const [address, setAddress] = useState<string>('');
  const [token, setToken] = useState<string>(initialToken || NATIVE_TOKEN_UID);
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [pushTx, setPushTx] = useState<boolean>(false);

  // Update ncId when latestInitializedNcId changes
  useEffect(() => {
    if (latestInitializedNcId) {
      setNcId(latestInitializedNcId);
    }
  }, [latestInitializedNcId]);

  // Update token when initialToken changes
  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
    }
  }, [initialToken]);

  // Save form state to Redux whenever it changes (for prepopulating withdraw)
  useEffect(() => {
    dispatch(setBetDepositFormData({ ncId, amount, token, addressIndex }));
  }, [ncId, amount, token, addressIndex, dispatch]);

  // Compute wallet tokens (include native token + custom tokens from Redux)
  const allTokens = useSelector((state: RootState) => state.tokens.tokens);
  const walletTokens = React.useMemo(() => {
    const tokens = [
      {
        uid: NATIVE_TOKEN_UID,
        symbol: DEFAULT_NATIVE_TOKEN_CONFIG.symbol,
        name: DEFAULT_NATIVE_TOKEN_CONFIG.name,
      },
    ];

    if (testWallet?.tokenUids) {
      const customTokens = testWallet.tokenUids
        .filter((uid) => uid !== NATIVE_TOKEN_UID)
        .map((uid) => allTokens.find((t) => t.uid === uid))
        .filter((t): t is { uid: string; name: string; symbol: string } => t !== undefined);

      tokens.push(...customTokens);
    }

    return tokens;
  }, [testWallet, allTokens]);

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

  // Derive address from selected index
  useEffect(() => {
    const deriveAddress = async () => {
      if (testWallet?.instance) {
        try {
          const derivedAddress = await testWallet.instance.getAddressAtIndex(addressIndex);
          setAddress(derivedAddress);
        } catch (error) {
          console.error(`[BetDeposit] Failed to derive address at index ${addressIndex}:`, error);
          setAddress('');
        }
      } else {
        console.log('[BetDeposit] Wallet not loaded yet');
        setAddress('');
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
  const handleExecuteBetDeposit = async () => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    if (!ncId) {
      throw new Error('No Nano Contract ID available');
    }

    const startTime = Date.now();

    try {
      const amountNum = parseFloat(amount) || 0;
      const { request, response } = await rpcHandlers.getRpcBetDeposit(
        ncId,
        betChoice,
        amountNum,
        address,
        token,
        pushTx
      );
      const duration = Date.now() - startTime;

      // Clear deep link notification after RPC response
      clearDeepLinkNotification();

      // Store request in Redux
      dispatch(setBetDepositRequest({
        method: request.method,
        params: request.params,
        isDryRun,
      }));

      // Store response in Redux with betChoice metadata
      dispatch(setBetDepositResponse({
        response,
        duration,
        betChoice,
      }));

      return { request, response };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Clear deep link notification on error too
      clearDeepLinkNotification();

      // Store error in Redux
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setBetDepositError({
        error: errorMessage,
        duration,
      }));

      throw error;
    }
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Place Bet RPC</h1>
      <p className="text-muted mb-7.5">
        Place a bet on an existing bet nano contract
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

      {/* BetDeposit Card */}
      {isConnected && !addressMismatch && rpcHandlers && (
        <RpcBetDepositCard
          onExecute={handleExecuteBetDeposit}
          ncId={ncId}
          setNcId={setNcId}
          latestInitializedNcId={latestInitializedNcId}
          betChoice={betChoice}
          setBetChoice={setBetChoice}
          amount={amount}
          setAmount={setAmount}
          address={address}
          addressIndex={addressIndex}
          setAddressIndex={setAddressIndex}
          token={token}
          setToken={setToken}
          initialToken={initialToken}
          pushTx={pushTx}
          setPushTx={setPushTx}
          tokens={walletTokens}
          isDryRun={isDryRun}
          initialRequest={betDepositData.request}
          initialResponse={betDepositData.rawResponse}
          initialError={betDepositData.error}
        />
      )}

      {/* Persisted Data Info */}
      {betDepositData.timestamp && (
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
                {betDepositData.duration !== null && (
                  <span className="block mt-1">
                    Last request took {betDepositData.duration}ms
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
