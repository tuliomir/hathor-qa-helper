/**
 * Fee Withdraw Stage
 *
 * Tests htr_sendNanoContractTx (withdraw) RPC call for fee tokens with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setFeeWithdrawError,
  setFeeWithdrawFormData,
  setFeeWithdrawRequest,
  setFeeWithdrawResponse,
} from '../../store/slices/feeWithdrawSlice';
import { RpcFeeWithdrawCard } from '../rpc/RpcFeeWithdrawCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { useFeeTokens } from '../../hooks/useFeeTokens';
import { buildFeeWithdrawRequest } from '../../utils/nanoRpcRequests';
import { firstUnmetReason } from '../../utils/requirements';
import { methodDataOf, useNanoRpcExecute, useNanoStageWallet } from '../../hooks/useNanoRpcStage';

export const FeeWithdrawStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const feeDepositData = useSelector((state: RootState) => state.feeDeposit);
  const feeWithdrawData = useSelector((state: RootState) => state.feeWithdraw);
  const latestNcId = useSelector((state: RootState) => state.feeNanoContract.ncId);
  const { feeTokens, loading: feeTokensLoading } = useFeeTokens();

  const [ncId, setNcId] = useState<string>('');
  const [feeToken, setFeeToken] = useState<string>('');
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [amount, setAmount] = useState<string>('10');
  const [contractPaysFees, setContractPaysFees] = useState<boolean>(false);
  const [htrWithdrawAmount, setHtrWithdrawAmount] = useState<string>('1');
  const [pushTx, setPushTx] = useState<boolean>(false);
  const { network, derivedAddress: withdrawAddress, requirements } = useNanoStageWallet(addressIndex);

  useEffect(() => {
    if (latestNcId && !ncId) setNcId(latestNcId);
  }, [latestNcId, ncId]);

  // Auto-select the first fee token
  useEffect(() => {
    if (feeTokens.length > 0 && !feeToken) setFeeToken(feeTokens[0].uid);
  }, [feeTokens, feeToken]);

  // On mount: prefill from a successful deposit, else from the last withdraw.
  useEffect(() => {
    if (feeDepositData.timestamp && !feeDepositData.error && feeDepositData.ncId) {
      setNcId(feeDepositData.ncId);
      setAddressIndex(feeDepositData.addressIndex);
      setAmount(feeDepositData.amount);
      setFeeToken(feeDepositData.token);
    } else {
      setAddressIndex(0);
      setAmount(feeWithdrawData.amount);
      setFeeToken(feeWithdrawData.token);
    }
    setPushTx(feeWithdrawData.pushTx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch(setFeeWithdrawFormData({ address: withdrawAddress, amount, token: feeToken, pushTx }));
  }, [withdrawAddress, amount, feeToken, pushTx, dispatch]);

  const liveRequest = useMemo(
    () =>
      buildFeeWithdrawRequest({
        ncId: ncId || '<nc_id>',
        feeToken: feeToken || '<fee_token>',
        amount: amount || '<amount>',
        address: withdrawAddress || '<address>',
        pushTx,
        contractPaysFees,
        htrWithdrawAmount: htrWithdrawAmount || '<htr_amount>',
      }),
    [ncId, feeToken, amount, withdrawAddress, pushTx, contractPaysFees, htrWithdrawAmount]
  );

  const { isDryRun, execute } = useNanoRpcExecute({
    request: setFeeWithdrawRequest,
    response: (response, duration) => setFeeWithdrawResponse({ response, duration }),
    error: setFeeWithdrawError,
  });

  const handleExecute = async () => {
    if (!ncId) throw new Error('Enter a nano contract ID');
    return execute(
      (h) => h.getRpcFeeWithdraw(ncId, feeToken, amount, withdrawAddress, pushTx, contractPaysFees, htrWithdrawAmount),
      liveRequest
    );
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-fee-withdraw"
        title="Withdraw fee token"
        description="Withdraw a fee-based token from the fee nano contract."
        method="htr_sendNanoContractTx"
      />
      <PreconditionStrip requirements={requirements} />
      <RpcFeeWithdrawCard
        onExecute={handleExecute}
        liveRequest={liveRequest}
        methodData={methodDataOf(feeWithdrawData)}
        isDryRun={isDryRun}
        disabledReason={firstUnmetReason(requirements) ?? (ncId ? null : 'Enter a nano contract ID')}
        network={network}
        ncId={ncId}
        setNcId={setNcId}
        latestNcId={latestNcId}
        feeToken={feeToken}
        setFeeToken={setFeeToken}
        withdrawAddress={withdrawAddress}
        addressIndex={addressIndex}
        setAddressIndex={setAddressIndex}
        amount={amount}
        setAmount={setAmount}
        contractPaysFees={contractPaysFees}
        setContractPaysFees={setContractPaysFees}
        htrWithdrawAmount={htrWithdrawAmount}
        setHtrWithdrawAmount={setHtrWithdrawAmount}
        pushTx={pushTx}
        setPushTx={setPushTx}
        feeTokens={feeTokens}
        feeTokensLoading={feeTokensLoading}
      />
    </div>
  );
};
