/**
 * RPC Get Address Card — htr_getAddress by type (first empty, index, client).
 */

import React from 'react';
import type { AddressRequestType } from '../../store/slices/getAddressSlice';
import { MethodCard, type MethodData } from '../common/MethodCard';
import { Identifier } from '../common/Identifier';
import { Field } from '../ui/Field';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ResponseFields } from './ResponseFields';
import { buildGetAddressRequest, unwrapResponse } from '../../utils/rpcCoreRequests';

const TYPE_OPTIONS = [
  { value: 'first_empty', label: 'First empty' },
  { value: 'index', label: 'By index' },
  { value: 'client', label: 'Client' },
] as const;

const TYPE_HINT: Record<AddressRequestType, string> = {
  first_empty: 'Returns the first unused address.',
  index: 'Returns the address at the given index.',
  client: 'The wallet decides which address to return.',
};

export interface RpcGetAddressCardProps {
  onExecute: () => Promise<unknown>;
  methodData: MethodData | null;
  isDryRun: boolean;
  disabledReason?: string | null;
  requestType: AddressRequestType;
  indexValue: number;
  onRequestTypeChange: (type: AddressRequestType) => void;
  onIndexValueChange: (index: number) => void;
  /** Address validation against the test wallet, below the response. */
  inspectExtra?: React.ReactNode;
}

export const RpcGetAddressCard: React.FC<RpcGetAddressCardProps> = ({
  onExecute,
  methodData,
  isDryRun,
  disabledReason = null,
  requestType,
  indexValue,
  onRequestTypeChange,
  onIndexValueChange,
  inspectExtra,
}) => (
  <MethodCard
    title="Get address"
    liveRequest={buildGetAddressRequest(requestType, indexValue)}
    methodData={methodData}
    isDryRun={isDryRun}
    onExecute={onExecute}
    disabledReason={disabledReason}
    successToast="Address received"
    inspectExtra={inspectExtra}
    renderResponse={(response) => {
      const info = unwrapResponse<{ address?: string; index?: number; addressPath?: string }>(response);
      return (
        <ResponseFields
          fields={[
            { label: 'Address', value: info?.address && <Identifier value={info.address} kind="address" /> },
            {
              label: 'Index',
              value: info?.index !== undefined && <span className="font-mono text-data">{info.index}</span>,
            },
            {
              label: 'Path',
              value: info?.addressPath && <span className="font-mono text-data">{info.addressPath}</span>,
            },
          ]}
        />
      );
    }}
  >
    <Field label="Address type" hint={TYPE_HINT[requestType]} wireControl={false}>
      <SegmentedControl
        aria-label="Address type"
        options={TYPE_OPTIONS}
        value={requestType}
        onChange={onRequestTypeChange}
      />
    </Field>
    {requestType === 'index' && (
      <Field label="Address index" hint="Starts at 0.">
        <input
          type="number"
          min="0"
          value={indexValue}
          onChange={(e) => onIndexValueChange(parseInt(e.target.value) || 0)}
          className="input w-40 font-mono"
        />
      </Field>
    )}
  </MethodCard>
);
