/**
 * Test Wallet Cleanup Stage
 * Melts all custom tokens and returns HTR to funding wallet
 */

import { useCallback, useEffect, useState } from 'react';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { refreshWalletBalance, refreshWalletTokens } from '../../store/slices/walletStoreSlice';
import { formatBalance } from '../../utils/balanceUtils';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { TransactionTemplateBuilder } from '@hathor/wallet-lib';
import { useSendTransaction } from '../../hooks/useSendTransaction';
import { WALLET_CONFIG } from '../../constants/network';
import Loading from '../common/Loading';

interface TokenToMelt {
  uid: string;
  symbol: string;
  name: string;
  balance: bigint;
  meltableAmount: number;
  remainder: number;
  hasMeltAuthority: boolean;
}

export default function TestWalletCleanup() {
  const dispatch = useAppDispatch();
  const { getWallet } = useWalletStore();
  const { sendTransaction, isSending } = useSendTransaction();

  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const allTokens = useAppSelector((s) => s.tokens.tokens);

  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;
  const fundingWallet = fundingWalletId ? getWallet(fundingWalletId) : undefined;

  const [tokensToMelt, setTokensToMelt] = useState<TokenToMelt[]>([]);
  const [htrBalance, setHtrBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  // Cleanup status tracking
  interface MeltTxStatus {
    tokenSymbol: string;
    txHash: string;
    status: 'pending' | 'confirming' | 'confirmed' | 'failed';
  }
  const [meltTxStatuses, setMeltTxStatuses] = useState<MeltTxStatus[]>([]);
  const [cleanupPhase, setCleanupPhase] = useState<'idle' | 'melting' | 'confirming' | 'transferring' | 'done'>('idle');

  const testReady = testWallet?.status === 'ready';
  const fundingReady = fundingWallet?.status === 'ready';

  // Load preview data function
  const loadPreviewData = useCallback(async () => {
    if (!testWallet?.instance || !testReady) {
      setTokensToMelt([]);
      setHtrBalance(0n);
      return;
    }

    setIsLoading(true);
    setErrors([]);
    setCompleted(false);

    try {
      // Get HTR balance
      const htrBalanceData = await testWallet.instance.getBalance(NATIVE_TOKEN_UID);
      const htrBal = htrBalanceData[0]?.balance?.unlocked || 0n;
      setHtrBalance(htrBal);

      // Get custom tokens (exclude native HTR)
      const customTokenUids = testWallet.tokenUids?.filter((uid) => uid !== NATIVE_TOKEN_UID) || [];

      const tokensData = await Promise.all(
        customTokenUids.map(async (uid) => {
          const tokenInfo = allTokens.find((t) => t.uid === uid);
          if (!tokenInfo) return null;

          try {
            // Get balance
            const balanceData = await testWallet.instance.getBalance(uid);
            const balance = balanceData[0]?.balance?.unlocked || 0n;

            if (balance === 0n) return null;

            // Check melt authority
            const meltAuthority = await testWallet.instance.getMeltAuthority(uid, {
              many: false,
              only_available_utxos: true,
            });
            const hasMeltAuthority = meltAuthority && meltAuthority.length > 0;

            // Calculate meltable amount (multiples of 100)
            const balanceNum = Number(balance);
            const meltableAmount = Math.floor(balanceNum / 100) * 100;
            const remainder = balanceNum - meltableAmount;

            return {
              uid,
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              balance,
              meltableAmount,
              remainder,
              hasMeltAuthority,
            };
          } catch (err) {
            console.error(`Failed to load data for token ${uid}:`, err);
            return null;
          }
        })
      );

      // Filter out nulls
      const validTokens = tokensData.filter((t): t is TokenToMelt => t !== null);
      setTokensToMelt(validTokens);
    } catch (err) {
      console.error('Failed to load preview data:', err);
      setErrors(['Failed to load preview data']);
    } finally {
      setIsLoading(false);
    }
  }, [testWallet, testReady, allTokens]);

  // Refresh wallet data and reload preview
  const handleRefresh = useCallback(async () => {
    if (!testWallet || isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Refresh wallet tokens and balance from the network
      await Promise.all([
        dispatch(refreshWalletTokens(testWallet.metadata.id)).unwrap(),
        dispatch(refreshWalletBalance(testWallet.metadata.id)).unwrap(),
      ]);
      // Then reload preview data
      await loadPreviewData();
    } catch (error) {
      console.error('Failed to refresh wallet data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [testWallet, isRefreshing, dispatch, loadPreviewData]);

  // Refresh when page opens
  useEffect(() => {
    handleRefresh().catch((e) => console.error('Failed refresh', e));
  }, []);

  // Also reload preview when dependencies change
  useEffect(() => {
    loadPreviewData();
  }, [loadPreviewData]);

  // Helper function to wait for a transaction to be confirmed
  const waitForTxConfirmation = async (
    txHash: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walletInstance: any,
    maxAttempts = 60, // 60 attempts * 2 seconds = 2 minutes max wait
    intervalMs = 2000
  ): Promise<boolean> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // First check wallet cache (fast, no HTTP)
        const txData = await walletInstance.getTx(txHash);
        if (txData && txData.first_block) {
          return true; // Transaction is confirmed
        }

        // If not in cache, check full node
        const response = await walletInstance.getFullTxById(txHash);
        if (response.success && response.meta?.first_block) {
          return true; // Transaction is confirmed
        }

        // Not confirmed yet, wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      } catch (err) {
        console.error(`Error checking tx ${txHash.slice(0, 8)}:`, err);
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    return false; // Timed out waiting for confirmation
  };

  const handleExecuteCleanup = async () => {
    if (!testWallet?.instance || !fundingWallet?.instance) return;

    setIsExecuting(true);
    setErrors([]);
    setCompleted(false);
    setMeltTxStatuses([]);
    setCleanupPhase('melting');
    const newErrors: string[] = [];
    const meltTxHashes: { tokenSymbol: string; txHash: string }[] = [];

    try {
      // Step 1: Melt each token one by one
      const tokensWithMeltAuthority = tokensToMelt.filter(
        (t) => t.hasMeltAuthority && t.meltableAmount > 0
      );

      for (let i = 0; i < tokensWithMeltAuthority.length; i++) {
        const token = tokensWithMeltAuthority[i];
        setExecutionStep(`Melting ${token.symbol} (${i + 1}/${tokensWithMeltAuthority.length})...`);

        try {
          const address0 = await testWallet.instance.getAddressAtIndex(0);

          const sendTx = await testWallet.instance.meltTokensSendTransaction(
            token.uid,
            BigInt(token.meltableAmount),
            {
              pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
              changeAddress: address0,
              meltAuthorityAddress: address0,
              createAnotherMelt: true,
            }
          );

          const txResponse = await sendTx.runFromMining();
          const txHash = txResponse?.hash || sendTx.transaction?.hash;

          if (txHash) {
            meltTxHashes.push({ tokenSymbol: token.symbol, txHash });
            setMeltTxStatuses((prev) => [
              ...prev,
              { tokenSymbol: token.symbol, txHash, status: 'pending' },
            ]);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          newErrors.push(`Failed to melt ${token.symbol}: ${errorMessage}`);
          console.error(`Failed to melt ${token.symbol}:`, err);
          setMeltTxStatuses((prev) => [
            ...prev,
            { tokenSymbol: token.symbol, txHash: '', status: 'failed' },
          ]);
        }
      }

      // Step 2: Wait for ALL melt transactions to be confirmed
      if (meltTxHashes.length > 0) {
        setCleanupPhase('confirming');
        setExecutionStep(`Waiting for ${meltTxHashes.length} melt transaction(s) to confirm...`);

        // Update all statuses to "confirming"
        setMeltTxStatuses((prev) =>
          prev.map((tx) =>
            tx.status === 'pending' ? { ...tx, status: 'confirming' } : tx
          )
        );

        // Wait for each transaction to confirm
        for (const { tokenSymbol, txHash } of meltTxHashes) {
          setExecutionStep(`Waiting for ${tokenSymbol} melt to confirm...`);

          const confirmed = await waitForTxConfirmation(txHash, testWallet.instance);

          setMeltTxStatuses((prev) =>
            prev.map((tx) =>
              tx.txHash === txHash
                ? { ...tx, status: confirmed ? 'confirmed' : 'failed' }
                : tx
            )
          );

          if (!confirmed) {
            newErrors.push(`Timeout waiting for ${tokenSymbol} melt confirmation`);
          }
        }

        // Small additional delay to ensure wallet state is fully updated
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Refresh wallet data after ALL melts are confirmed
      setExecutionStep('Refreshing wallet data...');
      await Promise.all([
        dispatch(refreshWalletTokens(testWallet.metadata.id)).unwrap(),
        dispatch(refreshWalletBalance(testWallet.metadata.id)).unwrap(),
      ]);

      // Get updated HTR balance after melting - this should now have the correct amount
      const updatedHtrBalanceData = await testWallet.instance.getBalance(NATIVE_TOKEN_UID);
      const updatedHtrBalance = updatedHtrBalanceData[0]?.balance?.unlocked || 0n;

      console.log(`[Cleanup] Final HTR balance after melting: ${updatedHtrBalance}`);

      // Step 3: Send ALL HTR to funding wallet in a single transaction
      if (updatedHtrBalance > 0n && fundingReady) {
        setCleanupPhase('transferring');
        setExecutionStep(`Transferring ${formatBalance(updatedHtrBalance)} HTR to Funding Wallet...`);

        try {
          const fundWalletAddress = await fundingWallet.instance.getAddressAtIndex(0);
          const testWalletAddress = await testWallet.instance.getAddressAtIndex(0);

          const template = TransactionTemplateBuilder.new()
            .addSetVarAction({ name: 'recipientAddr', value: fundWalletAddress })
            .addSetVarAction({ name: 'changeAddr', value: testWalletAddress })
            .addTokenOutput({
              address: '{recipientAddr}',
              amount: updatedHtrBalance,
              token: NATIVE_TOKEN_UID,
            })
            .addCompleteAction({
              changeAddress: '{changeAddr}',
            })
            .build();

          await sendTransaction(
            template,
            {
              fromWalletId: testWallet.metadata.id,
              fromWallet: testWallet,
              toAddress: fundWalletAddress,
              amount: Number(updatedHtrBalance),
              tokenUid: NATIVE_TOKEN_UID,
              tokenSymbol: 'HTR',
            },
            WALLET_CONFIG.DEFAULT_PIN_CODE
          );
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          newErrors.push(`Failed to transfer HTR: ${errorMessage}`);
          console.error('Failed to transfer HTR:', err);
        }
      }

      // Final refresh
      await Promise.all([
        dispatch(refreshWalletTokens(testWallet.metadata.id)).unwrap(),
        dispatch(refreshWalletBalance(testWallet.metadata.id)).unwrap(),
      ]);

      setCleanupPhase('done');
      setErrors(newErrors);
      setCompleted(true);
      setExecutionStep('');

      // Reload preview data
      const htrBalanceData = await testWallet.instance.getBalance(NATIVE_TOKEN_UID);
      setHtrBalance(htrBalanceData[0]?.balance?.unlocked || 0n);

      // Reload tokens
      const customTokenUids = testWallet.tokenUids?.filter((uid) => uid !== NATIVE_TOKEN_UID) || [];
      const tokensData = await Promise.all(
        customTokenUids.map(async (uid) => {
          const tokenInfo = allTokens.find((t) => t.uid === uid);
          if (!tokenInfo) return null;

          try {
            const balanceData = await testWallet.instance.getBalance(uid);
            const balance = balanceData[0]?.balance?.unlocked || 0n;
            if (balance === 0n) return null;

            const meltAuthority = await testWallet.instance.getMeltAuthority(uid, {
              many: false,
              only_available_utxos: true,
            });
            const hasMeltAuthority = meltAuthority && meltAuthority.length > 0;

            const balanceNum = Number(balance);
            const meltableAmount = Math.floor(balanceNum / 100) * 100;
            const remainder = balanceNum - meltableAmount;

            return {
              uid,
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              balance,
              meltableAmount,
              remainder,
              hasMeltAuthority,
            };
          } catch {
            return null;
          }
        })
      );
      setTokensToMelt(tokensData.filter((t): t is TokenToMelt => t !== null));
    } catch (err) {
      console.error('Cleanup execution failed:', err);
      newErrors.push(`Cleanup execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setErrors(newErrors);
    } finally {
      setIsExecuting(false);
      setExecutionStep('');
      if (cleanupPhase !== 'done') {
        setCleanupPhase('idle');
      }
    }
  };

  const hasTokensToMelt = tokensToMelt.some((t) => t.hasMeltAuthority && t.meltableAmount > 0);
  const hasHtrToTransfer = htrBalance > 0n;
  const canExecute = (hasTokensToMelt || hasHtrToTransfer) && !isExecuting && !isLoading;

  // Calculate estimated HTR from melting (100 tokens = 1 HTR)
  const totalMeltableTokens = tokensToMelt
    .filter((t) => t.hasMeltAuthority && t.meltableAmount > 0)
    .reduce((sum, t) => sum + t.meltableAmount, 0);
  const estimatedHtrFromMelting = Math.floor(totalMeltableTokens / 100);
  const totalEstimatedHtr = Number(htrBalance) + estimatedHtrFromMelting;

  // Tokens that will remain in the wallet after cleanup
  const tokensRemaining = tokensToMelt.filter(
    (t) => !t.hasMeltAuthority || t.remainder > 0 || (t.hasMeltAuthority && t.meltableAmount === 0)
  );

  return (
    <div className="max-w-300 mx-auto">
      {(isExecuting || isSending) && <Loading overlay message={executionStep || 'Processing...'} />}

      <h1 className="mt-0 text-3xl font-bold">Test Wallet Cleanup</h1>
      <p className="text-muted mb-7.5">
        Melt all custom tokens and return HTR to the funding wallet.
      </p>

      {/* Warning Banner */}
      <div className="card-primary mb-7.5 bg-yellow-50 border-2 border-yellow-400">
        <div className="flex items-start gap-3">
          <span className="text-2xl">&#9888;</span>
          <div>
            <h3 className="font-bold text-lg mt-0 mb-2 text-yellow-900">Warning</h3>
            <p className="m-0 text-yellow-800">
              This operation only affects the <strong>Test Wallet</strong>. It will:
            </p>
            <ul className="mt-2 mb-0 text-yellow-800">
              <li>Melt all custom tokens (in multiples of 100)</li>
              <li>Transfer all resulting HTR to the Funding Wallet (address 0)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* No Test Wallet Selected */}
      {!testWallet && (
        <div className="card-primary mb-7.5 bg-red-50 border-2 border-red-400">
          <p className="m-0 text-red-900">
            No Test Wallet selected. Please select a Test Wallet in the Wallet Initialization stage.
          </p>
        </div>
      )}

      {/* Test Wallet Not Ready */}
      {testWallet && !testReady && (
        <div className="card-primary mb-7.5 bg-red-50 border-2 border-red-400">
          <p className="m-0 text-red-900">
            Test Wallet is not ready. Please wait for it to finish syncing.
          </p>
        </div>
      )}

      {/* No Funding Wallet Warning */}
      {!fundingWallet && testReady && (
        <div className="card-primary mb-7.5 bg-orange-50 border-2 border-orange-400">
          <p className="m-0 text-orange-900">
            No Funding Wallet selected. HTR transfer will be skipped, but tokens can still be melted.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="card-primary mb-7.5">
          <p className="m-0 text-center text-muted">Loading preview data...</p>
        </div>
      )}

      {/* Preview Section */}
      {testReady && !isLoading && (
        <>
          {/* Tokens Preview */}
          <div className="card-primary mb-7.5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold m-0">Tokens to Melt</h2>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="btn-primary py-1.5 px-4 text-sm"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {tokensToMelt.length === 0 ? (
              <p className="m-0 text-muted text-center">No custom tokens found in Test Wallet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-300">
                    <tr>
                      <th className="text-left py-2 px-3 font-bold">Token</th>
                      <th className="text-right py-2 px-3 font-bold">Balance</th>
                      <th className="text-right py-2 px-3 font-bold">Will Melt</th>
                      <th className="text-right py-2 px-3 font-bold">Remainder</th>
                      <th className="text-center py-2 px-3 font-bold">Has Authority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokensToMelt.map((token) => (
                      <tr key={token.uid} className="border-b border-gray-200">
                        <td className="py-2 px-3">
                          <span className="font-semibold">{token.symbol}</span>
                          <span className="text-muted text-xs ml-2">({token.name})</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatBalance(token.balance)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {token.hasMeltAuthority ? (
                            token.meltableAmount > 0 ? (
                              <span className="text-green-700">{token.meltableAmount}</span>
                            ) : (
                              <span className="text-muted">0</span>
                            )
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {token.hasMeltAuthority ? (
                            token.remainder > 0 ? (
                              <span className="text-orange-600">{token.remainder}</span>
                            ) : (
                              <span className="text-muted">0</span>
                            )
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {token.hasMeltAuthority ? (
                            <span className="badge badge-success badge-sm">Yes</span>
                          ) : (
                            <span className="badge badge-error badge-sm">No (skip)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cleanup Summary */}
          <div className="card-primary mb-7.5 bg-blue-50 border-2 border-blue-400">
            <h2 className="text-xl font-bold mb-4 text-blue-900">Cleanup Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-800">Current HTR Balance:</span>
                <span className="font-mono font-bold">{formatBalance(htrBalance)} HTR</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-800">HTR from Melting ({totalMeltableTokens} tokens):</span>
                <span className="font-mono font-bold">+{estimatedHtrFromMelting} HTR</span>
              </div>
              <div className="border-t border-blue-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-blue-900 font-bold text-lg">Total HTR to Send:</span>
                  <span className="font-mono font-bold text-xl text-blue-900">{totalEstimatedHtr} HTR</span>
                </div>
              </div>
              {fundingReady ? (
                <p className="text-sm text-blue-700 mt-2 mb-0">
                  Will be sent to Funding Wallet address 0.
                </p>
              ) : (
                <p className="text-sm text-orange-600 mt-2 mb-0">
                  No funding wallet available. HTR will not be transferred.
                </p>
              )}
            </div>
          </div>

          {/* Tokens Remaining After Cleanup */}
          {tokensRemaining.length > 0 && (
            <div className="card-primary mb-7.5 bg-orange-50 border-2 border-orange-400">
              <h2 className="text-xl font-bold mb-2 text-orange-900">Tokens Remaining After Cleanup</h2>
              <p className="text-sm text-orange-800 mb-4">
                The following tokens will remain in the Test Wallet after cleanup. These require manual cleanup later:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-orange-300">
                    <tr>
                      <th className="text-left py-2 px-3 font-bold text-orange-900">Token</th>
                      <th className="text-right py-2 px-3 font-bold text-orange-900">Remaining</th>
                      <th className="text-left py-2 px-3 font-bold text-orange-900">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokensRemaining.map((token) => {
                      let reason = '';
                      let remainingAmount = 0;

                      if (!token.hasMeltAuthority) {
                        reason = 'No melt authority';
                        remainingAmount = Number(token.balance);
                      } else if (token.meltableAmount === 0) {
                        reason = 'Balance below 100 (cannot melt)';
                        remainingAmount = Number(token.balance);
                      } else if (token.remainder > 0) {
                        reason = 'Remainder after melting';
                        remainingAmount = token.remainder;
                      }

                      return (
                        <tr key={token.uid} className="border-b border-orange-200">
                          <td className="py-2 px-3">
                            <span className="font-semibold">{token.symbol}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-orange-700">
                            {remainingAmount}
                          </td>
                          <td className="py-2 px-3 text-orange-700 text-xs">
                            {reason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cleanup Status - shown during execution */}
          {(isExecuting || (cleanupPhase !== 'idle' && meltTxStatuses.length > 0)) && (
            <div className="card-primary mb-7.5 bg-purple-50 border-2 border-purple-400">
              <h2 className="text-xl font-bold mb-4 text-purple-900">Cleanup Status</h2>

              {/* Current Phase */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-800 font-semibold">Phase:</span>
                  <span className={`badge ${
                    cleanupPhase === 'melting' ? 'badge-warning' :
                    cleanupPhase === 'confirming' ? 'badge-info' :
                    cleanupPhase === 'transferring' ? 'badge-primary' :
                    cleanupPhase === 'done' ? 'badge-success' : 'badge-ghost'
                  }`}>
                    {cleanupPhase === 'melting' && 'Melting Tokens'}
                    {cleanupPhase === 'confirming' && 'Waiting for Confirmations'}
                    {cleanupPhase === 'transferring' && 'Transferring HTR'}
                    {cleanupPhase === 'done' && 'Completed'}
                    {cleanupPhase === 'idle' && 'Idle'}
                  </span>
                </div>
                {executionStep && (
                  <p className="text-sm text-purple-700 m-0">{executionStep}</p>
                )}
              </div>

              {/* Melt Transactions Status */}
              {meltTxStatuses.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-purple-800 mb-2">Melt Transactions:</h3>
                  <div className="space-y-1">
                    {meltTxStatuses.map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2">
                        <span className="font-semibold">{tx.tokenSymbol}</span>
                        <div className="flex items-center gap-2">
                          {tx.txHash && (
                            <span className="font-mono text-xs text-gray-500">
                              {tx.txHash.slice(0, 8)}...
                            </span>
                          )}
                          <span className={`badge badge-sm ${
                            tx.status === 'pending' ? 'badge-warning' :
                            tx.status === 'confirming' ? 'badge-info' :
                            tx.status === 'confirmed' ? 'badge-success' :
                            'badge-error'
                          }`}>
                            {tx.status === 'pending' && 'Pending'}
                            {tx.status === 'confirming' && 'Confirming...'}
                            {tx.status === 'confirmed' && 'Confirmed'}
                            {tx.status === 'failed' && 'Failed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Errors Display */}
          {errors.length > 0 && (
            <div className="card-primary mb-7.5 bg-red-50 border-2 border-red-400">
              <h3 className="font-bold text-lg mt-0 mb-2 text-red-900">Errors</h3>
              <ul className="m-0 pl-4 text-red-800">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Message */}
          {completed && errors.length === 0 && (
            <div className="card-primary mb-7.5 bg-green-50 border-2 border-green-400">
              <p className="m-0 text-green-900 font-semibold text-center">
                Cleanup completed successfully!
              </p>
            </div>
          )}

          {/* Execute Button */}
          <div className="card-primary mb-7.5">
            <button
              onClick={handleExecuteCleanup}
              disabled={!canExecute}
              className="w-full py-3 px-6 font-bold text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: canExecute ? '#dc2626' : '#9ca3af' }}
            >
              {isExecuting ? 'Executing Cleanup...' : 'Execute Cleanup'}
            </button>
            {!canExecute && !isExecuting && !isLoading && (
              <p className="text-sm text-muted text-center mt-2 mb-0">
                {!hasTokensToMelt && !hasHtrToTransfer
                  ? 'Nothing to clean up.'
                  : 'Cannot execute cleanup.'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
