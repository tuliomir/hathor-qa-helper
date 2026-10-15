/**
 * Bet Deposit Stage
 *
 * Tests htr_sendNanoContractTx (bet/deposit) RPC call with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setBetDepositError,
  setBetDepositFormData,
  setBetDepositRequest,
  setBetDepositResponse,
} from '../../store/slices/betDepositSlice';
import { RpcBetDepositCard } from '../rpc/RpcBetDepositCard';
import type { TokenOption } from '../rpc/NanoFields';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { buildBetDepositRequest } from '../../utils/nanoRpcRequests';
import { firstUnmetReason } from '../../utils/requirements';
import { methodDataOf, useNanoRpcExecute, useNanoStageWallet } from '../../hooks/useNanoRpcStage';
import { useAddressOnlyTokens } from '../../hooks/useAddressOnlyTokens';
import { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

export const BetDepositStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const betDepositData = useSelector((state: RootState) => state.betDeposit);
  const betNanoContract = useSelector((state: RootState) => state.betNanoContract);
  const allTokens = useSelector((state: RootState) => state.tokens.tokens);
  const latestInitializedNcId = betNanoContract.ncId;
  const initialToken = betNanoContract.token;

  const [ncId, setNcId] = useState<string>(latestInitializedNcId || '');
  const [betChoice, setBetChoice] = useState<string>('Result_1');
  const [amount, setAmount] = useState<string>('1');
  const [token, setToken] = useState<string>(initialToken || NATIVE_TOKEN_UID);
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [pushTx, setPushTx] = useState<boolean>(false);
  const { testWallet, network, derivedAddress: address, requirements } = useNanoStageWallet(addressIndex);

  useEffect(() => {
    if (latestInitializedNcId) setNcId(latestInitializedNcId);
  }, [latestInitializedNcId]);

  useEffect(() => {
    if (initialToken) setToken(initialToken);
  }, [initialToken]);

  // Save form state to Redux (prepopulates Withdraw prize).
  useEffect(() => {
    dispatch(setBetDepositFormData({ ncId, amount, token, addressIndex }));
  }, [ncId, amount, token, addressIndex, dispatch]);

  const addressOnlyTokens = useAddressOnlyTokens();

  // HTR plus the test wallet's custom tokens that the token registry knows,
  // or those added by hand to an address-only wallet.
  const walletTokens = useMemo<TokenOption[]>(() => {
    const htr = {
      uid: NATIVE_TOKEN_UID,
      symbol: DEFAULT_NATIVE_TOKEN_CONFIG.symbol,
      name: DEFAULT_NATIVE_TOKEN_CONFIG.name,
    };
    if (addressOnlyTokens) return [htr, ...addressOnlyTokens];
    const custom = (testWallet?.tokenUids ?? [])
      .filter((uid) => uid !== NATIVE_TOKEN_UID)
      .map((uid) => allTokens.find((t) => t.uid === uid))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map((t) => ({ uid: t.uid, symbol: t.symbol, name: t.name }));
    return [htr, ...custom];
  }, [testWallet, allTokens, addressOnlyTokens]);

  const amountNum = parseFloat(amount) || 0;
  const liveRequest = useMemo(
    () =>
      buildBetDepositRequest({
        ncId: ncId || '<nc_id>',
        betChoice: betChoice || '<bet_choice>',
        amount: amountNum,
        address: address || '<address>',
        token: token || '<token>',
        pushTx,
      }),
    [ncId, betChoice, amountNum, address, token, pushTx]
  );

  const { isDryRun, execute } = useNanoRpcExecute({
    request: setBetDepositRequest,
    response: (response, duration) => setBetDepositResponse({ response, duration, betChoice }),
    error: setBetDepositError,
  });

  const handleExecute = async () => {
    if (!ncId) throw new Error('Enter a nano contract ID');
    return execute((h) => h.getRpcBetDeposit(ncId, betChoice, amountNum, address, token, pushTx), liveRequest);
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-bet-deposit"
        title="Place bet"
        description="Place a bet on an existing bet nano contract."
        method="htr_sendNanoContractTx"
      />
      <PreconditionStrip requirements={requirements} />
      <RpcBetDepositCard
        onExecute={handleExecute}
        liveRequest={liveRequest}
        methodData={methodDataOf(betDepositData)}
        isDryRun={isDryRun}
        disabledReason={firstUnmetReason(requirements) ?? (ncId ? null : 'Enter a nano contract ID')}
        network={network}
        ncId={ncId}
        setNcId={setNcId}
        latestInitializedNcId={latestInitializedNcId}
        betChoice={betChoice}
        setBetChoice={setBetChoice}
        amount={amount}
        setAmount={setAmount}
        address={address}
        addressIndex={addressIndex}
        setAddressIndex={setAddressIndex}
        token={token}
        setToken={setToken}
        initialToken={initialToken}
        pushTx={pushTx}
        setPushTx={setPushTx}
        tokens={walletTokens}
      />
    </div>
  );
};
