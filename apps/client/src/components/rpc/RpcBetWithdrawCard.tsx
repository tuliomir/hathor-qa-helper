/**
 * RPC Bet Withdraw Card
 *
 * Compose/Inspect card for htr_sendNanoContractTx (withdraw a bet prize).
 */

import React from 'react';
import { MethodCard, type MethodData } from '../common/MethodCard';
import { AmountInput } from '../common/AmountInput';
import { nanoTxHash } from '../../utils/nanoRpcRequests';
import type { NetworkKey } from '../../constants/network';
import { AddressIndexField, DerivedValues, NcIdField, PushTxToggle, TokenUidField, NanoResponse } from './NanoFields';

export interface RpcBetWithdrawCardProps {
  onExecute: () => Promise<unknown>;
  liveRequest: { method: string; params: unknown };
  methodData: MethodData;
  isDryRun: boolean;
  disabledReason: string | null;
  network: NetworkKey;
  ncId: string;
  setNcId: (value: string) => void;
  latestNcId: string | null;
  withdrawAddress: string;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  /** Base units. */
  amount: string;
  setAmount: (value: string) => void;
  token: string;
  setToken: (value: string) => void;
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
}

export const RpcBetWithdrawCard: React.FC<RpcBetWithdrawCardProps> = ({
  onExecute,
  liveRequest,
  methodData,
  isDryRun,
  disabledReason,
  network,
  ncId,
  setNcId,
  latestNcId,
  withdrawAddress,
  addressIndex,
  setAddressIndex,
  amount,
  setAmount,
  token,
  setToken,
  pushTx,
  setPushTx,
}) => (
  <MethodCard
    title="Withdraw prize"
    description="Withdraw the prize from a bet contract once its result is set."
    liveRequest={liveRequest}
    methodData={methodData}
    isDryRun={isDryRun}
    onExecute={onExecute}
    disabledReason={disabledReason}
    isMainnet={false}
    getTxHash={nanoTxHash}
    explorerNetwork={network}
    renderResponse={(r) => <NanoResponse response={r} network={network} />}
    successToast={pushTx ? 'Prize withdrawn' : 'Withdraw transaction built'}
  >
    <NcIdField
      value={ncId}
      onChange={setNcId}
      latest={latestNcId}
      hint="Bet contract to withdraw from. Use latest picks the one created in Initialize bet."
    />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TokenUidField value={token} onChange={setToken} hint="Token used for the bet; 00 is HTR." />
      <AmountInput
        value={amount}
        onChange={setAmount}
        token={{ uid: token, symbol: token === '00' ? 'HTR' : 'tokens' }}
        allowZero
      />
    </div>
    <AddressIndexField
      label="Withdrawal address index"
      hint="Test wallet address that receives the prize."
      value={addressIndex}
      onChange={setAddressIndex}
    />
    <PushTxToggle checked={pushTx} onChange={setPushTx} />
    <DerivedValues
      id="bet-withdraw-derived"
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
