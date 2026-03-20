/**
 * Fee Deposit Stage
 *
 * Tests htr_sendNanoContractTx (fee/deposit) RPC call with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setFeeDepositError,
  setFeeDepositFormData,
  setFeeDepositRequest,
  setFeeDepositResponse,
} from '../../store/slices/feeDepositSlice';
import { selectIsWalletConnectConnected, selectWalletConnectFirstAddress } from '../../store/slices/walletConnectSlice';
import { RpcFeeDepositCard } from '../rpc/RpcFeeDepositCard';
import { RpcNotConnectedBanner } from '../rpc/RpcNotConnectedBanner';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useDeepLinkCallback } from '../../hooks/useDeepLinkCallback';
import { extractErrorMessage } from '../../utils/errorUtils';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';
import { useFeeTokens } from '../../hooks/useFeeTokens';

export const FeeDepositStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const feeDepositData = useSelector((state: RootState) => state.feeDeposit);
  const feeNanoContract = useSelector((state: RootState) => state.feeNanoContract);
  const latestInitializedNcId = feeNanoContract.ncId;

  // Get the actual wallet instance (not from Redux, from walletInstancesMap)
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  // Fee tokens hook
  const { feeTokens, loading: feeTokensLoading } = useFeeTokens();

  // Local state
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);
  const [ncId, setNcId] = useState<string>(latestInitializedNcId || '');
  const [feeToken, setFeeToken] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [changeAddress, setChangeAddress] = useState<string>('');
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [contractPaysFees, setContractPaysFees] = useState<boolean>(false);
  const [htrWithdrawAmount, setHtrWithdrawAmount] = useState<string>('1');
  const [pushTx, setPushTx] = useState<boolean>(false);

  // Update ncId when latestInitializedNcId changes
  useEffect(() => {
    if (latestInitializedNcId) {
      setNcId(latestInitializedNcId);
    }
  }, [latestInitializedNcId]);

  // Auto-select first fee token when available
  useEffect(() => {
    if (feeTokens.length > 0 && !feeToken) {
      setFeeToken(feeTokens[0].uid);
    }
  }, [feeTokens, feeToken]);

  // Auto-fill amount with full token balance when fee token is selected
  useEffect(() => {
    if (!feeToken || !testWallet?.instance || amount) return;
    testWallet.instance
      .getBalance(feeToken)
      .then((bal: Array<{ balance?: { unlocked?: bigint } }>) => {
        const unlocked = bal?.[0]?.balance?.unlocked ?? 0n;
        if (unlocked > 0n) setAmount(unlocked.toString());
      })
      .catch(() => {});
  }, [feeToken, testWallet]);

  // Save form state to Redux whenever it changes (for prepopulating withdraw)
  useEffect(() => {
    dispatch(setFeeDepositFormData({ ncId, amount, token: feeToken, addressIndex }));
  }, [ncId, amount, feeToken, addressIndex, dispatch]);

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
          const derivedAddress = await testWallet.instance.getAddressAtIndex(addressIndex);
          setChangeAddress(derivedAddress);
        } catch (error) {
          console.error(`[FeeDeposit] Failed to derive address at index ${addressIndex}:`, error);
          setChangeAddress('');
        }
      } else {
        console.log('[FeeDeposit] Wallet not loaded yet');
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
  const handleExecuteFeeDeposit = async () => {
    if (!rpcHandlers) {
      throw new Error('RPC handlers not initialized');
    }

    if (!ncId) {
      throw new Error('No Nano Contract ID available');
    }

    const startTime = Date.now();

    try {
      const { request, response } = await rpcHandlers.getRpcFeeDeposit(
        ncId,
        feeToken,
        amount,
        changeAddress,
        pushTx,
        contractPaysFees,
        htrWithdrawAmount
      );
      const duration = Date.now() - startTime;

      // Clear deep link notification after RPC response
      clearDeepLinkNotification();

      // Store request in Redux
      dispatch(
        setFeeDepositRequest({
          method: request.method,
          params: request.params,
          isDryRun,
        })
      );

      // Serialize BigInt values before storing in Redux
      const serializedResponse = response ? JSON.parse(JSONBigInt.stringify(response)) : null;

      // Store response in Redux
      dispatch(
        setFeeDepositResponse({
          response: serializedResponse,
          duration,
        })
      );

      return { request, response: serializedResponse };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Clear deep link notification on error too
      clearDeepLinkNotification();

      // Store error in Redux
      const errorMessage = extractErrorMessage(error);
      dispatch(
        setFeeDepositError({
          error: errorMessage,
          duration,
        })
      );

      throw error;
    }
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Deposit Fee Token RPC</h1>
      <p className="text-muted mb-7.5">Deposit a fee-based token into the fee nano contract</p>

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
                The connected wallet address does not match the selected test wallet address. RPC testing has been
                disabled. Please connect the correct wallet or select a different test wallet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FeeDeposit Card */}
      {isConnected && !addressMismatch && rpcHandlers && (
        <RpcFeeDepositCard
          onExecute={handleExecuteFeeDeposit}
          ncId={ncId}
          setNcId={setNcId}
          latestInitializedNcId={latestInitializedNcId}
          feeToken={feeToken}
          setFeeToken={setFeeToken}
          amount={amount}
          setAmount={setAmount}
          changeAddress={changeAddress}
          addressIndex={addressIndex}
          setAddressIndex={setAddressIndex}
          contractPaysFees={contractPaysFees}
          setContractPaysFees={setContractPaysFees}
          htrWithdrawAmount={htrWithdrawAmount}
          setHtrWithdrawAmount={setHtrWithdrawAmount}
          pushTx={pushTx}
          setPushTx={setPushTx}
          feeTokens={feeTokens}
          feeTokensLoading={feeTokensLoading}
          walletInstance={testWallet?.instance ?? null}
          isDryRun={isDryRun}
          initialRequest={feeDepositData.request}
          initialResponse={feeDepositData.rawResponse}
          initialError={feeDepositData.error}
        />
      )}

      {/* Persisted Data Info */}
      {feeDepositData.timestamp && (
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
                {feeDepositData.duration !== null && (
                  <span className="block mt-1">Last request took {feeDepositData.duration}ms</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
