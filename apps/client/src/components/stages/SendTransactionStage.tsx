/**
 * Send Transaction Stage
 *
 * Tests htr_sendTransaction RPC call with Redux state persistence
 */

import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import type { SendTransactionOutput } from '../../store/slices/sendTransactionSlice';
import {
  clearSendTransactionData,
  setSendTransactionError,
  setSendTransactionFormData,
  setSendTransactionRequest,
  setSendTransactionResponse,
} from '../../store/slices/sendTransactionSlice';
import { RpcSendTransactionCard } from '../rpc/RpcSendTransactionCard';
import { buildSendTransactionRequest } from '../../utils/rpcSendTransaction';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import type { OutputTokenOption } from '../common/OutputEditor';
import { useRequireRpcSession } from '../../hooks/useRequirements';
import { RpcRunError, useRpcMethod } from '../../hooks/useRpcMethod';
import { useWalletStore } from '../../hooks/useWalletStore';
import { extractErrorMessage } from '../../utils/errorUtils';
import { firstUnmetReason } from '../../utils/requirements';
import { DEFAULT_NETWORK } from '../../constants/network';
import { HTR_OPTION, walletTokenOptions } from '../../utils/walletTokenOptions';
import { useAddressOnlyTokens } from '../../hooks/useAddressOnlyTokens';

export const SendTransactionStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();
  const { isDryRun, run } = useRpcMethod();
  const rpcSession = useRequireRpcSession();

  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const sendTransactionData = useSelector((state: RootState) => state.sendTransaction);
  const allTokens = useSelector((state: RootState) => state.tokens.tokens);
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  const addressOnlyTokens = useAddressOnlyTokens();

  // HTR plus the test wallet's custom tokens,
  // or those added by hand to an address-only wallet.
  const availableTokens = useMemo<OutputTokenOption[]>(
    () =>
      addressOnlyTokens ? [HTR_OPTION, ...addressOnlyTokens] : walletTokenOptions(testWallet?.tokenUids, allTokens),
    [testWallet?.tokenUids, allTokens, addressOnlyTokens]
  );

  const handleExecute = async (outputs: SendTransactionOutput[], pushTx: boolean) => {
    dispatch(setSendTransactionFormData({ outputs, pushTx }));
    dispatch(clearSendTransactionData());
    try {
      const { request, response, duration } = await run(
        (h) => h.getRpcSendTransaction(outputs, pushTx),
        buildSendTransactionRequest(outputs, pushTx)
      );
      dispatch(setSendTransactionRequest({ method: request.method, params: request.params, isDryRun }));
      dispatch(setSendTransactionResponse({ response, duration }));
      return response;
    } catch (error) {
      const original = error instanceof RpcRunError ? error.original : error;
      const requestParams = (original as { requestParams?: { method: string; params: unknown } }).requestParams;
      if (requestParams) {
        dispatch(setSendTransactionRequest({ method: requestParams.method, params: requestParams.params, isDryRun }));
      }
      dispatch(
        setSendTransactionError({
          error: extractErrorMessage(original),
          duration: error instanceof RpcRunError ? error.duration : 0,
        })
      );
      throw original;
    }
  };

  const methodData = {
    request: sendTransactionData.request,
    response: sendTransactionData.rawResponse,
    error: sendTransactionData.error,
    timestamp: sendTransactionData.timestamp,
    duration: sendTransactionData.duration,
    isDryRun: sendTransactionData.isDryRun,
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-send-transaction"
        title="Send transaction"
        description="Send a transaction with one or more outputs through the connected wallet."
        method="htr_sendTransaction"
      />
      <PreconditionStrip requirements={[rpcSession]} />
      <RpcSendTransactionCard
        onExecute={handleExecute}
        methodData={methodData}
        isDryRun={isDryRun}
        network={testWallet?.metadata.network ?? DEFAULT_NETWORK}
        testWallet={testWallet?.instance ?? null}
        availableTokens={availableTokens}
        disabledReason={firstUnmetReason([rpcSession])}
        initialFormData={sendTransactionData.formData}
      />
    </div>
  );
};
