/**
 * RPC Set Bet Result Card
 *
 * Compose/Inspect card for htr_sendNanoContractTx (set_result, an oracle action).
 */

import React from 'react';
import { MethodCard, type MethodData } from '../common/MethodCard';
import { Field } from '../ui/Field';
import { nanoTxHash } from '../../utils/nanoRpcRequests';
import type { NetworkKey } from '../../constants/network';
import { AddressIndexField, DerivedValues, NcIdField, PushTxToggle, NanoResponse } from './NanoFields';

export interface RpcSetBetResultCardProps {
  onExecute: () => Promise<unknown>;
  liveRequest: { method: string; params: unknown };
  methodData: MethodData;
  isDryRun: boolean;
  disabledReason: string | null;
  network: NetworkKey;
  ncId: string;
  setNcId: (value: string) => void;
  latestNcId: string | null;
  oracleAddress: string;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  result: string;
  setResult: (value: string) => void;
  /** The choice from the Place bet stage. */
  depositedBetChoice: string | null;
  oracleSignature: string;
  setOracleSignature: (value: string) => void;
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
  onNavigateToSignOracleData: () => void;
}

export const RpcSetBetResultCard: React.FC<RpcSetBetResultCardProps> = ({
  onExecute,
  liveRequest,
  methodData,
  isDryRun,
  disabledReason,
  network,
  ncId,
  setNcId,
  latestNcId,
  oracleAddress,
  addressIndex,
  setAddressIndex,
  result,
  setResult,
  depositedBetChoice,
  oracleSignature,
  setOracleSignature,
  pushTx,
  setPushTx,
  onNavigateToSignOracleData,
}) => (
  <MethodCard
    title="Set bet result"
    description="Set the result of a bet contract, signed by its oracle."
    liveRequest={liveRequest}
    methodData={methodData}
    isDryRun={isDryRun}
    onExecute={onExecute}
    disabledReason={disabledReason}
    isMainnet={false}
    getTxHash={nanoTxHash}
    explorerNetwork={network}
    renderResponse={(r) => <NanoResponse response={r} network={network} />}
    successToast={pushTx ? 'Result set' : 'Result transaction built'}
  >
    <NcIdField
      value={ncId}
      onChange={setNcId}
      latest={latestNcId}
      hint="Bet contract to set the result for. Use latest picks the one created in Initialize bet."
    />
    <AddressIndexField
      label="Oracle address index"
      hint="Test wallet address that acts as the oracle."
      value={addressIndex}
      onChange={setAddressIndex}
    />
    <Field
      label="Result"
      hint={depositedBetChoice ? `Your bet in Place bet was ${depositedBetChoice}.` : 'The winning result.'}
      trailing={
        depositedBetChoice && depositedBetChoice !== result ? (
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setResult(depositedBetChoice)}>
            Use bet choice
          </button>
        ) : undefined
      }
    >
      <input
        type="text"
        className="input w-full"
        value={result}
        onChange={(e) => setResult(e.target.value)}
        placeholder="Result_1"
      />
    </Field>
    <Field
      label="Oracle signature"
      hint="Sign the result in Sign oracle data; it returns here with the signature filled in."
      trailing={
        <button type="button" className="btn btn-secondary btn-xs" onClick={onNavigateToSignOracleData}>
          Sign oracle data
        </button>
      }
    >
      <textarea
        className="textarea w-full font-mono text-data"
        rows={3}
        value={oracleSignature}
        onChange={(e) => setOracleSignature(e.target.value)}
        placeholder="Oracle signature (hex)"
        spellCheck={false}
      />
    </Field>
    <PushTxToggle checked={pushTx} onChange={setPushTx} />
    <DerivedValues
      id="set-result-derived"
      rows={[
        {
          label: `Oracle address (index ${addressIndex})`,
          value: oracleAddress,
          kind: 'address',
          pending: 'Start the test wallet to derive it.',
        },
      ]}
    />
  </MethodCard>
);
