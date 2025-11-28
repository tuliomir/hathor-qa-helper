/**
 * Bet Withdraw Stage
 *
 * Tests htr_sendNanoContractTx (withdraw) RPC call with Redux state persistence
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  setBetWithdrawRequest,
  setBetWithdrawResponse,
  setBetWithdrawError,
  setBetWithdrawFormData,
} from '../../store/slices/betWithdrawSlice';
import { selectWalletConnectFirstAddress, selectIsWalletConnectConnected } from '../../store/slices/walletConnectSlice';
import { RpcBetWithdrawCard } from '../rpc/RpcBetWithdrawCard';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useWalletStore } from '../../hooks/useWalletStore';

export const BetWithdrawStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const betWithdrawData = useSelector((state: RootState) => state.betWithdraw);
  const betDepositData = useSelector((state: RootState) => state.betDeposit);
  const betNanoContract = useSelector((state: RootState) => state.betNanoContract);
  const latestNcId = betNanoContract.ncId;


  // Get the actual wallet instance
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  // Local state
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);
  const [ncId, setNcId] = useState<string>('');
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [amount, setAmount] = useState<string>('1');
  const [token, setToken] = useState<string>('00');
  const [pushTx, setPushTx] = useState<boolean>(false);

  // Initialize ncId from latest on mount or when it changes
  useEffect(() => {
    if (latestNcId && !ncId) {
      setNcId(latestNcId);
    }
  }, [latestNcId, ncId]);

  // Initialize from Redux on mount
  useEffect(() => {
    // Prepopulate from Place Bet stage if it was used successfully
    if (betDepositData.timestamp && !betDepositData.error && betDepositData.ncId) {
      // Use deposit data as defaults (tester likely wants to withdraw what they deposited)
      setNcId(betDepositData.ncId);
      setAddressIndex(betDepositData.addressIndex);
      setAmount(betDepositData.amount);
      setToken(betDepositData.token);
    } else {
      // Fall back to persisted withdraw data or defaults
      setAddressIndex(0);
      setAmount(betWithdrawData.amount);
      setToken(betWithdrawData.token);
    }
    setPushTx(betWithdrawData.pushTx);
  }, []); // Only on mount

  // Save form state to Redux whenever it changes
  useEffect(() => {
    dispatch(setBetWithdrawFormData({ address: withdrawAddress, amount, token, pushTx }));
  }, [withdrawAddress, amount, token, pushTx, dispatch]);

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

  // Derive withdrawal address from selected index
  useEffect(() => {
    const deriveAddress = async () => {
      if (testWallet?.instance) {
        try {
          const address = await testWallet.instance.getAddressAtIndex(addressIndex);
          setWithdrawAddress(address);
        } catch (error) {
          console.error(`[BetWithdraw] Failed to derive address at index ${addressIndex}:`, error);
          setWithdrawAddress('');
        }
      } else {
        console.log('[BetWithdraw] Wallet not loaded yet');
        setWithdrawAddress('');
      }
    };

    deriveAddress();
  }, [testWallet, addressIndex]);

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
  const handleExecuteBetWithdraw = async () => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    if (!ncId) {
      throw new Error('No Nano Contract ID available');
    }

    const startTime = Date.now();

    try {
      const amountNum = parseFloat(amount) || 0;
      const { request, response } = await rpcHandlers.getRpcBetWithdraw(
        ncId,
        withdrawAddress,
        amountNum,
        token,
        pushTx
      );
      const duration = Date.now() - startTime;

      // Store request in Redux
      dispatch(setBetWithdrawRequest({
        method: request.method,
        params: request.params,
        isDryRun,
      }));

      // Store response in Redux
      dispatch(setBetWithdrawResponse({
        response,
        duration,
      }));

      return { request, response };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Store error in Redux
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setBetWithdrawError({
        error: errorMessage,
        duration,
      }));

      throw error;
    }
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Withdraw Prize RPC</h1>
      <p className="text-muted mb-7.5">
        Withdraw your prize from a bet nano contract after the result is set
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

      {/* BetWithdraw Card */}
      {isConnected && !addressMismatch && rpcHandlers && (
        <RpcBetWithdrawCard
          onExecute={handleExecuteBetWithdraw}
          disabled={!ncId}
          ncId={ncId}
          setNcId={setNcId}
          latestNcId={latestNcId}
          withdrawAddress={withdrawAddress}
          addressIndex={addressIndex}
          setAddressIndex={setAddressIndex}
          amount={amount}
          setAmount={setAmount}
          token={token}
          setToken={setToken}
          pushTx={pushTx}
          setPushTx={setPushTx}
          isDryRun={isDryRun}
          initialRequest={betWithdrawData.request}
          initialResponse={betWithdrawData.rawResponse}
          initialError={betWithdrawData.error}
        />
      )}

      {/* Persisted Data Info */}
      {betWithdrawData.timestamp && (
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
                {betWithdrawData.duration !== null && (
                  <span className="block mt-1">
                    Last request took {betWithdrawData.duration}ms
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
