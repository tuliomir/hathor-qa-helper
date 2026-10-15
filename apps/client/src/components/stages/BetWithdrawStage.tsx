/**
 * Bet Withdraw Stage
 *
 * Tests htr_sendNanoContractTx (withdraw) RPC call with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setBetWithdrawError,
  setBetWithdrawFormData,
  setBetWithdrawRequest,
  setBetWithdrawResponse,
} from '../../store/slices/betWithdrawSlice';
import { RpcBetWithdrawCard } from '../rpc/RpcBetWithdrawCard';
import { StageHeader } from '../common/StageHeader';
import { StartFlowButton } from '../flows/StartFlowButton';
import { BET_FLOW } from '../../flows';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { buildBetWithdrawRequest } from '../../utils/nanoRpcRequests';
import { firstUnmetReason } from '../../utils/requirements';
import { methodDataOf, useNanoRpcExecute, useNanoStageWallet } from '../../hooks/useNanoRpcStage';
import { bool, num, str, useFlowPrefill } from '../../hooks/useFlowPrefill';

export const BetWithdrawStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const betWithdrawData = useSelector((state: RootState) => state.betWithdraw);
  const betDepositData = useSelector((state: RootState) => state.betDeposit);
  const latestNcId = useSelector((state: RootState) => state.betNanoContract.ncId);

  // Prefill from Place bet when a bet was placed, else from the last withdraw.
  const hasDepositData = !!(betDepositData.timestamp && !betDepositData.error && betDepositData.ncId);
  const [ncId, setNcId] = useState<string>(hasDepositData ? betDepositData.ncId : latestNcId || '');
  const [addressIndex, setAddressIndex] = useState<number>(hasDepositData ? betDepositData.addressIndex : 0);
  const [amount, setAmount] = useState<string>(hasDepositData ? betDepositData.amount : betWithdrawData.amount);
  const [token, setToken] = useState<string>(hasDepositData ? betDepositData.token : betWithdrawData.token);
  const [pushTx, setPushTx] = useState<boolean>(betWithdrawData.pushTx);
  const { network, derivedAddress: withdrawAddress, requirements } = useNanoStageWallet(addressIndex);

  useEffect(() => {
    if (latestNcId && !ncId) setNcId(latestNcId);
  }, [latestNcId, ncId]);

  useEffect(() => {
    dispatch(setBetWithdrawFormData({ address: withdrawAddress, amount, token, pushTx }));
  }, [withdrawAddress, amount, token, pushTx, dispatch]);

  // Values an automatic flow run filled in.
  useFlowPrefill('rpc-bet-withdraw', (v) => {
    setNcId(str(v, 'ncId') ?? ncId);
    setAddressIndex(num(v, 'addressIndex') ?? addressIndex);
    setAmount(str(v, 'amount') ?? amount);
    setToken(str(v, 'token') ?? token);
    setPushTx(bool(v, 'pushTx') ?? pushTx);
  });

  const amountNum = parseFloat(amount) || 0;
  const liveRequest = useMemo(
    () =>
      buildBetWithdrawRequest({
        ncId: ncId || '<nc_id>',
        address: withdrawAddress || '<address>',
        amount: amountNum,
        token: token || '<token>',
        pushTx,
      }),
    [ncId, withdrawAddress, amountNum, token, pushTx]
  );

  const { isDryRun, execute } = useNanoRpcExecute({
    request: setBetWithdrawRequest,
    response: (response, duration) => setBetWithdrawResponse({ response, duration }),
    error: setBetWithdrawError,
  });

  const handleExecute = async () => {
    if (!ncId) throw new Error('Enter a nano contract ID');
    return execute((h) => h.getRpcBetWithdraw(ncId, withdrawAddress, amountNum, token, pushTx), liveRequest);
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-bet-withdraw"
        title="Withdraw prize"
        description="Withdraw your prize from a bet nano contract after the result is set."
        method="htr_sendNanoContractTx"
        actions={<StartFlowButton flow={BET_FLOW} label="Run the bet flow" />}
      />
      <PreconditionStrip requirements={requirements} />
      <RpcBetWithdrawCard
        onExecute={handleExecute}
        liveRequest={liveRequest}
        methodData={methodDataOf(betWithdrawData)}
        isDryRun={isDryRun}
        disabledReason={firstUnmetReason(requirements) ?? (ncId ? null : 'Enter a nano contract ID')}
        network={network}
        ncId={ncId}
        setNcId={setNcId}
        latestNcId={latestNcId}
        withdrawAddress={withdrawAddress}
        addressIndex={addressIndex}
        setAddressIndex={setAddressIndex}
        amount={amount}
        setAmount={setAmount}
        token={token}
        setToken={setToken}
        pushTx={pushTx}
        setPushTx={setPushTx}
      />
    </div>
  );
};
