/**
 * RPC Sign with Address Card — htr_signWithAddress.
 */

import React, { useState } from 'react';
import type { MethodData } from '../common/MethodCard';
import { RpcMethodCard } from './RpcMethodCard';
import { Identifier } from '../common/Identifier';
import CopyButton from '../common/CopyButton';
import { Field } from '../ui/Field';
import { ResponseFields } from './ResponseFields';
import { buildSignWithAddressRequest, unwrapResponse } from '../../utils/rpcCoreRequests';

interface SignatureResponse {
  message?: string;
  signature?: string;
  address?: { address?: string; index?: number; addressPath?: string };
}

export interface RpcSignWithAddressCardProps {
  onExecute: (message: string, addressIndex: number) => Promise<unknown>;
  methodData: MethodData | null;
  isDryRun: boolean;
  disabledReason?: string | null;
}

export const RpcSignWithAddressCard: React.FC<RpcSignWithAddressCardProps> = ({
  onExecute,
  methodData,
  isDryRun,
  disabledReason = null,
}) => {
  const [message, setMessage] = useState('Hello, Hathor!');
  const [addressIndex, setAddressIndex] = useState('0');
  const index = parseInt(addressIndex, 10);
  const indexError = isNaN(index) || index < 0 ? 'Enter a non-negative whole number.' : undefined;

  const handleExecute = () => {
    if (indexError) throw new Error('Address index must be a valid non-negative number');
    if (!message.trim()) throw new Error('Message cannot be empty');
    return onExecute(message, index);
  };

  return (
    <RpcMethodCard
      title="Sign message"
      liveRequest={buildSignWithAddressRequest(message, isNaN(index) ? 0 : index)}
      methodData={methodData}
      isDryRun={isDryRun}
      onExecute={handleExecute}
      disabledReason={disabledReason}
      successToast="Message signed"
      renderResponse={(response) => {
        const r = unwrapResponse<SignatureResponse>(response);
        if (!r?.signature) return undefined;
        return (
          <ResponseFields
            fields={[
              { label: 'Message', value: r.message && <span className="break-words">{r.message}</span> },
              {
                label: 'Signature',
                value: (
                  <span className="flex items-start gap-1">
                    <span className="min-w-0 font-mono text-data [overflow-wrap:anywhere]">{r.signature}</span>
                    <CopyButton text={r.signature} label="Copy signature" />
                  </span>
                ),
              },
              {
                label: 'Address',
                value: r.address?.address && <Identifier value={r.address.address} kind="address" />,
              },
              {
                label: 'Index',
                value: r.address?.index !== undefined && <span className="font-mono text-data">{r.address.index}</span>,
              },
              {
                label: 'Path',
                value: r.address?.addressPath && <span className="font-mono text-data">{r.address.addressPath}</span>,
              },
            ]}
          />
        );
      }}
    >
      <Field label="Message" required error={message.trim() ? undefined : 'The message cannot be empty.'}>
        <textarea
          className="textarea w-full font-mono text-data"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>
      <Field label="Address index" hint="Index of the wallet address that signs. Starts at 0." error={indexError}>
        <input
          type="number"
          min="0"
          className="input w-40 font-mono"
          value={addressIndex}
          onChange={(e) => setAddressIndex(e.target.value)}
        />
      </Field>
    </RpcMethodCard>
  );
};
