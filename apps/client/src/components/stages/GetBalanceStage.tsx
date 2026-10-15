/**
 * Get Balance Stage
 *
 * Tests htr_getBalance for HTR and the test wallet's custom tokens. An
 * address-only test wallet can't list its tokens, so they are added by hand
 * (UID or configuration string) and saved on the wallet.
 */

import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { setGetBalanceError, setGetBalanceRequest, setGetBalanceResponse } from '../../store/slices/getBalanceSlice';
import { refreshWalletBalance, refreshWalletTokens, setAddressOnlyTokens } from '../../store/slices/walletStoreSlice';
import { addToken } from '../../store/slices/tokensSlice';
import { isAddressOnly } from '../../utils/addressOnlyWallet';
import { parseTokenInput } from '../../utils/tokenConfigString';
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

  const addressOnly = testWallet ? isAddressOnly(testWallet.metadata) : false;
  // The stored array itself (not a fresh `[]`), so the memo below stays stable.
  const addedTokens = addressOnly ? testWallet?.metadata.tokens : undefined;

  const walletTokens = useMemo<BalanceToken[]>(() => {
    if (addressOnly) {
      return [
        HTR,
        ...(addedTokens ?? []).map((t) => {
          const known = allTokens.find((k) => k.uid === t.uid);
          return {
            uid: t.uid,
            name: t.name ?? known?.name ?? 'Unknown',
            symbol: t.symbol ?? known?.symbol ?? `${t.uid.slice(0, 8)}…`,
          };
        }),
      ];
    }
    const custom = (testWallet?.tokenUids ?? [])
      .filter((uid) => uid !== NATIVE_TOKEN_UID)
      .map((uid) => allTokens.find((t) => t.uid === uid))
      .filter((t): t is NonNullable<typeof t> => t !== undefined)
      .map((t) => ({ uid: t.uid, name: t.name, symbol: t.symbol }));
    return [HTR, ...custom];
  }, [testWallet, allTokens, addressOnly, addedTokens]);

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

  const handleAddToken = (input: string): string | null => {
    if (!testWalletId || !addressOnly) return 'No address-only test wallet selected';
    const parsed = parseTokenInput(input);
    if (!parsed.ok) return parsed.error;
    const { token } = parsed;
    const current = addedTokens ?? [];
    if (current.some((t) => t.uid === token.uid)) return 'Already in the list';
    dispatch(setAddressOnlyTokens({ id: testWalletId, tokens: [...current, token] }));
    // Let other stages show the symbol too.
    if (token.name && token.symbol) dispatch(addToken({ uid: token.uid, name: token.name, symbol: token.symbol }));
    return null;
  };

  const handleRemoveToken = (uid: string) => {
    if (!testWalletId || !addedTokens) return;
    dispatch(setAddressOnlyTokens({ id: testWalletId, tokens: addedTokens.filter((t) => t.uid !== uid) }));
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
        onRefresh={testWalletId && !addressOnly ? handleRefreshTokens : undefined}
        isRefreshing={isRefreshing}
        onAddToken={addressOnly ? handleAddToken : undefined}
        onRemoveToken={addressOnly ? handleRemoveToken : undefined}
      />
    </div>
  );
};
