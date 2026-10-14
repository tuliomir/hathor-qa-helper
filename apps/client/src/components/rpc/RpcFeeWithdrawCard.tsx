/**
 * RPC Fee Withdraw Card
 *
 * Compose/Inspect card for htr_sendNanoContractTx (withdraw a fee token).
 */

import React from 'react';
import { MethodCard, type MethodData } from '../common/MethodCard';
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

export interface RpcFeeWithdrawCardProps {
  onExecute: () => Promise<unknown>;
  liveRequest: { method: string; params: unknown };
  methodData: MethodData;
  isDryRun: boolean;
  disabledReason: string | null;
  network: NetworkKey;
  ncId: string;
  setNcId: (value: string) => void;
  latestNcId: string | null;
  feeToken: string;
  setFeeToken: (value: string) => void;
  withdrawAddress: string;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  /** Base units. */
  amount: string;
  setAmount: (value: string) => void;
  contractPaysFees: boolean;
  setContractPaysFees: (value: boolean) => void;
  htrWithdrawAmount: string;
  setHtrWithdrawAmount: (value: string) => void;
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
  feeTokens: TokenOption[];
  feeTokensLoading: boolean;
}

export const RpcFeeWithdrawCard: React.FC<RpcFeeWithdrawCardProps> = ({
  onExecute,
  liveRequest,
  methodData,
  isDryRun,
  disabledReason,
  network,
  ncId,
  setNcId,
  latestNcId,
  feeToken,
  setFeeToken,
  withdrawAddress,
  addressIndex,
  setAddressIndex,
  amount,
  setAmount,
  contractPaysFees,
  setContractPaysFees,
  htrWithdrawAmount,
  setHtrWithdrawAmount,
  pushTx,
  setPushTx,
  feeTokens,
  feeTokensLoading,
}) => {
  const tokenInfo = feeTokens.find((t) => t.uid === feeToken);
  return (
    <MethodCard
      title="Withdraw fee token"
      description="Withdraw a fee-based token from a fee nano contract."
      liveRequest={liveRequest}
      methodData={methodData}
      isDryRun={isDryRun}
      onExecute={onExecute}
      disabledReason={disabledReason}
      isMainnet={false}
      getTxHash={nanoTxHash}
      explorerNetwork={network}
      renderResponse={(r) => <NanoResponse response={r} network={network} />}
      successToast={pushTx ? 'Fee token withdrawn' : 'Withdraw transaction built'}
    >
      <NcIdField
        value={ncId}
        onChange={setNcId}
        latest={latestNcId}
        hint="Fee contract to withdraw from. Use latest picks the one created in Initialize fee."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TokenSelectField
          label="Fee token"
          hint="Fee-based token to withdraw from the contract."
          value={feeToken}
          onChange={setFeeToken}
          tokens={feeTokens}
          loading={feeTokensLoading}
          placeholder="Select a fee token"
        />
        <AmountInput
          value={amount}
          onChange={setAmount}
          token={{ uid: feeToken, symbol: tokenInfo?.symbol ?? 'tokens' }}
          allowZero
        />
      </div>
      <AddressIndexField
        label="Withdrawal address index"
        hint="Test wallet address that receives the tokens."
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
        id="fee-withdraw-derived"
        rows={[
          {
            label: `Withdrawal address (index ${addressIndex})`,
            value: withdrawAddress,
            kind: 'address',
            pending: 'Start the test wallet to derive it.',
          },
        ]}
      />
    </MethodCard>
  );
};
