/**
 * Get Balance Stage
 *
 * Tests htr_getBalance for HTR and the test wallet's custom tokens.
 */

import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { setGetBalanceError, setGetBalanceRequest, setGetBalanceResponse } from '../../store/slices/getBalanceSlice';
import { refreshWalletBalance, refreshWalletTokens } from '../../store/slices/walletStoreSlice';
import { RpcGetBalanceCard, type BalanceToken } from '../rpc/RpcGetBalanceCard';
import { buildGetBalanceRequest } from '../../utils/rpcCoreRequests';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { RpcAddressMismatchCallout } from '../rpc/RpcAddressMismatchCallout';
import { useRequireRpcSession } from '../../hooks/useRequirements';
import { toMethodData, useRpcStageCall } from '../../hooks/useRpcStageCall';
import { useToast } from '../../hooks/useToast';
import { ADDRESS_MISMATCH_REASON, useRpcAddressMismatch } from '../../hooks/useRpcAddressMismatch';
import { firstUnmetReason } from '../../utils/requirements';
import { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

const GET_BALANCE_ACTIONS = {
  setRequest: setGetBalanceRequest,
  setResponse: setGetBalanceResponse,
  setError: setGetBalanceError,
};

const HTR: BalanceToken = {
  uid: NATIVE_TOKEN_UID,
  symbol: DEFAULT_NATIVE_TOKEN_CONFIG.symbol,
  name: DEFAULT_NATIVE_TOKEN_CONFIG.name,
};

export const GetBalanceStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();
  const rpcSession = useRequireRpcSession();
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const testWallet = useSelector((state: RootState) => (testWalletId ? state.walletStore.wallets[testWalletId] : null));
  const allTokens = useSelector((state: RootState) => state.tokens.tokens);
  const getBalanceData = useSelector((state: RootState) => state.getBalance);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const mismatch = useRpcAddressMismatch();

  const walletTokens = useMemo<BalanceToken[]>(() => {
    const custom = (testWallet?.tokenUids ?? [])
      .filter((uid) => uid !== NATIVE_TOKEN_UID)
      .map((uid) => allTokens.find((t) => t.uid === uid))
      .filter((t): t is NonNullable<typeof t> => t !== undefined)
      .map((t) => ({ uid: t.uid, name: t.name, symbol: t.symbol }));
    return [HTR, ...custom];
  }, [testWallet, allTokens]);

  const tokenUids = useMemo(() => walletTokens.map((t) => t.uid), [walletTokens]);
  const { isDryRun, execute } = useRpcStageCall(GET_BALANCE_ACTIONS, { balanceTokens: tokenUids });

  const handleExecute = () => execute((h) => h.getRpcBalance(), buildGetBalanceRequest(tokenUids));

  const handleRefreshTokens = async () => {
    if (!testWalletId || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        dispatch(refreshWalletTokens(testWalletId)).unwrap(),
        dispatch(refreshWalletBalance(testWalletId)).unwrap(),
      ]);
      showToast('Tokens refreshed', 'success');
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      showToast('Failed to refresh tokens', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const disabledReason = mismatch ? ADDRESS_MISMATCH_REASON : firstUnmetReason([rpcSession]);

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-get-balance"
        description="Query the connected wallet's balance for HTR and the test wallet's tokens."
        method="htr_getBalance"
      />
      <PreconditionStrip requirements={[rpcSession]} />
      {mismatch && <RpcAddressMismatchCallout mismatch={mismatch} />}
      <RpcGetBalanceCard
        onExecute={handleExecute}
        methodData={toMethodData(getBalanceData)}
        isDryRun={isDryRun}
        disabledReason={disabledReason}
        tokens={walletTokens}
        onRefresh={testWalletId ? handleRefreshTokens : undefined}
        isRefreshing={isRefreshing}
      />
    </div>
  );
};
