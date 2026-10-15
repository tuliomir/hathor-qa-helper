/**
 * Get UTXOs Stage
 *
 * Tests htr_getUtxos with token selection and filters. Scatter funds splits
 * the test wallet's HTR into distinct UTXOs for filter testing.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  clearGetUtxosData,
  setGetUtxosError,
  setGetUtxosFormData,
  setGetUtxosRequest,
  setGetUtxosResponse,
} from '../../store/slices/getUtxosSlice';
import { RpcGetUtxosCard, type UtxoToken } from '../rpc/RpcGetUtxosCard';
import { buildGetUtxosRequest, toFilterNumber, type UtxoFilters } from '../../utils/rpcCoreRequests';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { useRequireRpcSession, useRequireTestAddress } from '../../hooks/useRequirements';
import { toMethodData, useRpcStageCall } from '../../hooks/useRpcStageCall';
import { useWalletStore } from '../../hooks/useWalletStore';
import { firstUnmetReason } from '../../utils/requirements';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { WALLET_CONFIG } from '../../constants/network';
import { computeScatterOutputs, scatterResultMessage, scatterShortfallMessage } from '../../utils/scatterFunds';
import { applyNetworkServices } from '../../services/networkServices';
import { shieldedSweepNotice, splitAvailableUtxos } from '../../services/shieldedUtxos';

const GET_UTXOS_ACTIONS = {
  setRequest: setGetUtxosRequest,
  setResponse: setGetUtxosResponse,
  setError: setGetUtxosError,
};

const HTR: UtxoToken = { uid: NATIVE_TOKEN_UID, name: 'Hathor', symbol: 'HTR' };

export const GetUtxosStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();
  const rpcSession = useRequireRpcSession();
  const testWalletReq = useRequireTestAddress();
  const { isDryRun, execute } = useRpcStageCall(GET_UTXOS_ACTIONS);

  const getUtxosData = useSelector((state: RootState) => state.getUtxos);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const allTokens = useSelector((state: RootState) => state.tokens.tokens);
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  const [filters, setFilters] = useState<UtxoFilters>(() => ({
    tokenUid: getUtxosData.tokenUid,
    maxUtxos: getUtxosData.maxUtxos,
    amountSmallerThan: getUtxosData.amountSmallerThan !== null ? String(getUtxosData.amountSmallerThan) : '',
    amountBiggerThan: getUtxosData.amountBiggerThan !== null ? String(getUtxosData.amountBiggerThan) : '',
  }));
  const [availableTokens, setAvailableTokens] = useState<UtxoToken[]>([HTR]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const { tokenUid } = filters;

  // Tokens with an unlocked balance in the test wallet.
  useEffect(() => {
    const loadTokens = async () => {
      if (!testWallet?.instance || !testWallet.tokenUids) {
        setAvailableTokens([HTR]);
        return;
      }
      setIsLoadingTokens(true);
      try {
        const withBalance: UtxoToken[] = [];
        const htrBalance = await testWallet.instance.getBalance(NATIVE_TOKEN_UID);
        if (htrBalance[0]?.balance?.unlocked && htrBalance[0].balance.unlocked > 0n) withBalance.push(HTR);
        for (const uid of testWallet.tokenUids) {
          if (uid === NATIVE_TOKEN_UID) continue;
          try {
            const balance = await testWallet.instance.getBalance(uid);
            const info = allTokens.find((t) => t.uid === uid);
            if (balance[0]?.balance?.unlocked && balance[0].balance.unlocked > 0n && info) {
              withBalance.push({ uid: info.uid, name: info.name, symbol: info.symbol });
            }
          } catch (err) {
            console.error(`Failed to load balance for token ${uid}:`, err);
          }
        }
        setAvailableTokens(withBalance);
        if (withBalance.length > 0 && !withBalance.find((t) => t.uid === tokenUid)) {
          setFilters((f) => ({ ...f, tokenUid: withBalance[0].uid }));
        }
      } catch (error) {
        console.error('Failed to load tokens:', error);
        setAvailableTokens([HTR]);
      } finally {
        setIsLoadingTokens(false);
      }
    };
    loadTokens();
  }, [testWallet, allTokens, tokenUid]);

  // Persist the form across navigation.
  useEffect(() => {
    dispatch(
      setGetUtxosFormData({
        tokenUid: filters.tokenUid,
        maxUtxos: filters.maxUtxos,
        amountSmallerThan: toFilterNumber(filters.amountSmallerThan),
        amountBiggerThan: toFilterNumber(filters.amountBiggerThan),
      })
    );
  }, [filters, dispatch]);

  const handleExecute = () => {
    dispatch(clearGetUtxosData());
    return execute(
      (h) =>
        h.getRpcGetUtxos(
          filters.tokenUid,
          filters.maxUtxos,
          toFilterNumber(filters.amountSmallerThan),
          toFilterNumber(filters.amountBiggerThan)
        ),
      buildGetUtxosRequest(filters)
    );
  };

  const [isScattering, setIsScattering] = useState(false);
  const [scatterError, setScatterError] = useState<string | null>(null);
  const [scatterResult, setScatterResult] = useState<string | null>(null);

  const handleScatterFunds = async () => {
    if (!testWallet?.instance) return;
    setIsScattering(true);
    setScatterError(null);
    setScatterResult(null);
    try {
      const addr0 = await testWallet.instance.getAddressAtIndex(0);
      // Only transparent HTR: getBalance() also counts shielded UTXOs, which the browser cannot spend.
      const htrSplit = await splitAvailableUtxos(testWallet.instance, NATIVE_TOKEN_UID);
      const unlocked = htrSplit.transparent.amount;
      const shieldedNote = shieldedSweepNotice([htrSplit]);
      // Transfers are feeless and the outputs sum exactly to the input, so no reserve is needed.
      const amounts = computeScatterOutputs(unlocked);
      if (amounts.length === 0) {
        setScatterError(scatterShortfallMessage(unlocked) + (shieldedNote ? ` (${shieldedNote}.)` : ''));
        return;
      }
      const outputs = amounts.map((amount) => ({ address: addr0, value: amount, token: NATIVE_TOKEN_UID }));
      applyNetworkServices(testWallet.metadata.network);
      const sendTx = await testWallet.instance.sendManyOutputsSendTransaction(outputs, {
        changeAddress: addr0,
        pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
      });
      await sendTx.run();
      setScatterResult(scatterResultMessage(amounts));
    } catch (err) {
      setScatterError(err instanceof Error ? err.message : 'Failed to scatter funds');
      console.error('Scatter funds error:', err);
    } finally {
      setIsScattering(false);
    }
  };

  const requirements = [rpcSession, testWalletReq];

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-get-utxos"
        description="List the wallet's unspent outputs for one token, with count and amount filters."
        method="htr_getUtxos"
      />
      <PreconditionStrip requirements={requirements} />
      <RpcGetUtxosCard
        onExecute={handleExecute}
        methodData={toMethodData(getUtxosData)}
        isDryRun={isDryRun}
        disabledReason={firstUnmetReason(requirements)}
        filters={filters}
        onFiltersChange={setFilters}
        tokens={availableTokens}
        isLoadingTokens={isLoadingTokens}
      />
      {testWallet?.instance && (
        <Panel
          title="Scatter funds"
          description="Split the test wallet's HTR into UTXOs of 0.01, 0.02, 0.03 … HTR (1, 2, 3 … base units) to exercise the amount filters."
          actions={
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleScatterFunds}
              disabled={isScattering}
            >
              {isScattering && <span className="loading loading-spinner loading-xs" aria-hidden="true" />}
              {isScattering ? 'Scattering…' : 'Scatter funds'}
            </button>
          }
        >
          {scatterError && (
            <Callout tone="error" title="Scatter failed" role="alert">
              {scatterError}
            </Callout>
          )}
          {scatterResult && <Callout tone="success">{scatterResult}</Callout>}
          {!scatterError && !scatterResult && (
            <p className="m-0 text-body text-ink-muted">Sends the transparent HTR balance back to address 0.</p>
          )}
        </Panel>
      )}
    </div>
  );
};
