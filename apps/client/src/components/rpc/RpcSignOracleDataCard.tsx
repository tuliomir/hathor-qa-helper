/**
 * RPC Sign Oracle Data Card — htr_signOracleData for a bet nano contract.
 */

import React from 'react';
import { MdArrowForward } from 'react-icons/md';
import type { MethodData } from '../common/MethodCard';
import { RpcMethodCard } from './RpcMethodCard';
import { Identifier } from '../common/Identifier';
import CopyButton from '../common/CopyButton';
import { Field } from '../ui/Field';
import { ResponseFields } from './ResponseFields';
import { buildSignOracleDataRequest, oracleSignatureOf, unwrapResponse } from '../../utils/rpcCoreRequests';

export interface RpcSignOracleDataCardProps {
  onExecute: () => Promise<unknown>;
  methodData: MethodData | null;
  isDryRun: boolean;
  disabledReason?: string | null;
  ncId: string;
  setNcId: (value: string) => void;
  latestNcId: string | null;
  oracleAddress: string;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  data: string;
  setData: (value: string) => void;
  /** Sends the signature to the Set bet result stage. */
  onSendToSetBetResult?: (signedData: string) => void;
}

export const RpcSignOracleDataCard: React.FC<RpcSignOracleDataCardProps> = ({
  onExecute,
  methodData,
  isDryRun,
  disabledReason = null,
  ncId,
  setNcId,
  latestNcId,
  oracleAddress,
  addressIndex,
  setAddressIndex,
  data,
  setData,
  onSendToSetBetResult,
}) => {
  const handleExecute = () => {
    if (!ncId.trim()) throw new Error('Enter a nano contract ID');
    if (!data.trim()) throw new Error('Enter the data to sign');
    return onExecute();
  };

  const signature = methodData?.response ? oracleSignatureOf(methodData.response) : null;

  return (
    <RpcMethodCard
      title="Sign oracle data"
      actionLabel="Sign data"
      liveRequest={buildSignOracleDataRequest(ncId, oracleAddress, data)}
      methodData={methodData}
      isDryRun={isDryRun}
      onExecute={handleExecute}
      disabledReason={disabledReason}
      successToast="Data signed"
      renderResponse={(response) => {
        const r = unwrapResponse<{ data?: string; oracle?: string }>(response);
        const sig = oracleSignatureOf(response);
        if (!r || (!sig && !r.oracle)) return undefined;
        return (
          <ResponseFields
            fields={[
              { label: 'Data', value: r.data && <span className="font-mono text-data">{r.data}</span> },
              { label: 'Oracle', value: r.oracle && <Identifier value={r.oracle} kind="address" /> },
              {
                label: 'Signature',
                value: sig && (
                  <span className="flex items-start gap-1">
                    <span className="min-w-0 font-mono text-data [overflow-wrap:anywhere]">{sig}</span>
                    <CopyButton text={sig} label="Copy signature" />
                  </span>
                ),
              },
            ]}
          />
        );
      }}
      inspectExtra={
        signature &&
        onSendToSetBetResult && (
          <div className="flex justify-end">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onSendToSetBetResult(signature)}>
              Use in Set bet result
              <MdArrowForward aria-hidden="true" />
            </button>
          </div>
        )
      }
    >
      <Field
        label="Nano contract ID"
        required
        hint={latestNcId ? undefined : 'Initialize a bet first to fill this from the latest contract.'}
        trailing={
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => latestNcId && setNcId(latestNcId)}
            disabled={!latestNcId}
            title={latestNcId ? 'Use the latest initialized bet' : 'No bet initialized yet'}
          >
            Latest bet
          </button>
        }
      >
        <input
          type="text"
          className="input w-full font-mono text-data"
          value={ncId}
          onChange={(e) => setNcId(e.target.value)}
          placeholder="Nano contract ID (64 hex)"
        />
      </Field>
      <Field label="Oracle address index" hint="Index of the test wallet address that acts as the oracle.">
        <input
          type="number"
          min="0"
          className="input w-40 font-mono"
          value={addressIndex}
          onChange={(e) => setAddressIndex(parseInt(e.target.value) || 0)}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-body font-medium">Oracle address</span>
        {oracleAddress ? (
          <Identifier value={oracleAddress} kind="address" />
        ) : (
          <span className="text-caption text-ink-muted">
            Start a test wallet to derive the address at index {addressIndex}.
          </span>
        )}
      </div>
      <Field label="Data to sign" required hint="The bet result, e.g. Result_1.">
        <input
          type="text"
          className="input w-full font-mono text-data"
          value={data}
          onChange={(e) => setData(e.target.value)}
          placeholder="Result_1"
        />
      </Field>
    </RpcMethodCard>
  );
};
