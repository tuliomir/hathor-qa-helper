/**
 * Bet Initialize Stage
 *
 * Tests htr_sendNanoContractTx (initialize) RPC call with Redux state persistence
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setBetInitializeError,
  setBetInitializeRequest,
  setBetInitializeResponse,
} from '../../store/slices/betInitializeSlice';
import { setBetNanoContractId } from '../../store/slices/betNanoContractSlice';
import { RpcBetInitializeCard } from '../rpc/RpcBetInitializeCard';
import { type TokenOption } from '../rpc/NanoFields';
import { BlueprintUnavailable } from '../common/BlueprintUnavailable';
import { StageHeader } from '../common/StageHeader';
import { StartFlowButton } from '../flows/StartFlowButton';
import { BET_FLOW } from '../../flows';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { NETWORK_CONFIG, type NetworkKey } from '../../constants/network';
import { blueprintIdFor } from '../../utils/blueprints';
import { defaultBetDeadline, getOracleBuffer } from '../../utils/betHelpers';
import { buildInitializeBetRequest, nanoTxHash } from '../../utils/nanoRpcRequests';
import { firstUnmetReason } from '../../utils/requirements';
import { methodDataOf, useNanoRpcExecute, useNanoStageWallet } from '../../hooks/useNanoRpcStage';
import { useAddressOnlyTokens } from '../../hooks/useAddressOnlyTokens';
import { bool, num, str, useFlowPrefill } from '../../hooks/useFlowPrefill';
import { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

/** The handler's oracle script; a placeholder for the no-session dry run when it can't be derived. */
function oracleScriptOrPlaceholder(address: string, network: NetworkKey): string {
  if (!address.trim()) return '<oracle_script>';
  try {
    return getOracleBuffer(address, network);
  } catch {
    return '<oracle_script>';
  }
}

const HTR: TokenOption = {
  uid: NATIVE_TOKEN_UID,
  symbol: DEFAULT_NATIVE_TOKEN_CONFIG.symbol,
  name: DEFAULT_NATIVE_TOKEN_CONFIG.name,
};

export const BetInitializeStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const betInitializeData = useSelector((state: RootState) => state.betInitialize);
  const allTokens = useSelector((state: RootState) => state.tokens.tokens);

  const [addressIndex, setAddressIndex] = useState<number>(0);
  const { testWallet, network, derivedAddress: oracleAddress, requirements } = useNanoStageWallet(addressIndex);

  // QA blueprints exist only on some networks; the RPC session's chain decides.
  const defaultBlueprintId = blueprintIdFor(network, 'bet');
  const [blueprintId, setBlueprintId] = useState<string>(defaultBlueprintId ?? '');
  useEffect(() => {
    if (defaultBlueprintId) setBlueprintId(defaultBlueprintId);
  }, [defaultBlueprintId]);
  const [token, setToken] = useState<string>(NATIVE_TOKEN_UID);
  const [deadline, setDeadline] = useState<string>(() => defaultBetDeadline());
  const [pushTx, setPushTx] = useState<boolean>(false);

  // Tokens the test wallet holds (a deposit follows the initialize); HTR as fallback.
  // An address-only wallet can't check balances, so all its added tokens are offered.
  const addressOnlyTokens = useAddressOnlyTokens();
  const [walletTokens, setWalletTokens] = useState<TokenOption[]>([HTR]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (addressOnlyTokens) {
        setWalletTokens([HTR, ...addressOnlyTokens]);
        return;
      }
      const instance = testWallet?.instance;
      if (!instance) {
        setWalletTokens([HTR]);
        return;
      }
      const tokens: TokenOption[] = [];
      try {
        const htrBal = await instance.getBalance(NATIVE_TOKEN_UID);
        if (htrBal?.[0]?.balance?.unlocked > 0n) tokens.push(HTR);
      } catch {
        tokens.push(HTR);
      }
      for (const uid of testWallet.tokenUids ?? []) {
        if (uid === NATIVE_TOKEN_UID) continue;
        const info = allTokens.find((t) => t.uid === uid);
        if (!info) continue;
        try {
          const bal = await instance.getBalance(uid);
          if (bal?.[0]?.balance?.unlocked > 0n) tokens.push({ uid: info.uid, symbol: info.symbol, name: info.name });
        } catch {
          /* skip tokens that fail the balance check */
        }
      }
      if (!cancelled) setWalletTokens(tokens);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [testWallet, allTokens, addressOnlyTokens]);

  // Values an automatic flow run filled in.
  useFlowPrefill('rpc-bet-initialize', (v) => {
    setBlueprintId(str(v, 'blueprintId') ?? blueprintId);
    setToken(str(v, 'token') ?? token);
    setDeadline(str(v, 'deadline') ?? deadline);
    setAddressIndex(num(v, 'addressIndex') ?? addressIndex);
    setPushTx(bool(v, 'pushTx') ?? pushTx);
  });

  const { isDryRun, execute } = useNanoRpcExecute({
    request: setBetInitializeRequest,
    response: (response, duration) => setBetInitializeResponse({ response, duration }),
    error: setBetInitializeError,
  });

  const handleExecute = async () => {
    const deadlineDate = new Date(deadline);
    const response = await execute(
      (h) => h.getRpcInitializeBet(blueprintId, oracleAddress, token, deadlineDate, pushTx, network),
      buildInitializeBetRequest({
        blueprintId,
        oracleScript: oracleScriptOrPlaceholder(oracleAddress, network),
        token,
        timestamp: Math.floor(deadlineDate.getTime() / 1000),
        pushTx,
      })
    );
    // Store the nano contract ID for the other bet stages.
    const ncId = nanoTxHash(response);
    if (ncId) dispatch(setBetNanoContractId({ ncId, blueprintId, token }));
    return response;
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-bet-initialize"
        title="Initialize bet"
        description="Create a bet nano contract with an oracle, a token and a deadline."
        method="htr_sendNanoContractTx"
        actions={<StartFlowButton flow={BET_FLOW} label="Run the bet flow" />}
      />
      <PreconditionStrip requirements={requirements} />
      {defaultBlueprintId === null ? (
        <BlueprintUnavailable
          kind="Bet"
          networkLabel={NETWORK_CONFIG[network].label}
          switchWhat="WalletConnect session"
        />
      ) : (
        <RpcBetInitializeCard
          onExecute={handleExecute}
          methodData={methodDataOf(betInitializeData)}
          isDryRun={isDryRun}
          disabledReason={firstUnmetReason(requirements)}
          network={network}
          blueprintId={blueprintId}
          setBlueprintId={setBlueprintId}
          oracleAddress={oracleAddress}
          token={token}
          setToken={setToken}
          deadline={deadline}
          setDeadline={setDeadline}
          pushTx={pushTx}
          setPushTx={setPushTx}
          addressIndex={addressIndex}
          setAddressIndex={setAddressIndex}
          tokens={walletTokens}
        />
      )}
    </div>
  );
};
