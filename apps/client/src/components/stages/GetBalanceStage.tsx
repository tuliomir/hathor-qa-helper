/**
 * Get Balance Stage
 *
 * Tests htr_getBalance for HTR and the test wallet's custom tokens.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { setGetBalanceError, setGetBalanceRequest, setGetBalanceResponse } from '../../store/slices/getBalanceSlice';
import { selectWalletConnectFirstAddress } from '../../store/slices/walletConnectSlice';
import { refreshWalletBalance, refreshWalletTokens } from '../../store/slices/walletStoreSlice';
import { RpcGetBalanceCard, type BalanceToken } from '../rpc/RpcGetBalanceCard';
import { buildGetBalanceRequest } from '../../utils/rpcCoreRequests';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Identifier } from '../common/Identifier';
import { Callout } from '../ui/Callout';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useRequireRpcSession } from '../../hooks/useRequirements';
import { toMethodData, useRpcStageCall } from '../../hooks/useRpcStageCall';
import { useDeepLinkCallback } from '../../hooks/useDeepLinkCallback';
import { useToast } from '../../hooks/useToast';
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
  const { isDryRun, isConnected, execute } = useRpcStageCall(GET_BALANCE_ACTIONS);
  const { onDeepLinkAvailable } = useDeepLinkCallback();

  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const testWallet = useSelector((state: RootState) => (testWalletId ? state.walletStore.wallets[testWalletId] : null));
  const allTokens = useSelector((state: RootState) => state.tokens.tokens);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const getBalanceData = useSelector((state: RootState) => state.getBalance);

  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const instance = testWallet?.instance as { getAddressAtIndex?: (index: number) => Promise<string> } | undefined;
    if (!instance?.getAddressAtIndex) {
      setTestWalletAddress(null);
      return;
    }
    instance
      .getAddressAtIndex(0)
      .then(setTestWalletAddress)
      .catch((error) => {
        console.error('Failed to get test wallet address:', error);
        setTestWalletAddress(null);
      });
  }, [testWallet]);

  const addressMismatch =
    isConnected &&
    !!connectedAddress &&
    !!testWalletAddress &&
    connectedAddress.toLowerCase() !== testWalletAddress.toLowerCase();

  const walletTokens = useMemo<BalanceToken[]>(() => {
    const custom = (testWallet?.tokenUids ?? [])
      .filter((uid) => uid !== NATIVE_TOKEN_UID)
      .map((uid) => allTokens.find((t) => t.uid === uid))
      .filter((t): t is NonNullable<typeof t> => t !== undefined)
      .map((t) => ({ uid: t.uid, name: t.name, symbol: t.symbol }));
    return [HTR, ...custom];
  }, [testWallet, allTokens]);

  const tokenUids = useMemo(() => walletTokens.map((t) => t.uid), [walletTokens]);

  // useRpcMethod's handlers query HTR only; htr_getBalance needs the token list.
  const balanceHandlers = useMemo(
    () =>
      walletConnect.client && walletConnect.session
        ? createRpcHandlers({
            client: walletConnect.client,
            session: walletConnect.session,
            balanceTokens: tokenUids,
            dryRun: isDryRun,
            onDeepLinkAvailable,
          })
        : null,
    [walletConnect.client, walletConnect.session, tokenUids, isDryRun, onDeepLinkAvailable]
  );

  const handleExecute = () =>
    execute(() => {
      if (!balanceHandlers) throw new Error('Connect an RPC session first');
      return balanceHandlers.getRpcBalance();
    }, buildGetBalanceRequest(tokenUids));

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

  const disabledReason = addressMismatch
    ? 'Connected wallet differs from the test wallet'
    : firstUnmetReason([rpcSession]);

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-get-balance"
        description="Query the connected wallet's balance for HTR and the test wallet's tokens."
        method="htr_getBalance"
      />
      <PreconditionStrip requirements={[rpcSession]} />
      {addressMismatch && (
        <Callout tone="warning" title="Connected wallet differs from the test wallet">
          <p className="m-0">
            The RPC session's first address does not match the test wallet's address 0, so sending is disabled. Connect
            the matching wallet or choose another test wallet.
          </p>
          <dl className="m-0 mt-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1">
            <dt>RPC session</dt>
            <dd className="m-0 min-w-0">
              <Identifier value={connectedAddress!} kind="address" walletTag={false} />
            </dd>
            <dt>Test wallet</dt>
            <dd className="m-0 min-w-0">
              <Identifier value={testWalletAddress!} kind="address" walletTag={false} />
            </dd>
          </dl>
        </Callout>
      )}
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
