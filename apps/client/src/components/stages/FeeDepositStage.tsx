/**
 * Fee Deposit Stage
 *
 * Tests htr_sendNanoContractTx (fee/deposit) RPC call with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setFeeDepositError,
  setFeeDepositFormData,
  setFeeDepositRequest,
  setFeeDepositResponse,
} from '../../store/slices/feeDepositSlice';
import { RpcFeeDepositCard } from '../rpc/RpcFeeDepositCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { StartFlowButton } from '../flows/StartFlowButton';
import { FEE_FLOW } from '../../flows';
import { bool, num, str, useFlowPrefill } from '../../hooks/useFlowPrefill';
import { useFeeTokens } from '../../hooks/useFeeTokens';
import { buildFeeDepositRequest } from '../../utils/nanoRpcRequests';
import { firstUnmetReason } from '../../utils/requirements';
import { methodDataOf, useNanoRpcExecute, useNanoStageWallet } from '../../hooks/useNanoRpcStage';

export const FeeDepositStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const feeDepositData = useSelector((state: RootState) => state.feeDeposit);
  const latestInitializedNcId = useSelector((state: RootState) => state.feeNanoContract.ncId);
  const { feeTokens, loading: feeTokensLoading } = useFeeTokens();

  const [ncId, setNcId] = useState<string>(latestInitializedNcId || '');
  const [feeToken, setFeeToken] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [contractPaysFees, setContractPaysFees] = useState<boolean>(false);
  const [htrWithdrawAmount, setHtrWithdrawAmount] = useState<string>('1');
  const [pushTx, setPushTx] = useState<boolean>(false);
  const { testWallet, network, derivedAddress: changeAddress, requirements } = useNanoStageWallet(addressIndex);

  useEffect(() => {
    if (latestInitializedNcId) setNcId(latestInitializedNcId);
  }, [latestInitializedNcId]);

  // Auto-select the first fee token
  useEffect(() => {
    if (feeTokens.length > 0 && !feeToken) setFeeToken(feeTokens[0].uid);
  }, [feeTokens, feeToken]);

  const getBalance = useMemo(() => {
    const instance = testWallet?.instance;
    if (!instance) return undefined;
    return async (uid: string): Promise<bigint> => {
      const bal: Array<{ balance?: { unlocked?: bigint } }> = await instance.getBalance(uid);
      return bal?.[0]?.balance?.unlocked ?? 0n;
    };
  }, [testWallet]);

  // Fill the amount with the full token balance once a fee token is selected
  useEffect(() => {
    if (!feeToken || !getBalance || amount) return;
    getBalance(feeToken)
      .then((unlocked) => {
        if (unlocked > 0n) setAmount(unlocked.toString());
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeToken, getBalance]);

  // Save form state to Redux (prepopulates Withdraw fee token).
  useEffect(() => {
    dispatch(setFeeDepositFormData({ ncId, amount, token: feeToken, addressIndex }));
  }, [ncId, amount, feeToken, addressIndex, dispatch]);

  // Values an automatic flow run filled in.
  useFlowPrefill('rpc-fee-deposit', (v) => {
    setNcId(str(v, 'ncId') ?? ncId);
    setFeeToken(str(v, 'feeToken') ?? feeToken);
    setAmount(str(v, 'amount') ?? amount);
    setAddressIndex(num(v, 'addressIndex') ?? addressIndex);
    setContractPaysFees(bool(v, 'contractPaysFees') ?? contractPaysFees);
    setHtrWithdrawAmount(str(v, 'htrWithdrawAmount') ?? htrWithdrawAmount);
    setPushTx(bool(v, 'pushTx') ?? pushTx);
  });

  const liveRequest = useMemo(
    () =>
      buildFeeDepositRequest({
        ncId: ncId || '<nc_id>',
        feeToken: feeToken || '<fee_token>',
        amount: amount || '<amount>',
        changeAddress: changeAddress || '<change_address>',
        pushTx,
        contractPaysFees,
        htrWithdrawAmount: htrWithdrawAmount || '<htr_amount>',
      }),
    [ncId, feeToken, amount, changeAddress, pushTx, contractPaysFees, htrWithdrawAmount]
  );

  const { isDryRun, execute } = useNanoRpcExecute({
    request: setFeeDepositRequest,
    response: (response, duration) => setFeeDepositResponse({ response, duration }),
    error: setFeeDepositError,
  });

  const handleExecute = async () => {
    if (!ncId) throw new Error('Enter a nano contract ID');
    return execute(
      (h) => h.getRpcFeeDeposit(ncId, feeToken, amount, changeAddress, pushTx, contractPaysFees, htrWithdrawAmount),
      liveRequest
    );
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-fee-deposit"
        title="Deposit fee token"
        description="Deposit a fee-based token into the fee nano contract."
        method="htr_sendNanoContractTx"
        actions={<StartFlowButton flow={FEE_FLOW} label="Run the fee flow" />}
      />
      <PreconditionStrip requirements={requirements} />
      <RpcFeeDepositCard
        onExecute={handleExecute}
        liveRequest={liveRequest}
        methodData={methodDataOf(feeDepositData)}
        isDryRun={isDryRun}
        disabledReason={firstUnmetReason(requirements) ?? (ncId ? null : 'Enter a nano contract ID')}
        network={network}
        ncId={ncId}
        setNcId={setNcId}
        latestInitializedNcId={latestInitializedNcId}
        feeToken={feeToken}
        setFeeToken={setFeeToken}
        amount={amount}
        setAmount={setAmount}
        changeAddress={changeAddress}
        addressIndex={addressIndex}
        setAddressIndex={setAddressIndex}
        contractPaysFees={contractPaysFees}
        setContractPaysFees={setContractPaysFees}
        htrWithdrawAmount={htrWithdrawAmount}
        setHtrWithdrawAmount={setHtrWithdrawAmount}
        pushTx={pushTx}
        setPushTx={setPushTx}
        feeTokens={feeTokens}
        feeTokensLoading={feeTokensLoading}
        getBalance={getBalance}
      />
    </div>
  );
};
