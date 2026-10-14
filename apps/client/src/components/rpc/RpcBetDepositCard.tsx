/**
 * RPC Bet Deposit Card
 *
 * Compose/Inspect card for htr_sendNanoContractTx (place a bet).
 */

import React from 'react';
import type { MethodData } from '../common/MethodCard';
import { RpcMethodCard } from './RpcMethodCard';
import { AmountInput } from '../common/AmountInput';
import { Field } from '../ui/Field';
import { nanoTxHash } from '../../utils/nanoRpcRequests';
import type { NetworkKey } from '../../constants/network';
import {
  AddressIndexField,
  DerivedValues,
  NcIdField,
  PushTxToggle,
  TokenSelectField,
  NanoResponse,
  type TokenOption,
} from './NanoFields';

export interface RpcBetDepositCardProps {
  onExecute: () => Promise<unknown>;
  liveRequest: { method: string; params: unknown };
  methodData: MethodData;
  isDryRun: boolean;
  disabledReason: string | null;
  network: NetworkKey;
  ncId: string;
  setNcId: (value: string) => void;
  /** The latest NC ID from the Initialize stage. */
  latestInitializedNcId: string | null;
  betChoice: string;
  setBetChoice: (value: string) => void;
  /** Base units. */
  amount: string;
  setAmount: (value: string) => void;
  address: string;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  token: string;
  setToken: (value: string) => void;
  /** Token the contract was initialized with. */
  initialToken: string | null;
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
  tokens: TokenOption[];
}

export const RpcBetDepositCard: React.FC<RpcBetDepositCardProps> = ({
  onExecute,
  liveRequest,
  methodData,
  isDryRun,
  disabledReason,
  network,
  ncId,
  setNcId,
  latestInitializedNcId,
  betChoice,
  setBetChoice,
  amount,
  setAmount,
  address,
  addressIndex,
  setAddressIndex,
  token,
  setToken,
  initialToken,
  pushTx,
  setPushTx,
  tokens,
}) => {
  const tokenMismatch = !!initialToken && !!token && token.toLowerCase() !== initialToken.toLowerCase();
  const tokenInfo = tokens.find((t) => t.uid === token);

  return (
    <RpcMethodCard
      title="Place bet"
      description="Deposit tokens on a result of an existing bet contract."
      liveRequest={liveRequest}
      methodData={methodData}
      isDryRun={isDryRun}
      onExecute={onExecute}
      disabledReason={disabledReason}
      getTxHash={nanoTxHash}
      explorerNetwork={network}
      renderResponse={(r) => <NanoResponse response={r} network={network} />}
      successToast={pushTx ? 'Bet placed' : 'Bet transaction built'}
    >
      <NcIdField
        value={ncId}
        onChange={setNcId}
        latest={latestInitializedNcId}
        hint="Bet contract to place the bet on. Use latest picks the one created in Initialize bet."
      />
      <Field label="Bet choice" hint="The result you bet on.">
        <input
          type="text"
          className="input w-full"
          value={betChoice}
          onChange={(e) => setBetChoice(e.target.value)}
          placeholder="Result_1"
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TokenSelectField
          label="Token"
          hint="Token used to place the bet."
          warning={
            tokenMismatch ? `Differs from the token the contract was initialized with (${initialToken}).` : undefined
          }
          value={token}
          onChange={setToken}
          tokens={tokens}
        />
        <AmountInput
          value={amount}
          onChange={setAmount}
          token={{ uid: token, symbol: tokenInfo?.symbol ?? 'tokens' }}
          allowZero
        />
      </div>
      <AddressIndexField
        label="Bet address index"
        hint="Test wallet address that places the bet and receives change."
        value={addressIndex}
        onChange={setAddressIndex}
      />
      <PushTxToggle checked={pushTx} onChange={setPushTx} />
      <DerivedValues
        id="bet-deposit-derived"
        rows={[
          {
            label: `Bet address (index ${addressIndex})`,
            value: address,
            kind: 'address',
            pending: 'Start the test wallet to derive it.',
          },
        ]}
      />
    </RpcMethodCard>
  );
};
