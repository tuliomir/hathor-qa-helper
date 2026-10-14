/**
 * Create Token Stage
 *
 * Tests htr_createToken; refreshes the test wallet's tokens after a real
 * creation.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setCreateTokenError,
  setCreateTokenRequest,
  setCreateTokenResponse,
} from '../../store/slices/createTokenSlice';
import { refreshWalletBalance, refreshWalletTokens } from '../../store/slices/walletStoreSlice';
import { RpcCreateTokenCard } from '../rpc/RpcCreateTokenCard';
import { RpcAddressMismatchCallout } from '../rpc/RpcAddressMismatchCallout';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import type { CreateTokenParams } from '../../services/rpcHandlers';
import { useRequireRpcSession, useRequireTestWallet } from '../../hooks/useRequirements';
import { toMethodData, useRpcStageCall } from '../../hooks/useRpcStageCall';
import { ADDRESS_MISMATCH_REASON, useRpcAddressMismatch } from '../../hooks/useRpcAddressMismatch';
import { useWalletStore } from '../../hooks/useWalletStore';
import { firstUnmetReason } from '../../utils/requirements';
import { buildCreateTokenRequest } from '../../utils/rpcCoreRequests';

const CREATE_TOKEN_ACTIONS = {
  setRequest: setCreateTokenRequest,
  setResponse: setCreateTokenResponse,
  setError: setCreateTokenError,
};

export const CreateTokenStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();
  const rpcSession = useRequireRpcSession();
  const testWalletReq = useRequireTestWallet();
  const mismatch = useRpcAddressMismatch();
  const { isDryRun, execute } = useRpcStageCall(CREATE_TOKEN_ACTIONS);

  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const createTokenData = useSelector((state: RootState) => state.createToken);
  const testWallet = testWalletId ? getWallet(testWalletId) : null;
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!testWallet?.instance) {
      setTestWalletAddress(null);
      return;
    }
    testWallet.instance
      .getAddressAtIndex(0)
      .then(setTestWalletAddress)
      .catch((error: unknown) => {
        console.error('Failed to get test wallet address:', error);
        setTestWalletAddress(null);
      });
  }, [testWallet]);

  const handleExecute = async (params: CreateTokenParams) => {
    const response = await execute((h) => h.getRpcCreateToken(params), buildCreateTokenRequest(params));
    // A real creation changes the test wallet's tokens; the refresh is best effort.
    if (!isDryRun && response && testWalletId) {
      try {
        await Promise.all([
          dispatch(refreshWalletTokens(testWalletId)).unwrap(),
          dispatch(refreshWalletBalance(testWalletId)).unwrap(),
        ]);
      } catch (refreshError) {
        console.error('Failed to refresh wallet tokens:', refreshError);
      }
    }
    return response;
  };

  const requirements = [rpcSession, testWalletReq];

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-create-token"
        description="Create a custom token through the connected wallet, with optional mint and melt authorities."
        method="htr_createToken"
      />
      <PreconditionStrip requirements={requirements} />
      {mismatch && <RpcAddressMismatchCallout mismatch={mismatch} />}
      <RpcCreateTokenCard
        onExecute={handleExecute}
        methodData={toMethodData(createTokenData)}
        isDryRun={isDryRun}
        disabledReason={mismatch ? ADDRESS_MISMATCH_REASON : firstUnmetReason(requirements)}
        walletAddress={testWalletAddress}
      />
    </div>
  );
};
