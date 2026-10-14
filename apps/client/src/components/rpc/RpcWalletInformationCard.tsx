/**
 * RPC Wallet Information Card — htr_getWalletInformation.
 */

import React from 'react';
import type { MethodData } from '../common/MethodCard';
import { RpcMethodCard } from './RpcMethodCard';
import { Identifier } from '../common/Identifier';
import { ResponseFields } from './ResponseFields';
import { unwrapResponse, WALLET_INFORMATION_REQUEST } from '../../utils/rpcCoreRequests';

export interface RpcWalletInformationCardProps {
  onExecute: () => Promise<unknown>;
  methodData: MethodData | null;
  isDryRun: boolean;
  disabledReason?: string | null;
}

export const RpcWalletInformationCard: React.FC<RpcWalletInformationCardProps> = ({
  onExecute,
  methodData,
  isDryRun,
  disabledReason = null,
}) => (
  <RpcMethodCard
    title="Get wallet information"
    description="The wallet's network and first address (address0)."
    liveRequest={WALLET_INFORMATION_REQUEST}
    methodData={methodData}
    isDryRun={isDryRun}
    onExecute={onExecute}
    disabledReason={disabledReason}
    successToast="Wallet information received"
    renderResponse={(response) => {
      const info = unwrapResponse<{ network?: string; address0?: string }>(response);
      return (
        <ResponseFields
          fields={[
            { label: 'Network', value: info?.network && <span className="font-mono text-data">{info.network}</span> },
            { label: 'Address 0', value: info?.address0 && <Identifier value={info.address0} kind="address" /> },
          ]}
        />
      );
    }}
  >
    <p className="m-0 text-body text-ink-muted">No parameters besides the network.</p>
  </RpcMethodCard>
);
