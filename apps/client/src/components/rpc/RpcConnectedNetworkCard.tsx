/**
 * RPC Connected Network Card — htr_getConnectedNetwork.
 */

import React from 'react';
import { MethodCard, type MethodData } from '../common/MethodCard';
import { Identifier } from '../common/Identifier';
import { ResponseFields } from './ResponseFields';
import { CONNECTED_NETWORK_REQUEST, unwrapResponse } from '../../utils/rpcCoreRequests';

export interface RpcConnectedNetworkCardProps {
  onExecute: () => Promise<unknown>;
  methodData: MethodData | null;
  isDryRun: boolean;
  disabledReason?: string | null;
}

export const RpcConnectedNetworkCard: React.FC<RpcConnectedNetworkCardProps> = ({
  onExecute,
  methodData,
  isDryRun,
  disabledReason = null,
}) => (
  <MethodCard
    title="Get connected network"
    description="The network the wallet is connected to, with its genesis hash."
    liveRequest={CONNECTED_NETWORK_REQUEST}
    methodData={methodData}
    isDryRun={isDryRun}
    onExecute={onExecute}
    disabledReason={disabledReason}
    successToast="Connected network received"
    renderResponse={(response) => {
      const info = unwrapResponse<{ network?: string; genesisHash?: string }>(response);
      return (
        <ResponseFields
          fields={[
            { label: 'Network', value: info?.network && <span className="font-mono text-data">{info.network}</span> },
            {
              label: 'Genesis hash',
              value: info?.genesisHash ? (
                <Identifier value={info.genesisHash} kind="tx" />
              ) : (
                <span className="text-ink-muted">Empty string</span>
              ),
            },
          ]}
        />
      );
    }}
  >
    <p className="m-0 text-body text-ink-muted">No parameters besides the network.</p>
  </MethodCard>
);
