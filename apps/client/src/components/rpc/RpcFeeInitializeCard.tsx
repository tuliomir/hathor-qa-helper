/**
 * RPC Fee Initialize Card
 *
 * Compose/Inspect card for htr_sendNanoContractTx (fee contract initialize).
 */

import React from 'react';
import { MethodCard, type MethodData } from '../common/MethodCard';
import { AmountInput } from '../common/AmountInput';
import { nanoTxHash } from '../../utils/nanoRpcRequests';
import type { NetworkKey } from '../../constants/network';
import { AddressIndexField, BlueprintIdField, DerivedValues, NanoResponse, PushTxToggle } from './NanoFields';

export interface RpcFeeInitializeCardProps {
  onExecute: () => Promise<unknown>;
  liveRequest: { method: string; params: unknown };
  methodData: MethodData;
  isDryRun: boolean;
  disabledReason: string | null;
  /** Network of the test wallet; picks the explorer. */
  network: NetworkKey;
  blueprintId: string;
  setBlueprintId: (value: string) => void;
  /** HTR base units. */
  amount: string;
  setAmount: (value: string) => void;
  changeAddress: string;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
}

export const RpcFeeInitializeCard: React.FC<RpcFeeInitializeCardProps> = ({
  onExecute,
  liveRequest,
  methodData,
  isDryRun,
  disabledReason,
  network,
  blueprintId,
  setBlueprintId,
  amount,
  setAmount,
  changeAddress,
  addressIndex,
  setAddressIndex,
  pushTx,
  setPushTx,
}) => (
  <MethodCard
    title="Initialize fee"
    description="Create a fee nano contract funded with an HTR deposit."
    liveRequest={liveRequest}
    methodData={methodData}
    isDryRun={isDryRun}
    onExecute={onExecute}
    disabledReason={disabledReason}
    isMainnet={false}
    getTxHash={nanoTxHash}
    explorerNetwork={network}
    renderResponse={(r) => <NanoResponse response={r} network={network} creates />}
    successToast={pushTx ? 'Fee contract initialized' : 'Fee transaction built'}
  >
    <BlueprintIdField
      value={blueprintId}
      onChange={setBlueprintId}
      network={network}
      hint="Prefilled with the QA fee blueprint for this network."
    />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AmountInput
        value={amount}
        onChange={setAmount}
        label="HTR deposit"
        hint="Deposited into the contract when it is created."
      />
      <AddressIndexField
        label="Change address index"
        hint="Test wallet address that receives the change."
        value={addressIndex}
        onChange={setAddressIndex}
      />
    </div>
    <PushTxToggle checked={pushTx} onChange={setPushTx} />
    <DerivedValues
      id="fee-init-derived"
      rows={[
        {
          label: `Change address (index ${addressIndex})`,
          value: changeAddress,
          kind: 'address',
          pending: 'Start the test wallet to derive it.',
        },
      ]}
    />
  </MethodCard>
);
