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
import { TokenVersion } from '@hathor/wallet-lib/lib/types';
import { TransactionTemplateBuilder } from '@hathor/wallet-lib';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';
import { NETWORK_CONFIG, WALLET_CONFIG } from '../../constants/network';
import { applyNetworkServices } from '../../services/networkServices';
import { shieldedSweepNotice, splitAvailableUtxos, type TokenUtxoSplit } from '../../services/shieldedUtxos';
import { fetchSwapTokens, swapTokenUidsForNetwork } from '../../store/slices/swapTokensSlice';
import { MdCleaningServices, MdRefresh } from 'react-icons/md';
import { Identifier } from '../common/Identifier';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { EmptyState } from '../ui/EmptyState';
import { StatusChip } from '../ui/StatusChip';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { useRequireFundingWallet, useRequireTestWallet } from '../../hooks/useRequirements';
import { useConfirm } from '../../hooks/useConfirm';
import { trackTokenFlow } from '../../services/tokenFlowTracker';
import type { TokenFlowResult } from '../../types/tokenFlowTracker';
import { waitForTxSettlement } from '../../utils/waitForTxSettlement';
import { buildUnifiedCleanupTemplate, type ReturnToken } from '../../services/cleanupTemplateBuilder';
import { splitIntoBatches } from '../../utils/cleanupBatching';
import { cleanupBusyReason } from '../../utils/cleanupGating';
import {
  getMeltableTokens,
  getSwapTokens,
  getFeeTokens,
  getReturnableTokens,
  getRemainingTokens,
  getDisplayableTokens,
} from '../../services/cleanupTokenCategorizer';

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
  // Token is a swap test token — never melt, send to funding wallet instead
  isSwapToken: boolean;
  // Token was created with version "fee" — costs HTR to move, leave in wallet
  isFeeToken: boolean;
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
  const swapTokensState = useAppSelector((s) => s.swapTokens);

  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;
  const testWalletRequirement = useRequireTestWallet();
  const fundingWalletRequirement = useRequireFundingWallet();
  const { confirm, confirmDialog } = useConfirm();
  const fundingWallet = fundingWalletId ? getWallet(fundingWalletId) : undefined;

  const [tokensToMelt, setTokensToMelt] = useState<TokenToMelt[]>([]);
  // Transparent HTR only: shielded UTXOs cannot be spent from the browser.
  const [htrBalance, setHtrBalance] = useState<bigint>(0n);
  const [shieldedNotice, setShieldedNotice] = useState<string | null>(null);
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
  const [showDebug, setShowDebug] = useState(false);

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
  const [cleanupPhase, setCleanupPhase] = useState<'idle' | 'melting' | 'transferring' | 'done'>('idle');

  // Track retrieve-from-funding transaction statuses
  const [isRetrieving, setIsRetrieving] = useState<string | null>(null); // tokenUid being retrieved

  // Refresh, Retrieve and Execute run one at a time
  const busyReason = cleanupBusyReason({ isExecuting, isRetrieving: isRetrieving !== null, isRefreshing });

  const testReady = testWallet?.status === 'ready';
  const fundingReady = fundingWallet?.status === 'ready';

  // Load preview data function
  const loadPreviewData = useCallback(async () => {
    if (!testWallet?.instance || !testReady) {
      setTokensToMelt([]);
      setHtrBalance(0n);
      setShieldedNotice(null);
      return;
    }

    setIsLoading(true);
    setErrors([]);
    setCompleted(false);

    try {
      // Sweepable (transparent) HTR; shielded UTXOs are only reported
      const htrSplit = await splitAvailableUtxos(testWallet.instance!, NATIVE_TOKEN_UID);
      setHtrBalance(htrSplit.transparent.amount);
      const splits: TokenUtxoSplit[] = [htrSplit];

      // Get custom tokens (exclude native HTR)
      const customTokenUids = testWallet.tokenUids?.filter((uid) => uid !== NATIVE_TOKEN_UID) || [];

      const tokensData = await Promise.all(
        customTokenUids.map(async (uid) => {
          const tokenInfo = allTokens.find((t) => t.uid === uid);
          if (!tokenInfo) return null;

          try {
            // Sweepable (transparent) balance
            const split = await splitAvailableUtxos(testWallet.instance!, uid);
            splits.push(split);
            const balance = split.transparent.amount;

            if (balance === 0n) return null;

            // Check if this is a fee token (version FEE) — never move, costs HTR to transfer
            const storedToken = await testWallet.instance!.storage.getToken(uid);
            if (storedToken?.version === TokenVersion.FEE) {
              return {
                uid,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                balance,
                meltableAmount: 0,
                remainder: 0,
                hasMeltAuthority: false,
                canReturnToSender: false,
                isSwapToken: false,
                isFeeToken: true,
              } as TokenToMelt;
            }

            // Check if this is a swap test token (never melt, send to funding)
            const swapTokenUids = swapTokenUidsForNetwork(swapTokensState, testWallet.metadata.network);
            const swapToken = swapTokenUids.includes(uid);
            if (swapToken) {
              return {
                uid,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                balance,
                meltableAmount: 0,
                remainder: 0,
                hasMeltAuthority: false,
                canReturnToSender: false,
                isSwapToken: true,
                isFeeToken: false,
              } as TokenToMelt;
            }

            // Check melt authority
            const meltAuthority = await testWallet.instance!.getMeltAuthority(uid, {
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
              isSwapToken: false,
              isFeeToken: false,
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
      setShieldedNotice(shieldedSweepNotice(splits));
    } catch (err) {
      console.error('Failed to load preview data:', err);
      setErrors(['Failed to load preview data']);
    } finally {
      setIsLoading(false);
    }
  }, [testWallet, testReady, allTokens, swapTokensState]);

  // Refresh wallet data and reload preview
  const handleRefresh = useCallback(async () => {
    if (!testWallet || busyReason) return;

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
  }, [testWallet, busyReason, dispatch, loadPreviewData]);

  // Fetch swap tokens registry and refresh wallet data on mount

  useEffect(() => {
    dispatch(fetchSwapTokens());
    handleRefresh().catch((e) => console.error('Failed refresh', e));
  }, []);

  // Handler to retrieve tokens from Funding Wallet back to Test Wallet
  const handleRetrieveFromFunding = async (tokenUid: string, tokenSymbol: string, amount: number) => {
    if (!fundingWallet?.instance || !testWallet?.instance || !fundingReady || !testReady) {
      setErrors((prev) => [...prev, 'Both wallets must be ready to retrieve tokens']);
      return;
    }
    if (busyReason) return;

    setIsRetrieving(tokenUid);

    try {
      // Get destination address in Test Wallet
      const testWalletAddress = await testWallet.instance!.getAddressAtIndex(0);
      const fundingWalletAddress = await fundingWallet.instance!.getAddressAtIndex(0);

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

      applyNetworkServices(fundingWallet.metadata.network);
      const tx = await fundingWallet.instance!.buildTxTemplate(template, {
        signTx: true,
        pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
      });

      const { SendTransaction } = await import('@hathor/wallet-lib');
      const sendTx = new SendTransaction({
        storage: fundingWallet.instance!.storage,
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

  const handleExecuteCleanup = async () => {
    if (!testWallet?.instance || !fundingWallet?.instance || busyReason) return;

    // Clear previous debug logs
    setDebugLogs([]);

    setIsExecuting(true);
    setErrors([]);
    setCompleted(false);
    setMeltTxStatuses([]);
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
      applyNetworkServices(testWallet.metadata.network);
      const tokensWithMeltAuthority = getMeltableTokens(tokensToMelt);
      const swapTokensToTransfer = getSwapTokens(tokensToMelt);
      const tokensToReturn = getReturnableTokens(tokensToMelt);

      // Build ReturnToken[] for the template builder
      const returnTokensForTemplate: ReturnToken[] = tokensToReturn
        .map((t) => {
          const amount = !t.hasMeltAuthority ? Number(t.balance) : t.remainder;
          return { uid: t.uid, amount, recipientAddress: t.originalSender! };
        })
        .filter((t) => t.amount > 0);

      addDebugLog('info', 'Filtered tokens', {
        meltCount: tokensWithMeltAuthority.length,
        meltTokens: tokensWithMeltAuthority.map((t) => ({
          symbol: t.symbol,
          meltableAmount: t.meltableAmount,
        })),
        swapCount: swapTokensToTransfer.length,
        swapTokens: swapTokensToTransfer.map((t) => ({
          symbol: t.symbol,
          balance: t.balance.toString(),
        })),
        returnCount: returnTokensForTemplate.length,
        returnTokens: returnTokensForTemplate.map((t) => ({
          uid: t.uid.slice(0, 8) + '...',
          amount: t.amount,
          to: t.recipientAddress.slice(0, 12) + '...',
        })),
      });

      const testWalletAddr = await testWallet.instance!.getAddressAtIndex(0);
      const fundingAddr = await fundingWallet.instance!.getAddressAtIndex(0);

      addDebugLog('info', 'Addresses', {
        testWalletAddr,
        fundingAddr,
      });

      // UNIFIED CLEANUP: Melt + swap transfers + return to sender + HTR in ONE atomic transaction
      const hasWork =
        tokensWithMeltAuthority.length > 0 ||
        swapTokensToTransfer.length > 0 ||
        returnTokensForTemplate.length > 0 ||
        htrBalance > 0n;

      if (hasWork) {
        const meltSymbols = tokensWithMeltAuthority.map((t) => t.symbol);
        const swapSymbols = swapTokensToTransfer.map((t) => t.symbol);
        const returnSymbols = tokensToReturn.map((t) => t.symbol);
        const totalHtrFromMelts = tokensWithMeltAuthority.reduce(
          (sum, t) => sum + Math.floor(t.meltableAmount / 100),
          0
        );

        const stepParts: string[] = [];
        if (meltSymbols.length > 0) stepParts.push(`melting ${meltSymbols.join(', ')}`);
        if (swapSymbols.length > 0) stepParts.push(`transferring swap tokens (${swapSymbols.join(', ')})`);
        if (returnSymbols.length > 0) stepParts.push(`returning ${returnSymbols.join(', ')} to sender`);
        stepParts.push('transferring HTR');
        setExecutionStep(`${stepParts.join(' + ')} (single tx)...`);

        addDebugLog('info', 'UNIFIED CLEANUP: Melt + swap + return + HTR in ONE transaction', {
          meltCount: tokensWithMeltAuthority.length,
          swapCount: swapTokensToTransfer.length,
          returnCount: returnTokensForTemplate.length,
          existingHtrBalance: htrBalance.toString(),
          expectedHtrFromMelts: totalHtrFromMelts,
          totalHtrOutput: Number(htrBalance) + totalHtrFromMelts,
        });

        try {
          const unifiedTemplate = buildUnifiedCleanupTemplate(
            tokensWithMeltAuthority,
            swapTokensToTransfer,
            returnTokensForTemplate,
            testWalletAddr,
            fundingAddr,
            htrBalance
          );

          addDebugLog('template', 'Built unified cleanup template', {
            templateLength: unifiedTemplate.length,
            template: JSONBigInt.stringify(unifiedTemplate, 2).slice(0, 800) + '...',
          });

          addDebugLog('info', 'Calling runTxTemplate for unified cleanup...');
          const tx = await testWallet.instance!.runTxTemplate(unifiedTemplate, WALLET_CONFIG.DEFAULT_PIN_CODE);

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
            addDebugLog('info', 'Unified cleanup tx settled — all operations completed!');

            for (const token of tokensWithMeltAuthority) {
              setMeltTxStatuses((prev) => [
                ...prev,
                { tokenSymbol: token.symbol, txHash: tx.hash!, status: 'confirmed' },
              ]);
            }
            for (const token of swapTokensToTransfer) {
              setMeltTxStatuses((prev) => [
                ...prev,
                { tokenSymbol: `${token.symbol} (swap)`, txHash: tx.hash!, status: 'confirmed' },
              ]);
            }
            for (const token of tokensToReturn) {
              setMeltTxStatuses((prev) => [
                ...prev,
                { tokenSymbol: `${token.symbol} (return)`, txHash: tx.hash!, status: 'confirmed' },
              ]);
            }
            setExecutionStep('Cleanup completed (single transaction)');
          } else {
            addDebugLog('error', 'Unified cleanup transaction returned no hash!', { tx });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          addDebugLog('error', 'Unified cleanup failed, trying batched fallback...', {
            error: errorMessage,
          });

          // Fallback: token operations WITHOUT HTR, then separate HTR transfer.
          // The unified tx failed likely because too many HTR UTXOs caused an
          // oversized transaction. Separating HTR uses sendManyOutputsSendTransaction
          // which handles UTXO selection natively (no template fill bloat).
          const batches = splitIntoBatches(tokensWithMeltAuthority, swapTokensToTransfer, returnTokensForTemplate);
          const totalBatches = batches.length + (htrBalance > 0n ? 1 : 0);
          addDebugLog('info', `Batched fallback: ${batches.length} token batch(es) + HTR transfer`);

          let batchFailed = false;

          // Step 1: Token operations (melt/swap/return) without HTR
          for (let bIdx = 0; bIdx < batches.length; bIdx++) {
            if (batchFailed) break;
            const batch = batches[bIdx];
            const hasTokenWork =
              batch.tokensToMelt.length > 0 || batch.swapTokens.length > 0 || batch.returnTokens.length > 0;
            if (!hasTokenWork) continue;

            setExecutionStep(`Token batch ${bIdx + 1}/${totalBatches}...`);

            try {
              // Pass existingHtrBalance=0n so the template does NOT select any
              // existing HTR UTXOs (avoids hundreds of scattered inputs that
              // caused the oversized-tx failure). Keep includeHtr=true so the
              // template outputs the melt-produced HTR (1% deposit refund) to
              // the funding wallet. Without this output, the validator rejects
              // the tx with "invalid deficit of HTR".
              const batchTemplate = buildUnifiedCleanupTemplate(
                batch.tokensToMelt,
                batch.swapTokens,
                batch.returnTokens,
                testWalletAddr,
                fundingAddr,
                0n, // no existing HTR selection — avoids UTXO bloat
                true // always include HTR output for melt-produced amount
              );

              addDebugLog('template', `Token batch ${bIdx + 1}`, {
                melt: batch.tokensToMelt.length,
                swap: batch.swapTokens.length,
                ret: batch.returnTokens.length,
              });

              const tx = await testWallet.instance!.runTxTemplate(batchTemplate, WALLET_CONFIG.DEFAULT_PIN_CODE);

              if (tx?.hash) {
                addDebugLog('info', `Token batch ${bIdx + 1} tx: ${tx.hash}`);
                await waitForTxSettlement(tx.hash);

                for (const token of [...batch.tokensToMelt, ...batch.swapTokens]) {
                  const sym = tokensToMelt.find((t) => t.uid === token.uid)?.symbol ?? token.uid.slice(0, 8);
                  setMeltTxStatuses((prev) => [...prev, { tokenSymbol: sym, txHash: tx.hash!, status: 'confirmed' }]);
                }
              }
            } catch (batchErr) {
              const batchMsg = batchErr instanceof Error ? batchErr.message : 'Unknown error';
              addDebugLog('error', `Token batch ${bIdx + 1} failed: ${batchMsg}`);
              newErrors.push(`Token batch ${bIdx + 1} failed: ${batchMsg}`);
              batchFailed = true;

              for (const token of [...batch.tokensToMelt, ...batch.swapTokens]) {
                const sym = tokensToMelt.find((t) => t.uid === token.uid)?.symbol ?? token.uid.slice(0, 8);
                setMeltTxStatuses((prev) => [...prev, { tokenSymbol: sym, txHash: '', status: 'failed' }]);
              }
            }
          }

          // Step 2: Consolidate HTR within test wallet (many UTXOs → 1 UTXO)
          // This avoids the oversized-tx issue when sending to funding wallet.
          if (!batchFailed && htrBalance > 0n) {
            setExecutionStep('Consolidating HTR UTXOs...');
            addDebugLog('info', 'Consolidating HTR into a single UTXO...');

            try {
              const freshHtr = (await splitAvailableUtxos(testWallet.instance!, NATIVE_TOKEN_UID)).transparent.amount;

              if (freshHtr > 0n) {
                // Send all HTR to self — wallet-lib selects UTXOs natively
                const consolidateTx = await testWallet.instance!.sendManyOutputsSendTransaction(
                  [{ address: testWalletAddr, value: freshHtr, token: NATIVE_TOKEN_UID }],
                  { changeAddress: testWalletAddr, pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE }
                );
                await consolidateTx.run();
                addDebugLog('info', `HTR consolidated: ${freshHtr} units into 1 UTXO`);
                await waitForTxSettlement(consolidateTx.transaction!.hash!);
              }
            } catch (consolidateErr) {
              const msg = consolidateErr instanceof Error ? consolidateErr.message : 'Unknown error';
              addDebugLog('error', `HTR consolidation failed: ${msg}`);
              newErrors.push(`HTR consolidation failed: ${msg}`);
              batchFailed = true;
            }
          }

          // Step 3: Single HTR transfer to funding wallet (now just 1 UTXO)
          if (!batchFailed && htrBalance > 0n) {
            setExecutionStep('Transferring HTR to funding wallet...');
            addDebugLog('info', 'Sending consolidated HTR to funding wallet...');

            try {
              const freshHtr = (await splitAvailableUtxos(testWallet.instance!, NATIVE_TOKEN_UID)).transparent.amount;

              if (freshHtr > 0n) {
                const sendTx = await testWallet.instance!.sendManyOutputsSendTransaction(
                  [{ address: fundingAddr, value: freshHtr, token: NATIVE_TOKEN_UID }],
                  { changeAddress: testWalletAddr, pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE }
                );
                await sendTx.run();
                addDebugLog('info', `HTR sent to funding: ${freshHtr} units`);
              }
            } catch (htrErr) {
              const htrMsg = htrErr instanceof Error ? htrErr.message : 'Unknown error';
              addDebugLog('error', `HTR transfer failed: ${htrMsg}`);
              newErrors.push(`HTR transfer failed: ${htrMsg}`);
            }
          }

          if (!batchFailed) {
            setExecutionStep('Cleanup completed (batched)');
          }
        }
      } else {
        addDebugLog('info', 'No melt, swap transfer, return, or HTR transfer needed');
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
      const htrSplitAfter = await splitAvailableUtxos(testWallet.instance!, NATIVE_TOKEN_UID);
      setHtrBalance(htrSplitAfter.transparent.amount);
      const splitsAfter: TokenUtxoSplit[] = [htrSplitAfter];

      // Reload tokens
      const customTokenUids = testWallet.tokenUids?.filter((uid) => uid !== NATIVE_TOKEN_UID) || [];
      const tokensData = await Promise.all(
        customTokenUids.map(async (uid) => {
          const tokenInfo = allTokens.find((t) => t.uid === uid);
          if (!tokenInfo) return null;

          try {
            const split = await splitAvailableUtxos(testWallet.instance!, uid);
            splitsAfter.push(split);
            const balance = split.transparent.amount;
            if (balance === 0n) return null;

            // Check if this is a fee token
            const storedToken = await testWallet.instance!.storage.getToken(uid);
            if (storedToken?.version === TokenVersion.FEE) {
              return {
                uid,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                balance,
                meltableAmount: 0,
                remainder: 0,
                hasMeltAuthority: false,
                canReturnToSender: false,
                isSwapToken: false,
                isFeeToken: true,
              };
            }

            const swapTokenUids = swapTokenUidsForNetwork(swapTokensState, testWallet.metadata.network);
            const swapToken = swapTokenUids.includes(uid);
            if (swapToken) {
              return {
                uid,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                balance,
                meltableAmount: 0,
                remainder: 0,
                hasMeltAuthority: false,
                canReturnToSender: false,
                isSwapToken: true,
                isFeeToken: false,
              };
            }

            const meltAuthority = await testWallet.instance!.getMeltAuthority(uid, {
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
              isSwapToken: false,
              isFeeToken: false,
            };
          } catch {
            return null;
          }
        })
      );
      setTokensToMelt(tokensData.filter((t): t is TokenToMelt => t !== null));
      setShieldedNotice(shieldedSweepNotice(splitsAfter));
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

  const meltableTokensList = getMeltableTokens(tokensToMelt);
  const swapTokensList = getSwapTokens(tokensToMelt);
  const feeTokensList = getFeeTokens(tokensToMelt);
  const returnableTokensList = getReturnableTokens(tokensToMelt);
  const tokensRemaining = getRemainingTokens(tokensToMelt);

  const hasTokensToMelt = meltableTokensList.length > 0;
  const hasSwapTokens = swapTokensList.length > 0;
  const hasTokensToReturn = returnableTokensList.length > 0;
  const hasHtrToTransfer = htrBalance > 0n;
  const canExecute =
    (hasTokensToMelt || hasSwapTokens || hasTokensToReturn || hasHtrToTransfer) &&
    fundingReady &&
    !busyReason &&
    !isLoading;

  // Calculate estimated HTR from melting (100 tokens = 1 HTR)
  const totalMeltableTokens = meltableTokensList.reduce((sum, t) => sum + t.meltableAmount, 0);
  const estimatedHtrFromMelting = Math.floor(totalMeltableTokens / 100);
  const totalEstimatedHtr = Number(htrBalance) + estimatedHtrFromMelting;

  const isMainnet = testWallet ? NETWORK_CONFIG[testWallet.metadata.network]?.kind === 'main' : false;
  const spinner = <span className="loading loading-spinner loading-sm" aria-hidden="true" />;

  // Mainnet cleanup sends real funds: require typing the wallet name first.
  const handleExecuteClick = async () => {
    if (isMainnet && testWallet) {
      const ok = await confirm({
        title: 'Clean up the test wallet on Mainnet?',
        body: 'Tokens are melted or returned and all HTR is sent to the funding wallet. This uses real funds.',
        confirmLabel: 'Execute cleanup',
        tone: 'danger',
        typeToConfirm: testWallet.metadata.friendlyName,
      });
      if (!ok) return;
    }
    handleExecuteCleanup();
  };

  const executeReason = isLoading
    ? null
    : busyReason
      ? busyReason
      : !fundingReady
        ? 'Funding wallet required for cleanup'
        : !hasTokensToMelt && !hasSwapTokens && !hasTokensToReturn && !hasHtrToTransfer
          ? shieldedNotice
            ? `Nothing transparent to clean up. ${shieldedNotice}.`
            : 'Nothing to clean up'
          : !canExecute
            ? 'Cannot execute cleanup'
            : null;

  const tokenNameCell = (token: { symbol: string; name: string }) => (
    <span className="whitespace-nowrap">
      <span className="font-semibold">{token.symbol}</span>{' '}
      <span className="text-caption text-ink-muted">({token.name})</span>
    </span>
  );

  type PreviewToken = (typeof tokensToMelt)[number];

  const previewColumns: DataTableColumn<PreviewToken>[] = [
    { key: 'token', header: 'Token', render: tokenNameCell },
    { key: 'balance', header: 'Balance', type: 'amount', value: (t) => formatBalance(t.balance) },
    {
      key: 'melt',
      header: 'Will melt',
      type: 'amount',
      render: (t) => (t.hasMeltAuthority ? t.meltableAmount : <span className="text-ink-muted">-</span>),
    },
    {
      key: 'remainder',
      header: 'Remainder',
      type: 'amount',
      render: (t) =>
        t.hasMeltAuthority ? (
          t.remainder > 0 ? (
            <span className="text-warning-ink">{t.remainder}</span>
          ) : (
            0
          )
        ) : (
          <span className="text-ink-muted">-</span>
        ),
    },
    {
      key: 'authority',
      header: 'Melt authority',
      type: 'status',
      render: (t) =>
        t.hasMeltAuthority ? (
          <StatusChip status="yes" tone="success" label="Yes" />
        ) : (
          <StatusChip status="no" tone="idle" label="No" />
        ),
    },
    {
      key: 'return',
      header: 'Return to sender',
      render: (t) => {
        const returnAmount = t.canReturnToSender ? (!t.hasMeltAuthority ? Number(t.balance) : t.remainder) : 0;
        if (!(t.canReturnToSender && returnAmount > 0)) return <span className="text-ink-muted">-</span>;
        return (
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-data">{returnAmount}</span>
            {t.originalSender && <Identifier value={t.originalSender} kind="address" copy={false} />}
          </span>
        );
      },
    },
  ];

  const simpleTokenColumns = (statusLabel: string, tone: 'info' | 'progress'): DataTableColumn<PreviewToken>[] => [
    { key: 'token', header: 'Token', render: tokenNameCell },
    { key: 'balance', header: 'Balance', type: 'amount', value: (t) => formatBalance(t.balance) },
    {
      key: 'action',
      header: 'Action',
      type: 'status',
      render: () => <StatusChip status={statusLabel} tone={tone} label={statusLabel} />,
    },
  ];

  const returnColumns: DataTableColumn<PreviewToken>[] = [
    { key: 'token', header: 'Token', className: 'font-semibold', value: (t) => t.symbol },
    {
      key: 'amount',
      header: 'Amount',
      type: 'amount',
      value: (t) => (!t.hasMeltAuthority ? Number(t.balance) : t.remainder),
    },
    {
      key: 'to',
      header: 'Return to',
      type: 'identifier',
      render: (t) => (t.originalSender ? <Identifier value={t.originalSender} kind="address" /> : null),
    },
    {
      key: 'wallet',
      header: 'Wallet',
      value: (t) => getWalletFriendlyName(t.tokenFlow?.addressFlows[0]?.walletId) || '-',
    },
  ];

  const retrievableTokens = tokensToMelt.filter(
    (t) => t.hasMeltAuthority && t.tokenFlow && t.tokenFlow.totalExternalBalance > 0
  );
  const manualTokens = tokensRemaining.filter((t) => !t.canReturnToSender && !t.hasMeltAuthority);

  const phaseChip = {
    idle: { label: 'Idle', tone: 'idle' as const },
    melting: { label: 'Processing', tone: 'progress' as const },
    transferring: { label: 'Transferring HTR', tone: 'progress' as const },
    done: { label: 'Completed', tone: 'success' as const },
  }[cleanupPhase];

  const logTone: Record<DebugLogEntry['type'], string> = {
    error: 'text-error',
    template: 'text-info',
    tx: 'text-success',
    info: 'text-base-content',
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      {confirmDialog}
      <StageHeader
        stageId="test-wallet-cleanup"
        description="Melt all custom tokens and return HTR to the funding wallet."
      />
      <PreconditionStrip requirements={[testWalletRequirement, fundingWalletRequirement]} />

      <Callout tone="warning" title="Scope: only the test wallet">
        This operation only affects the <strong>test wallet</strong>. It will:
        <ul>
          <li>Melt all custom tokens (in multiples of 100)</li>
          <li>Transfer swap test tokens to the funding wallet (never melted)</li>
          <li>Return unmeltable tokens to their original sender (in the same transaction)</li>
          <li>Leave fee tokens in the wallet (they cost HTR to transfer)</li>
          <li>Transfer all resulting HTR to the funding wallet (address 0)</li>
        </ul>
      </Callout>

      {swapTokensState.status === 'failed' && (
        <Callout tone="warning" title="Swap token registry unavailable">
          Failed to load the swap token registry: {swapTokensState.error}. Swap tokens may be melted instead of
          transferred.
        </Callout>
      )}

      {!testReady && (
        <Panel title="Cleanup preview">
          <EmptyState>
            {testWallet
              ? 'The preview appears once the test wallet finishes syncing.'
              : 'Select a test wallet to preview what the cleanup will do.'}
          </EmptyState>
        </Panel>
      )}

      {testReady && isLoading && (
        <Panel title="Cleanup preview">
          <p className="m-0 flex items-center gap-2 text-body text-ink-muted">
            <span className="loading loading-spinner loading-xs" aria-hidden="true" />
            Loading preview data…
          </p>
        </Panel>
      )}

      {testReady && !isLoading && (
        <>
          <Panel
            title="Tokens to melt"
            actions={
              <button
                type="button"
                onClick={handleRefresh}
                disabled={busyReason !== null}
                title={busyReason ?? undefined}
                className="btn btn-secondary btn-sm"
              >
                {isRefreshing ? spinner : <MdRefresh aria-hidden="true" />}
                Refresh
              </button>
            }
          >
            <DataTable
              caption="Tokens to melt"
              columns={previewColumns}
              rows={getDisplayableTokens(tokensToMelt)}
              getRowKey={(t) => t.uid}
              empty="No custom tokens found in the test wallet."
            />
          </Panel>

          {swapTokensList.length > 0 && (
            <Panel
              title="Swap test tokens"
              description="Side effects of swap tests. They are sent to the funding wallet, never melted."
            >
              <DataTable
                caption="Swap test tokens"
                columns={simpleTokenColumns('Send to funding', 'info')}
                rows={swapTokensList}
                getRowKey={(t) => t.uid}
              />
            </Panel>
          )}

          {feeTokensList.length > 0 && (
            <Panel
              title="Fee tokens"
              description="Created with version “fee”; they cost HTR to transfer, so they stay in the wallet."
            >
              <DataTable
                caption="Fee tokens"
                columns={simpleTokenColumns('Left in wallet', 'progress')}
                rows={feeTokensList}
                getRowKey={(t) => t.uid}
              />
            </Panel>
          )}

          <Panel title="Cleanup summary">
            {shieldedNotice && (
              <Callout tone="shielded" role="alert">
                {shieldedNotice}
              </Callout>
            )}
            <dl className="m-0 flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">Current HTR balance</dt>
                <dd className="m-0 font-mono text-data">{formatBalance(htrBalance)} HTR</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">HTR from melting ({totalMeltableTokens} tokens)</dt>
                <dd className="m-0 font-mono text-data">+{estimatedHtrFromMelting} HTR</dd>
              </div>
              {swapTokensList.length > 0 && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">Swap tokens to transfer</dt>
                  <dd className="m-0 text-right font-mono text-data">
                    {swapTokensList.map((t) => `${formatBalance(t.balance)} ${t.symbol}`).join(', ')}
                  </dd>
                </div>
              )}
              {feeTokensList.length > 0 && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">Fee tokens (left in wallet)</dt>
                  <dd className="m-0 text-right font-mono text-data text-warning-ink">
                    {feeTokensList.map((t) => `${formatBalance(t.balance)} ${t.symbol}`).join(', ')}
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-base-300 pt-2">
                <dt className="font-semibold">Total HTR to send</dt>
                <dd className="m-0 font-mono text-body-lg font-semibold">{totalEstimatedHtr} HTR</dd>
              </div>
            </dl>
            {fundingReady ? (
              <p className="m-0 text-caption text-ink-muted">Sent to funding wallet address 0.</p>
            ) : (
              <p className="m-0 text-caption text-error">No funding wallet available. Cleanup cannot proceed.</p>
            )}
          </Panel>

          {returnableTokensList.length > 0 && (
            <Panel title="Tokens to return to sender" description="Returned to the address that originally sent them.">
              <DataTable
                caption="Tokens to return to sender"
                columns={returnColumns}
                rows={tokensToMelt.filter((t) => t.canReturnToSender && t.originalSender)}
                getRowKey={(t) => t.uid}
              />
            </Panel>
          )}

          {retrievableTokens.length > 0 && (
            <Panel
              title="Tokens to retrieve for melting"
              description="You have melt authority for these tokens, but some are held at external addresses. Retrieve them to complete the cleanup."
            >
              {retrievableTokens.map((token) => (
                <Panel
                  key={token.uid}
                  variant="inset"
                  title={token.symbol}
                  actions={
                    <span className="font-mono text-data">{token.tokenFlow!.totalExternalBalance} to retrieve</span>
                  }
                >
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {token.tokenFlow!.addressFlows.map((flow, idx) => {
                      const isFundingWallet = flow.walletId === fundingWalletId;
                      const canRetrieve = isFundingWallet && fundingReady && !busyReason;
                      return (
                        <li
                          key={idx}
                          className="flex flex-col gap-1 rounded-field border border-base-300 bg-base-100 p-2 text-body"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Identifier value={flow.address} kind="address" />
                            <span className="font-mono text-data">
                              Net {flow.netBalance}{' '}
                              <span className="font-sans text-caption text-ink-muted">
                                (sent {flow.totalSent}, received {flow.totalReceived})
                              </span>
                            </span>
                          </div>
                          {flow.walletId && (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-caption text-ink-muted">
                                Wallet: {getWalletFriendlyName(flow.walletId)}
                              </span>
                              {isFundingWallet && (
                                <button
                                  type="button"
                                  onClick={() => handleRetrieveFromFunding(token.uid, token.symbol, flow.netBalance)}
                                  disabled={!canRetrieve}
                                  title={busyReason ?? undefined}
                                  className="btn btn-secondary btn-xs"
                                >
                                  {isRetrieving === token.uid && (
                                    <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                                  )}
                                  {isRetrieving === token.uid ? 'Retrieving' : 'Retrieve'}
                                </button>
                              )}
                            </div>
                          )}
                          {flow.unspentOutputs.length > 0 && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-muted">
                              Unspent:
                              {flow.unspentOutputs.map((utxo, i) => (
                                <span key={i} className="inline-flex items-center gap-1">
                                  <Identifier value={utxo.txId} kind="tx" head={8} tail={0} copy={false} />
                                  <span className="font-mono text-data-sm">
                                    :{utxo.outputIndex} ({utxo.amount})
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              ))}
            </Panel>
          )}

          {manualTokens.length > 0 && (
            <Panel
              title="Tokens requiring manual action"
              description="You don't have melt authority for these tokens. Contact the token owner or return them manually."
            >
              {manualTokens.map((token) => {
                const fullToken = tokensToMelt.find((t) => t.uid === token.uid);
                const hasFlowData = fullToken?.tokenFlow && fullToken.tokenFlow.addressFlows.length > 0;
                return (
                  <Panel
                    key={token.uid}
                    variant="inset"
                    title={
                      <>
                        {token.symbol}{' '}
                        <span className="text-caption font-normal text-ink-muted">(no melt authority)</span>
                      </>
                    }
                    actions={<span className="font-mono text-data">{Number(token.balance)} remaining</span>}
                  >
                    {hasFlowData ? (
                      <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {fullToken!.tokenFlow!.addressFlows.map((flow, idx) => (
                          <li
                            key={idx}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-field border border-base-300 bg-base-100 p-2"
                          >
                            <Identifier value={flow.address} kind="address" />
                            <span className="text-caption text-ink-muted">
                              {flow.walletId && <>Wallet: {getWalletFriendlyName(flow.walletId)} · </>}
                              <span className="font-mono text-data">Net {flow.netBalance}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="m-0 text-caption text-ink-muted">Could not trace the token origin.</p>
                    )}
                  </Panel>
                );
              })}
            </Panel>
          )}

          {(isExecuting || (cleanupPhase !== 'idle' && meltTxStatuses.length > 0)) && (
            <Panel
              title="Cleanup status"
              actions={<StatusChip status={phaseChip.label} tone={phaseChip.tone} label={phaseChip.label} />}
            >
              {executionStep && (
                <p className="m-0 flex items-center gap-2 text-body" role="status">
                  {isExecuting && <span className="loading loading-spinner loading-xs" aria-hidden="true" />}
                  {executionStep}
                </p>
              )}
              {meltTxStatuses.length > 0 && (
                <DataTable
                  caption="Cleanup transactions"
                  columns={[
                    { key: 'token', header: 'Step', className: 'font-semibold', value: (tx) => tx.tokenSymbol },
                    {
                      key: 'hash',
                      header: 'Transaction',
                      type: 'identifier',
                      render: (tx) => (tx.txHash ? <Identifier value={tx.txHash} kind="tx" /> : null),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      type: 'status',
                      render: (tx) => (
                        <StatusChip
                          status={tx.status}
                          tone={tx.status === 'confirmed' ? 'success' : 'error'}
                          label={tx.status === 'confirmed' ? 'Sent' : 'Failed'}
                        />
                      ),
                    },
                  ]}
                  rows={meltTxStatuses}
                  getRowKey={(tx, idx) => `${tx.txHash}-${idx}`}
                />
              )}
            </Panel>
          )}

          {errors.length > 0 && (
            <Callout tone="error" title="Errors">
              <ul>
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </Callout>
          )}

          {completed && errors.length === 0 && <Callout tone="success">Cleanup completed.</Callout>}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {!isExecuting && executeReason && <span className="text-caption text-ink-muted">{executeReason}</span>}
            <button
              type="button"
              onClick={handleExecuteClick}
              disabled={!canExecute}
              className={`btn ${isMainnet ? 'btn-error btn-outline' : 'btn-error'}`}
            >
              {isExecuting ? spinner : <MdCleaningServices aria-hidden="true" />}
              {isExecuting ? 'Executing cleanup' : isMainnet ? 'Execute cleanup on mainnet' : 'Execute cleanup'}
            </button>
          </div>
        </>
      )}

      <details
        className="rounded-box border border-base-300 bg-base-100"
        open={showDebug}
        onToggle={(e) => setShowDebug((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer px-4 py-2.5 text-title-sm">Debug panel</summary>
        <div className="flex flex-col gap-3 border-t border-base-300 p-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => setDebugLogs([])} className="btn btn-ghost btn-xs">
              Clear logs
            </button>
          </div>
          <div className="rounded-field bg-base-200 p-2 font-mono text-data-sm">
            <div className="text-ink-muted">Current state</div>
            <div>tokensToMelt: {tokensToMelt.length} tokens</div>
            <div>htrBalance: {htrBalance.toString()}</div>
            <div>hasTokensToMelt: {hasTokensToMelt.toString()}</div>
            <div>cleanupPhase: {cleanupPhase}</div>
            <div className="mt-2 text-ink-muted">Tokens with melt authority</div>
            {meltableTokensList.map((t, i) => (
              <div key={i} className="ml-2 text-success">
                {t.symbol}: {t.meltableAmount} meltable (balance: {t.balance.toString()})
              </div>
            ))}
            {meltableTokensList.length === 0 && <div className="ml-2 text-warning-ink">None found</div>}
            <div className="mt-2 text-ink-muted">Swap test tokens</div>
            {swapTokensList.map((t, i) => (
              <div key={i} className="ml-2 text-info">
                {t.symbol}: {t.balance.toString()} → funding wallet
              </div>
            ))}
            {swapTokensList.length === 0 && <div className="ml-2 text-warning-ink">None found</div>}
            <div className="mt-2 text-ink-muted">Fee tokens (left in wallet)</div>
            {feeTokensList.map((t, i) => (
              <div key={i} className="ml-2 text-error">
                {t.symbol}: {t.balance.toString()} (skipped)
              </div>
            ))}
            {feeTokensList.length === 0 && <div className="ml-2 text-warning-ink">None found</div>}
          </div>

          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto font-mono text-data-sm">
            {debugLogs.length === 0 ? (
              <div className="font-sans text-body text-ink-muted">
                No logs yet. Execute cleanup to see debug output.
              </div>
            ) : (
              debugLogs.map((log, i) => (
                <div key={i} className={`rounded-field bg-base-200 p-1.5 ${logTone[log.type]}`}>
                  <span className="text-ink-muted">[{log.timestamp}]</span>{' '}
                  <span className="font-semibold">[{log.type.toUpperCase()}]</span> {log.message}
                  {log.data !== undefined && log.data !== null && (
                    <pre className="m-0 mt-1 overflow-x-auto whitespace-pre-wrap text-data-sm">
                      {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
