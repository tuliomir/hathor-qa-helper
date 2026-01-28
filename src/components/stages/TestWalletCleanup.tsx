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
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';
import { WALLET_CONFIG } from '../../constants/network';
import Loading from '../common/Loading';
import { trackTokenFlow } from '../../services/tokenFlowTracker';
import type { TokenFlowResult } from '../../types/tokenFlowTracker';
import { waitForTxSettlement } from '../../utils/waitForTxSettlement';

interface TokenToMelt {
  uid: string;
  symbol: string;
  name: string;
  balance: bigint;
  meltableAmount: number;
  remainder: number;
  hasMeltAuthority: boolean;
  // For tokens that can't be melted, track the original sender (first address with positive flow)
  originalSender?: string;
  canReturnToSender: boolean;
  // Rich flow data showing all external addresses holding this token
  tokenFlow?: TokenFlowResult;
}

export default function TestWalletCleanup() {
  const dispatch = useAppDispatch();
  const { getWallet } = useWalletStore();

  // Helper to get wallet friendly name from wallet ID
  const getWalletFriendlyName = useCallback(
    (walletId: string | undefined): string | undefined => {
      if (!walletId) return undefined;
      const wallet = getWallet(walletId);
      return wallet?.metadata?.friendlyName || walletId;
    },
    [getWallet]
  );

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

  // Debug state
  interface DebugLogEntry {
    timestamp: string;
    type: 'info' | 'error' | 'template' | 'tx';
    message: string;
    data?: unknown;
  }
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [showDebug, setShowDebug] = useState(true);

  const addDebugLog = (type: DebugLogEntry['type'], message: string, data?: unknown) => {
    // Safely serialize data that may contain BigInt
    const safeData = data ? JSON.parse(JSONBigInt.stringify(data)) : undefined;
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString().slice(11, 23),
      type,
      message,
      data: safeData,
    };
    setDebugLogs((prev) => [...prev, entry]);
    console.log(`[DEBUG ${type}] ${message}`, safeData ?? '');
  };

  // Cleanup status tracking
  // Note: Simple transactions (melts, sends) don't need block confirmation waiting.
  // Only nano contract transactions require confirmation polling.
  interface MeltTxStatus {
    tokenSymbol: string;
    txHash: string;
    status: 'confirmed' | 'failed';
  }
  const [meltTxStatuses, setMeltTxStatuses] = useState<MeltTxStatus[]>([]);
  const [cleanupPhase, setCleanupPhase] = useState<'idle' | 'melting' | 'returning' | 'transferring' | 'done'>('idle');

  // Track return-to-sender transaction statuses
  interface ReturnTxStatus {
    tokenSymbol: string;
    toAddress: string;
    amount: number;
    txHash: string;
    status: 'confirmed' | 'failed';
  }
  const [returnTxStatuses, setReturnTxStatuses] = useState<ReturnTxStatus[]>([]);

  // Track retrieve-from-funding transaction statuses
  const [isRetrieving, setIsRetrieving] = useState<string | null>(null); // tokenUid being retrieved

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

            // Determine if this token can be fully cleaned up
            const canMeltAll = hasMeltAuthority && meltableAmount > 0 && remainder === 0;

            // Track token flow for tokens that can't be fully melted
            let originalSender: string | undefined;
            let canReturnToSender = false;
            let tokenFlow: TokenFlowResult | undefined;

            if (!canMeltAll && balanceNum > 0) {
              // Get full token flow data (handles both incoming and outgoing scenarios)
              tokenFlow = await trackTokenFlow(testWallet.instance, uid);

              if (tokenFlow.addressFlows.length > 0) {
                // First address with positive balance is the primary external holder
                const primaryFlow = tokenFlow.addressFlows[0];
                originalSender = primaryFlow.address;

                // Can ONLY return to sender if we DON'T have melt authority
                // (we received tokens from someone else and need to give them back)
                // If we DO have melt authority but tokens are external, that's a "retrieve" scenario
                canReturnToSender = !hasMeltAuthority;
              }
            }

            return {
              uid,
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              balance,
              meltableAmount,
              remainder,
              hasMeltAuthority,
              originalSender,
              canReturnToSender,
              tokenFlow,
            } as TokenToMelt;
          } catch (err) {
            console.error(`Failed to load data for token ${uid}:`, err);
            return null;
          }
        })
      );

      // Filter out nulls and set state
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

  // Refresh when page opens (only on mount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    handleRefresh().catch((e) => console.error('Failed refresh', e));
  }, []);

  // Handler to retrieve tokens from Funding Wallet back to Test Wallet
  const handleRetrieveFromFunding = async (tokenUid: string, tokenSymbol: string, amount: number) => {
    if (!fundingWallet?.instance || !testWallet?.instance || !fundingReady || !testReady) {
      setErrors((prev) => [...prev, 'Both wallets must be ready to retrieve tokens']);
      return;
    }

    setIsRetrieving(tokenUid);

    try {
      // Get destination address in Test Wallet
      const testWalletAddress = await testWallet.instance.getAddressAtIndex(0);
      const fundingWalletAddress = await fundingWallet.instance.getAddressAtIndex(0);

      // Build transaction to send tokens FROM Funding Wallet TO Test Wallet
      const template = TransactionTemplateBuilder.new()
        .addSetVarAction({ name: 'recipientAddr', value: testWalletAddress })
        .addSetVarAction({ name: 'changeAddr', value: fundingWalletAddress })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: BigInt(amount),
          token: tokenUid,
        })
        .addCompleteAction({
          changeAddress: '{changeAddr}',
        })
        .build();

      const tx = await fundingWallet.instance.buildTxTemplate(template, {
        signTx: true,
        pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
      });

      const { SendTransaction } = await import('@hathor/wallet-lib');
      const sendTx = new SendTransaction({
        storage: fundingWallet.instance.storage,
        transaction: tx,
      });

      const txResponse = await sendTx.runFromMining();
      const txHash = txResponse?.hash || tx.hash;

      if (txHash) {
        console.log(`[Cleanup] Retrieved ${tokenSymbol} from Funding Wallet, tx: ${txHash.slice(0, 8)}...`);

        // Wait for wallet to receive and process the transaction event
        await waitForTxSettlement(txHash);

        // Refresh both wallets after settlement
        await Promise.all([
          dispatch(refreshWalletTokens(testWallet.metadata.id)).unwrap(),
          dispatch(refreshWalletBalance(testWallet.metadata.id)).unwrap(),
          dispatch(refreshWalletTokens(fundingWallet.metadata.id)).unwrap(),
          dispatch(refreshWalletBalance(fundingWallet.metadata.id)).unwrap(),
        ]);

        // Reload preview data to show updated state
        await loadPreviewData();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setErrors((prev) => [...prev, `Failed to retrieve ${tokenSymbol}: ${errorMessage}`]);
      console.error(`Failed to retrieve ${tokenSymbol}:`, err);
    } finally {
      setIsRetrieving(null);
    }
  };

  /**
   * Build a unified cleanup template that melts all tokens AND transfers HTR in ONE atomic transaction.
   *
   * How it works:
   * 1. Token UTXOs are selected as inputs (will be destroyed/melted)
   * 2. Melt authority is selected (required for melting)
   * 3. Authority is preserved for future melts
   * 4. Existing HTR is selected as input (manually, not via addCompleteAction)
   * 5. Total HTR output = existing HTR + HTR produced by melting (100 tokens = 1 HTR)
   *
   * The protocol validates that:
   * - Token inputs > token outputs (with melt authority) = melt operation
   * - Melt operation produces HTR that covers the HTR output deficit
   *
   * NO addCompleteAction is used because it would:
   * - See token "surplus" (inputs > outputs) and create change outputs, preventing the melt
   * - We manually select HTR UTXOs instead
   */
  const buildUnifiedCleanupTemplate = (
    tokensWithMeltAuthority: TokenToMelt[],
    testWalletAddr: string,
    fundingAddr: string,
    existingHtrBalance: bigint
  ) => {
    addDebugLog('template', 'Building UNIFIED cleanup template (melt + HTR in ONE tx)', {
      tokenCount: tokensWithMeltAuthority.length,
      tokens: tokensWithMeltAuthority.map((t) => ({
        symbol: t.symbol,
        uid: t.uid.slice(0, 8) + '...',
        meltableAmount: t.meltableAmount,
      })),
      existingHtrBalance: existingHtrBalance.toString(),
      testWalletAddr: testWalletAddr.slice(0, 12) + '...',
      fundingAddr: fundingAddr.slice(0, 12) + '...',
    });

    let builder = TransactionTemplateBuilder.new()
      .addSetVarAction({ name: 'fundingAddr', value: fundingAddr })
      .addSetVarAction({ name: 'testAddr', value: testWalletAddr });

    let totalHtrFromMelts = 0;
    const templateOps: string[] = ['setVar:fundingAddr', 'setVar:testAddr'];

    // Add melt operations for each token
    for (const token of tokensWithMeltAuthority) {
      const htrFromThisMelt = Math.floor(token.meltableAmount / 100);

      addDebugLog('template', `Adding melt for ${token.symbol}`, {
        tokenUid: token.uid,
        meltableAmount: token.meltableAmount,
        expectedHtr: htrFromThisMelt,
      });

      builder = builder
        .addUtxoSelect({ fill: token.meltableAmount, token: token.uid })
        .addAuthoritySelect({ authority: 'melt', token: token.uid })
        .addAuthorityOutput({
          authority: 'melt',
          token: token.uid,
          address: '{testAddr}',
        });

      templateOps.push(
        `utxoSelect:${token.symbol}(${token.meltableAmount})`,
        `authoritySelect:melt:${token.symbol}`,
        `authorityOutput:melt:${token.symbol}`
      );

      totalHtrFromMelts += htrFromThisMelt;
    }

    // Select existing HTR balance (if any) - MANUALLY, not via addCompleteAction
    if (existingHtrBalance > 0n) {
      addDebugLog('template', 'Selecting existing HTR UTXOs', {
        amount: existingHtrBalance.toString(),
      });

      builder = builder.addUtxoSelect({
        fill: existingHtrBalance,
        token: NATIVE_TOKEN_UID,
      });
      templateOps.push(`utxoSelect:HTR(${existingHtrBalance})`);
    }

    // Calculate total HTR output: existing + melt-produced
    const totalHtrOutput = Number(existingHtrBalance) + totalHtrFromMelts;

    if (totalHtrOutput > 0) {
      addDebugLog('template', 'Adding combined HTR output', {
        existingHtr: Number(existingHtrBalance),
        meltProducedHtr: totalHtrFromMelts,
        totalHtrOutput,
      });

      builder = builder.addTokenOutput({
        address: '{fundingAddr}',
        amount: totalHtrOutput,
      });
      templateOps.push(`tokenOutput:HTR(${totalHtrOutput})`);
    }

    // NO addCompleteAction! The protocol handles the melt balance:
    // - Token deficit (inputs > outputs with melt authority) = tokens are melted
    // - HTR surplus (melt-produced HTR covers the output deficit)
    addDebugLog('template', 'Unified template built (NO addCompleteAction)', { ops: templateOps });

    return builder.build();
  };

  /**
   * Build a simple HTR-only transfer template (when no tokens to melt).
   * Uses addCompleteAction since there's no melt operation.
   */
  const buildHtrOnlyTransferTemplate = (
    fromAddr: string,
    toAddr: string,
    amount: bigint
  ) => {
    addDebugLog('template', 'Building HTR-only transfer template', {
      from: fromAddr.slice(0, 12) + '...',
      to: toAddr.slice(0, 12) + '...',
      amount: amount.toString(),
    });

    return TransactionTemplateBuilder.new()
      .addSetVarAction({ name: 'toAddr', value: toAddr })
      .addSetVarAction({ name: 'changeAddr', value: fromAddr })
      .addTokenOutput({
        address: '{toAddr}',
        amount,
      })
      .addCompleteAction({ changeAddress: '{changeAddr}' })
      .build();
  };

  const handleExecuteCleanup = async () => {
    if (!testWallet?.instance || !fundingWallet?.instance) return;

    // Clear previous debug logs
    setDebugLogs([]);

    setIsExecuting(true);
    setErrors([]);
    setCompleted(false);
    setMeltTxStatuses([]);
    setReturnTxStatuses([]);
    setCleanupPhase('melting');
    const newErrors: string[] = [];

    addDebugLog('info', 'Starting cleanup execution');
    addDebugLog('info', 'Initial state', {
      tokensToMeltCount: tokensToMelt.length,
      htrBalance: htrBalance.toString(),
      allTokens: tokensToMelt.map((t) => ({
        symbol: t.symbol,
        uid: t.uid.slice(0, 8) + '...',
        balance: t.balance.toString(),
        meltableAmount: t.meltableAmount,
        hasMeltAuthority: t.hasMeltAuthority,
      })),
    });

    try {
      const tokensWithMeltAuthority = tokensToMelt.filter(
        (t) => t.hasMeltAuthority && t.meltableAmount > 0
      );

      addDebugLog('info', 'Filtered tokens with melt authority', {
        count: tokensWithMeltAuthority.length,
        tokens: tokensWithMeltAuthority.map((t) => ({
          symbol: t.symbol,
          meltableAmount: t.meltableAmount,
        })),
      });

      const testWalletAddr = await testWallet.instance.getAddressAtIndex(0);
      const fundingAddr = await fundingWallet.instance.getAddressAtIndex(0);

      addDebugLog('info', 'Addresses', {
        testWalletAddr,
        fundingAddr,
      });

      // UNIFIED CLEANUP: Melt tokens AND transfer HTR in ONE atomic transaction
      if (tokensWithMeltAuthority.length > 0) {
        const tokenSymbols = tokensWithMeltAuthority.map((t) => t.symbol).join(', ');
        const totalHtrFromMelts = tokensWithMeltAuthority.reduce(
          (sum, t) => sum + Math.floor(t.meltableAmount / 100),
          0
        );

        setExecutionStep(`Melting ${tokenSymbols} + transferring HTR (single tx)...`);
        addDebugLog('info', 'UNIFIED CLEANUP: Melt + HTR transfer in ONE transaction', {
          tokenCount: tokensWithMeltAuthority.length,
          existingHtrBalance: htrBalance.toString(),
          expectedHtrFromMelts: totalHtrFromMelts,
          totalHtrOutput: Number(htrBalance) + totalHtrFromMelts,
        });

        try {
          const unifiedTemplate = buildUnifiedCleanupTemplate(
            tokensWithMeltAuthority,
            testWalletAddr,
            fundingAddr,
            htrBalance // Pass current HTR balance to include in the same tx
          );

          addDebugLog('template', 'Built unified cleanup template', {
            templateLength: unifiedTemplate.length,
            template: JSONBigInt.stringify(unifiedTemplate, 2).slice(0, 800) + '...',
          });

          addDebugLog('info', 'Calling runTxTemplate for unified cleanup...');
          const tx = await testWallet.instance.runTxTemplate(
            unifiedTemplate,
            WALLET_CONFIG.DEFAULT_PIN_CODE
          );

          addDebugLog('tx', 'Unified cleanup transaction result', {
            hash: tx?.hash,
            hasTransaction: !!tx,
            outputs: tx?.outputs?.map((o: { value: bigint; tokenData: number }) => ({
              value: o.value?.toString(),
              tokenData: o.tokenData,
            })),
            inputs: tx?.inputs?.length,
          });

          if (tx?.hash) {
            addDebugLog('info', `Unified cleanup tx submitted: ${tx.hash}`);
            await waitForTxSettlement(tx.hash);
            addDebugLog('info', 'Unified cleanup tx settled - tokens melted AND HTR transferred!');

            for (const token of tokensWithMeltAuthority) {
              setMeltTxStatuses((prev) => [
                ...prev,
                { tokenSymbol: token.symbol, txHash: tx.hash!, status: 'confirmed' },
              ]);
            }
            setExecutionStep('Cleanup completed (single transaction)');
          } else {
            addDebugLog('error', 'Unified cleanup transaction returned no hash!', { tx });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          addDebugLog('error', 'Unified cleanup transaction failed', {
            error: errorMessage,
            stack: err instanceof Error ? err.stack : undefined,
          });
          newErrors.push(`Unified cleanup failed: ${errorMessage}`);

          for (const token of tokensWithMeltAuthority) {
            setMeltTxStatuses((prev) => [
              ...prev,
              { tokenSymbol: token.symbol, txHash: '', status: 'failed' },
            ]);
          }
        }
      } else if (htrBalance > 0n && fundingReady) {
        // No tokens to melt, but HTR to transfer - use simple HTR transfer
        setCleanupPhase('transferring');
        setExecutionStep(`Transferring ${formatBalance(htrBalance)} HTR...`);
        addDebugLog('info', 'HTR-only transfer (no tokens to melt)', {
          htrBalance: htrBalance.toString(),
        });

        try {
          const transferTemplate = buildHtrOnlyTransferTemplate(
            testWalletAddr,
            fundingAddr,
            htrBalance
          );

          addDebugLog('info', 'Calling runTxTemplate for HTR-only transfer...');
          const tx = await testWallet.instance.runTxTemplate(
            transferTemplate,
            WALLET_CONFIG.DEFAULT_PIN_CODE
          );

          addDebugLog('tx', 'HTR transfer result', {
            hash: tx?.hash,
            hasTransaction: !!tx,
          });

          if (tx?.hash) {
            addDebugLog('info', `HTR transfer tx submitted: ${tx.hash}`);
            await waitForTxSettlement(tx.hash);
            addDebugLog('info', 'HTR transfer settled');
            setExecutionStep('HTR transferred successfully');
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          addDebugLog('error', 'HTR transfer failed', { error: errorMessage });
          newErrors.push(`HTR transfer failed: ${errorMessage}`);
          console.error('HTR transfer failed:', err);
        }
      } else {
        addDebugLog('info', 'No melt or HTR transfer needed');
      }

      // Step 2: Return tokens that can't be melted to their original senders
      const tokensToReturn = tokensToMelt.filter(
        (t) => t.canReturnToSender && t.originalSender
      );

      if (tokensToReturn.length > 0) {
        setCleanupPhase('returning');
        setReturnTxStatuses([]);

        for (let i = 0; i < tokensToReturn.length; i++) {
          const token = tokensToReturn[i];
          if (!token.originalSender) continue;

          // Calculate amount to return:
          // - If no melt authority: return full balance
          // - If has melt authority but remainder: return only the remainder
          const amountToReturn = !token.hasMeltAuthority
            ? Number(token.balance)
            : token.remainder;

          if (amountToReturn <= 0) continue;

          setExecutionStep(
            `Returning ${amountToReturn} ${token.symbol} to sender (${i + 1}/${tokensToReturn.length})...`
          );

          try {
            const template = TransactionTemplateBuilder.new()
              .addSetVarAction({ name: 'recipientAddr', value: token.originalSender })
              .addSetVarAction({ name: 'changeAddr', value: testWalletAddr })
              .addTokenOutput({
                address: '{recipientAddr}',
                amount: BigInt(amountToReturn),
                token: token.uid,
              })
              .addCompleteAction({
                changeAddress: '{changeAddr}',
              })
              .build();

            const tx = await testWallet.instance.runTxTemplate(
              template,
              WALLET_CONFIG.DEFAULT_PIN_CODE
            );

            if (tx?.hash) {
              console.log(`[Cleanup] Returned ${amountToReturn} ${token.symbol} to sender, tx: ${tx.hash.slice(0, 8)}...`);

              // Wait for wallet to receive and process the transaction event
              await waitForTxSettlement(tx.hash);

              setReturnTxStatuses((prev) => [
                ...prev,
                {
                  tokenSymbol: token.symbol,
                  toAddress: token.originalSender!,
                  amount: amountToReturn,
                  txHash: tx.hash!,
                  status: 'confirmed',
                },
              ]);
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            newErrors.push(`Failed to return ${token.symbol} to sender: ${errorMessage}`);
            console.error(`Failed to return ${token.symbol}:`, err);
            setReturnTxStatuses((prev) => [
              ...prev,
              {
                tokenSymbol: token.symbol,
                toAddress: token.originalSender!,
                amount: amountToReturn,
                txHash: '',
                status: 'failed',
              },
            ]);
          }
        }
      }

      // Final refresh
      setExecutionStep('Refreshing wallet data...');
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
              canReturnToSender: false, // Don't re-lookup after cleanup
            };
          } catch {
            return null;
          }
        })
      );
      setTokensToMelt(tokensData.filter((t): t is TokenToMelt => t !== null));
      addDebugLog('info', 'Cleanup execution completed', { errors: newErrors });
    } catch (err) {
      console.error('Cleanup execution failed:', err);
      addDebugLog('error', 'Cleanup execution failed with exception', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });
      newErrors.push(`Cleanup execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setErrors(newErrors);
    } finally {
      addDebugLog('info', 'Cleanup finished', { phase: cleanupPhase, errorCount: newErrors.length });
      setIsExecuting(false);
      setExecutionStep('');
      if (cleanupPhase !== 'done') {
        setCleanupPhase('idle');
      }
    }
  };

  const hasTokensToMelt = tokensToMelt.some((t) => t.hasMeltAuthority && t.meltableAmount > 0);
  const hasTokensToReturn = tokensToMelt.some((t) => t.canReturnToSender);
  const hasHtrToTransfer = htrBalance > 0n;
  const canExecute = (hasTokensToMelt || hasTokensToReturn || hasHtrToTransfer) && !isExecuting && !isLoading;

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
      {(isExecuting || isRetrieving) && (
        <Loading overlay message={isRetrieving ? 'Retrieving tokens from Funding Wallet...' : (executionStep || 'Processing...')} />
      )}

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
              <li>Return unmeltable tokens to their original sender (if found)</li>
              <li>Transfer all resulting HTR to the Funding Wallet (address 0)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="card-primary mb-7.5 bg-gray-900 text-gray-100 border-2 border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-lg m-0 text-gray-100">Debug Panel</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setDebugLogs([])}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
            >
              Clear
            </button>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
            >
              {showDebug ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {showDebug && (
          <>
            {/* Current State Summary */}
            <div className="mb-3 p-2 bg-gray-800 rounded text-xs font-mono">
              <div className="text-gray-400 mb-1">Current State:</div>
              <div>tokensToMelt: {tokensToMelt.length} tokens</div>
              <div>htrBalance: {htrBalance.toString()}</div>
              <div>hasTokensToMelt: {hasTokensToMelt.toString()}</div>
              <div>cleanupPhase: {cleanupPhase}</div>
              <div className="mt-2 text-gray-400">Tokens with melt authority:</div>
              {tokensToMelt.filter(t => t.hasMeltAuthority && t.meltableAmount > 0).map((t, i) => (
                <div key={i} className="ml-2 text-green-400">
                  {t.symbol}: {t.meltableAmount} meltable (balance: {t.balance.toString()})
                </div>
              ))}
              {tokensToMelt.filter(t => t.hasMeltAuthority && t.meltableAmount > 0).length === 0 && (
                <div className="ml-2 text-yellow-400">None found!</div>
              )}
            </div>

            {/* Log Entries */}
            <div className="max-h-80 overflow-y-auto text-xs font-mono space-y-1">
              {debugLogs.length === 0 ? (
                <div className="text-gray-500 italic">No logs yet. Execute cleanup to see debug output.</div>
              ) : (
                debugLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`p-1.5 rounded ${
                      log.type === 'error'
                        ? 'bg-red-900/50 text-red-300'
                        : log.type === 'template'
                        ? 'bg-blue-900/50 text-blue-300'
                        : log.type === 'tx'
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                    <span className="font-semibold">[{log.type.toUpperCase()}]</span>{' '}
                    {log.message}
                    {log.data && (
                      <pre className="mt-1 text-2xs overflow-x-auto whitespace-pre-wrap">
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
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
                      <th className="text-center py-2 px-3 font-bold">Return to Sender</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokensToMelt.map((token) => {
                      // Calculate amount that will be returned to sender
                      const returnAmount = token.canReturnToSender
                        ? (!token.hasMeltAuthority ? Number(token.balance) : token.remainder)
                        : 0;

                      return (
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
                              <span className="badge badge-error badge-sm">No</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {token.canReturnToSender && returnAmount > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="badge badge-info badge-sm mb-1">{returnAmount}</span>
                                <span className="text-2xs text-muted" title={token.originalSender}>
                                  {token.originalSender?.slice(0, 8)}...
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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

          {/* Tokens to Return to Sender */}
          {tokensToMelt.some((t) => t.canReturnToSender) && (
            <div className="card-primary mb-7.5 bg-cyan-50 border-2 border-cyan-400">
              <h2 className="text-xl font-bold mb-2 text-cyan-900">Tokens to Return to Sender</h2>
              <p className="text-sm text-cyan-800 mb-4">
                The following tokens will be returned to the address that originally sent them:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-cyan-300">
                    <tr>
                      <th className="text-left py-2 px-3 font-bold text-cyan-900">Token</th>
                      <th className="text-right py-2 px-3 font-bold text-cyan-900">Amount</th>
                      <th className="text-left py-2 px-3 font-bold text-cyan-900">Return To</th>
                      <th className="text-left py-2 px-3 font-bold text-cyan-900">Wallet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokensToMelt
                      .filter((t) => t.canReturnToSender && t.originalSender)
                      .map((token) => {
                        const returnAmount = !token.hasMeltAuthority
                          ? Number(token.balance)
                          : token.remainder;
                        const primaryFlow = token.tokenFlow?.addressFlows[0];

                        return (
                          <tr key={token.uid} className="border-b border-cyan-200">
                            <td className="py-2 px-3">
                              <span className="font-semibold">{token.symbol}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-cyan-700">
                              {returnAmount}
                            </td>
                            <td className="py-2 px-3 font-mono text-xs text-cyan-700" title={token.originalSender}>
                              {token.originalSender?.slice(0, 12)}...{token.originalSender?.slice(-6)}
                            </td>
                            <td className="py-2 px-3 text-xs text-cyan-600">
                              {getWalletFriendlyName(primaryFlow?.walletId) || '-'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tokens to Retrieve for Melting - has melt authority but tokens are held externally */}
          {tokensToMelt.filter((t) => t.hasMeltAuthority && t.tokenFlow && t.tokenFlow.totalExternalBalance > 0).length > 0 && (
            <div className="card-primary mb-7.5 bg-amber-50 border-2 border-amber-400">
              <h2 className="text-xl font-bold mb-2 text-amber-900">Tokens to Retrieve for Melting</h2>
              <p className="text-sm text-amber-800 mb-4">
                You have melt authority for these tokens, but some are held at external addresses.
                Retrieve them to complete the cleanup:
              </p>
              {tokensToMelt
                .filter((t) => t.hasMeltAuthority && t.tokenFlow && t.tokenFlow.totalExternalBalance > 0)
                .map((token) => {
                  const externalAmount = token.tokenFlow!.totalExternalBalance;

                  return (
                    <div key={token.uid} className="mb-4 last:mb-0 bg-white rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-amber-900">{token.symbol}</span>
                        <span className="font-mono text-amber-700">{externalAmount} tokens to retrieve</span>
                      </div>

                      <div className="border-t border-amber-200 pt-2 mt-2">
                        <div className="text-xs text-amber-800 font-semibold mb-2">
                          External Addresses:
                        </div>
                        <div className="space-y-2">
                          {token.tokenFlow!.addressFlows.map((flow, idx) => {
                            const isFundingWallet = flow.walletId === fundingWalletId;
                            const canRetrieve = isFundingWallet && fundingReady && !isRetrieving;

                            return (
                              <div key={idx} className="bg-amber-50 rounded px-2 py-1.5 text-xs">
                                <div className="flex justify-between items-start">
                                  <div className="font-mono" title={flow.address}>
                                    {flow.address.slice(0, 14)}...{flow.address.slice(-8)}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-semibold text-amber-800">Net: {flow.netBalance}</span>
                                    <span className="text-amber-600 ml-2">
                                      (sent {flow.totalSent}, recv {flow.totalReceived})
                                    </span>
                                  </div>
                                </div>
                                {flow.walletId && (
                                  <div className="flex justify-between items-center mt-1">
                                    <div className="text-amber-600">
                                      <span className="font-semibold">Wallet:</span> {getWalletFriendlyName(flow.walletId)}
                                    </div>
                                    {isFundingWallet && (
                                      <button
                                        onClick={() => handleRetrieveFromFunding(token.uid, token.symbol, flow.netBalance)}
                                        disabled={!canRetrieve}
                                        className="ml-2 px-2 py-0.5 text-xs font-semibold rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {isRetrieving === token.uid ? 'Retrieving...' : 'Retrieve'}
                                      </button>
                                    )}
                                  </div>
                                )}
                                {flow.unspentOutputs.length > 0 && (
                                  <div className="text-amber-500 mt-1">
                                    <span className="font-semibold">Unspent:</span>{' '}
                                    {flow.unspentOutputs.map((utxo, i) => (
                                      <span key={i} className="font-mono" title={utxo.txId}>
                                        {i > 0 && ', '}
                                        {utxo.txId.slice(0, 8)}:{utxo.outputIndex} ({utxo.amount})
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Tokens Requiring Manual Action - no melt authority, can't return automatically */}
          {tokensRemaining.filter((t) => !t.canReturnToSender && !t.hasMeltAuthority).length > 0 && (
            <div className="card-primary mb-7.5 bg-orange-50 border-2 border-orange-400">
              <h2 className="text-xl font-bold mb-2 text-orange-900">Tokens Requiring Manual Action</h2>
              <p className="text-sm text-orange-800 mb-4">
                You don't have melt authority for these tokens. Contact the token owner or return them manually:
              </p>
              {tokensRemaining
                .filter((t) => !t.canReturnToSender && !t.hasMeltAuthority)
                .map((token) => {
                  const remainingAmount = Number(token.balance);
                  const hasFlowData = token.tokenFlow && token.tokenFlow.addressFlows.length > 0;

                  return (
                    <div key={token.uid} className="mb-4 last:mb-0 bg-white rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="font-semibold text-orange-900">{token.symbol}</span>
                          <span className="text-orange-700 text-xs ml-2">(No melt authority)</span>
                        </div>
                        <span className="font-mono text-orange-700">{remainingAmount} remaining</span>
                      </div>

                      {hasFlowData ? (
                        <div className="border-t border-orange-200 pt-2 mt-2">
                          <div className="text-xs text-orange-800 font-semibold mb-2">
                            Token Origin:
                          </div>
                          <div className="space-y-2">
                            {token.tokenFlow!.addressFlows.map((flow, idx) => (
                              <div key={idx} className="bg-orange-50 rounded px-2 py-1.5 text-xs">
                                <div className="flex justify-between items-start">
                                  <div className="font-mono" title={flow.address}>
                                    {flow.address.slice(0, 14)}...{flow.address.slice(-8)}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-semibold text-orange-800">Net: {flow.netBalance}</span>
                                  </div>
                                </div>
                                {flow.walletId && (
                                  <div className="text-orange-600 mt-1">
                                    <span className="font-semibold">Wallet:</span> {getWalletFriendlyName(flow.walletId)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-orange-500 italic text-xs mt-2">
                          Could not trace token origin
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Cleanup Status - shown during execution */}
          {(isExecuting || (cleanupPhase !== 'idle' && (meltTxStatuses.length > 0 || returnTxStatuses.length > 0))) && (
            <div className="card-primary mb-7.5 bg-purple-50 border-2 border-purple-400">
              <h2 className="text-xl font-bold mb-4 text-purple-900">Cleanup Status</h2>

              {/* Current Phase */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-800 font-semibold">Phase:</span>
                  <span className={`badge ${
                    cleanupPhase === 'melting' ? 'badge-warning' :
                    cleanupPhase === 'returning' ? 'badge-secondary' :
                    cleanupPhase === 'transferring' ? 'badge-primary' :
                    cleanupPhase === 'done' ? 'badge-success' : 'badge-ghost'
                  }`}>
                    {cleanupPhase === 'melting' && 'Melting Tokens'}
                    {cleanupPhase === 'returning' && 'Returning Tokens to Senders'}
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
                            tx.status === 'confirmed' ? 'badge-success' : 'badge-error'
                          }`}>
                            {tx.status === 'confirmed' ? 'Sent' : 'Failed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Return to Sender Transactions Status */}
              {returnTxStatuses.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-purple-800 mb-2">Return to Sender Transactions:</h3>
                  <div className="space-y-1">
                    {returnTxStatuses.map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-semibold">{tx.tokenSymbol}</span>
                          <span className="text-2xs text-muted" title={tx.toAddress}>
                            {tx.amount} to {tx.toAddress.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {tx.txHash && (
                            <span className="font-mono text-xs text-gray-500">
                              {tx.txHash.slice(0, 8)}...
                            </span>
                          )}
                          <span className={`badge badge-sm ${
                            tx.status === 'confirmed' ? 'badge-success' : 'badge-error'
                          }`}>
                            {tx.status === 'confirmed' ? 'Sent' : 'Failed'}
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
                {!hasTokensToMelt && !hasTokensToReturn && !hasHtrToTransfer
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
