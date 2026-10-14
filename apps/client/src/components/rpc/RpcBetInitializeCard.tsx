/**
 * RPC Bet Initialize Card
 *
 * Compose/Inspect card for htr_sendNanoContractTx (bet initialize).
 */

import React, { useMemo } from 'react';
import type { MethodData } from '../common/MethodCard';
import { RpcMethodCard } from './RpcMethodCard';
import { Field } from '../ui/Field';
import { DateTimePicker } from '../ui/datetime-picker';
import { getOracleBuffer } from '../../utils/betHelpers';
import { formatTimeUntil } from '../../utils/valuesUtils';
import { buildInitializeBetRequest, nanoTxHash } from '../../utils/nanoRpcRequests';
import type { NetworkKey } from '../../constants/network';
import {
  AddressIndexField,
  BlueprintIdField,
  DerivedValues,
  PushTxToggle,
  TokenSelectField,
  NanoResponse,
  type TokenOption,
} from './NanoFields';

export interface RpcBetInitializeCardProps {
  onExecute: () => Promise<unknown>;
  methodData: MethodData;
  isDryRun: boolean;
  disabledReason: string | null;
  /** Network of the test wallet: explorer links and the oracle script. */
  network: NetworkKey;
  blueprintId: string;
  setBlueprintId: (value: string) => void;
  oracleAddress: string;
  token: string;
  setToken: (value: string) => void;
  deadline: string;
  setDeadline: (value: string) => void;
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  tokens: TokenOption[];
}

/** Oracle script and deadline timestamp, as the request will carry them. */
function deriveIntermediates(oracleAddress: string, deadline: string, network: NetworkKey) {
  let oracleScript: string | null = null;
  let oracleError: string | undefined;
  if (oracleAddress.trim()) {
    try {
      oracleScript = getOracleBuffer(oracleAddress, network);
    } catch (error) {
      oracleError = error instanceof Error ? error.message : 'Invalid oracle address';
    }
  }
  const ms = deadline ? new Date(deadline).getTime() : NaN;
  const timestamp = Number.isNaN(ms) ? null : Math.floor(ms / 1000);
  return { oracleScript, oracleError, timestamp };
}

export const RpcBetInitializeCard: React.FC<RpcBetInitializeCardProps> = ({
  onExecute,
  methodData,
  isDryRun,
  disabledReason,
  network,
  blueprintId,
  setBlueprintId,
  oracleAddress,
  token,
  setToken,
  deadline,
  setDeadline,
  pushTx,
  setPushTx,
  addressIndex,
  setAddressIndex,
  tokens,
}) => {
  const { oracleScript, oracleError, timestamp } = deriveIntermediates(oracleAddress, deadline, network);

  const liveRequest = useMemo(
    () =>
      buildInitializeBetRequest({
        blueprintId: blueprintId || '<blueprint_id>',
        oracleScript: oracleScript || '<oracle_script>',
        token: token || '<token>',
        timestamp: timestamp ?? '<timestamp>',
        pushTx,
      }),
    [blueprintId, oracleScript, token, timestamp, pushTx]
  );

  const timeUntil = formatTimeUntil(deadline);

  return (
    <RpcMethodCard
      title="Initialize bet"
      description="Create a bet nano contract with an oracle, a token and a deadline."
      liveRequest={liveRequest}
      methodData={methodData}
      isDryRun={isDryRun}
      onExecute={onExecute}
      disabledReason={disabledReason}
      getTxHash={nanoTxHash}
      txExplorerPage="nc_detail"
      explorerNetwork={network}
      renderResponse={(r) => <NanoResponse response={r} network={network} creates />}
      successToast={pushTx ? 'Bet initialized' : 'Bet transaction built'}
    >
      <BlueprintIdField
        value={blueprintId}
        onChange={setBlueprintId}
        network={network}
        hint="Prefilled with the QA bet blueprint for this network."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AddressIndexField
          label="Oracle address index"
          hint="Test wallet address that acts as the oracle."
          value={addressIndex}
          onChange={setAddressIndex}
        />
        <TokenSelectField
          label="Token"
          hint="Token used to place bets."
          value={token}
          onChange={setToken}
          tokens={tokens}
        />
      </div>
      <Field
        label="Bet deadline"
        hint={timeUntil ? `Last time to place a bet; ${timeUntil} from now.` : 'Last time to place a bet.'}
        wireControl={false}
      >
        <DateTimePicker
          value={deadline ? new Date(deadline) : undefined}
          onChange={(date) => {
            // Same format the stage has always stored.
            if (date) setDeadline(date.toISOString().slice(0, 16));
          }}
          placeholder="Select bet deadline"
          granularity="minute"
          hourCycle={24}
        />
      </Field>
      <PushTxToggle checked={pushTx} onChange={setPushTx} />
      <DerivedValues
        id="bet-init-derived"
        rows={[
          {
            label: `Oracle address (index ${addressIndex})`,
            value: oracleAddress,
            kind: 'address',
            pending: 'Start the test wallet to derive it.',
          },
          {
            label: 'Oracle script',
            value: oracleScript,
            kind: 'text',
            pending: 'Derived from the oracle address.',
            error: oracleError,
          },
          { label: 'Deadline (unix)', value: timestamp, kind: 'text', pending: 'Pick a deadline.' },
        ]}
      />
    </RpcMethodCard>
  );
};
