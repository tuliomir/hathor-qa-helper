/**
 * RPC Fee Deposit Card
 *
 * Compose/Inspect card for htr_sendNanoContractTx (deposit a fee token).
 */

import React from 'react';
import type { MethodData } from '../common/MethodCard';
import { RpcMethodCard } from './RpcMethodCard';
import { AmountInput } from '../common/AmountInput';
import { nanoTxHash } from '../../utils/nanoRpcRequests';
import type { NetworkKey } from '../../constants/network';
import {
  AddressIndexField,
  ContractPaysFeesFields,
  DerivedValues,
  NanoResponse,
  NcIdField,
  PushTxToggle,
  TokenSelectField,
  type TokenOption,
} from './NanoFields';

export interface RpcFeeDepositCardProps {
  onExecute: () => Promise<unknown>;
  liveRequest: { method: string; params: unknown };
  methodData: MethodData;
  isDryRun: boolean;
  disabledReason: string | null;
  network: NetworkKey;
  ncId: string;
  setNcId: (value: string) => void;
  latestInitializedNcId: string | null;
  feeToken: string;
  setFeeToken: (value: string) => void;
  /** Base units. */
  amount: string;
  setAmount: (value: string) => void;
  changeAddress: string;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  contractPaysFees: boolean;
  setContractPaysFees: (value: boolean) => void;
  htrWithdrawAmount: string;
  setHtrWithdrawAmount: (value: string) => void;
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
  feeTokens: TokenOption[];
  feeTokensLoading: boolean;
  /** Unlocked balance of a token (base units), for the Max button. */
  getBalance?: (uid: string) => Promise<bigint>;
}

export const RpcFeeDepositCard: React.FC<RpcFeeDepositCardProps> = ({
  onExecute,
  liveRequest,
  methodData,
  isDryRun,
  disabledReason,
  network,
  ncId,
  setNcId,
  latestInitializedNcId,
  feeToken,
  setFeeToken,
  amount,
  setAmount,
  changeAddress,
  addressIndex,
  setAddressIndex,
  contractPaysFees,
  setContractPaysFees,
  htrWithdrawAmount,
  setHtrWithdrawAmount,
  pushTx,
  setPushTx,
  feeTokens,
  feeTokensLoading,
  getBalance,
}) => {
  const tokenInfo = feeTokens.find((t) => t.uid === feeToken);
  return (
    <RpcMethodCard
      title="Deposit fee token"
      description="Deposit a fee-based token into a fee nano contract."
      liveRequest={liveRequest}
      methodData={methodData}
      isDryRun={isDryRun}
      onExecute={onExecute}
      disabledReason={disabledReason}
      getTxHash={nanoTxHash}
      explorerNetwork={network}
      renderResponse={(r) => <NanoResponse response={r} network={network} />}
      successToast={pushTx ? 'Fee token deposited' : 'Deposit transaction built'}
    >
      <NcIdField
        value={ncId}
        onChange={setNcId}
        latest={latestInitializedNcId}
        hint="Fee contract to deposit into. Use latest picks the one created in Initialize fee."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TokenSelectField
          label="Fee token"
          hint="Fee-based token held by the test wallet."
          value={feeToken}
          onChange={setFeeToken}
          tokens={feeTokens}
          loading={feeTokensLoading}
        />
        <AmountInput
          value={amount}
          onChange={setAmount}
          token={{ uid: feeToken, symbol: tokenInfo?.symbol ?? 'tokens' }}
          max={getBalance && feeToken ? () => getBalance(feeToken) : undefined}
          allowZero
        />
      </div>
      <AddressIndexField
        label="Change address index"
        hint="Test wallet address that receives the change."
        value={addressIndex}
        onChange={setAddressIndex}
      />
      <ContractPaysFeesFields
        checked={contractPaysFees}
        onChange={setContractPaysFees}
        htrAmount={htrWithdrawAmount}
        onHtrAmountChange={setHtrWithdrawAmount}
      />
      <PushTxToggle checked={pushTx} onChange={setPushTx} />
      <DerivedValues
        id="fee-deposit-derived"
        rows={[
          {
            label: `Change address (index ${addressIndex})`,
            value: changeAddress,
            kind: 'address',
            pending: 'Start the test wallet to derive it.',
          },
        ]}
      />
    </RpcMethodCard>
  );
};
