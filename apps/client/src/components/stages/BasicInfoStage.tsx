/**
 * Basic Information Stage
 *
 * Tests htr_getWalletInformation and htr_getConnectedNetwork.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import {
  setWalletInformationError,
  setWalletInformationRequest,
  setWalletInformationResponse,
} from '../../store/slices/walletInformationSlice';
import {
  setConnectedNetworkError,
  setConnectedNetworkRequest,
  setConnectedNetworkResponse,
} from '../../store/slices/connectedNetworkSlice';
import { RpcWalletInformationCard } from '../rpc/RpcWalletInformationCard';
import { RpcConnectedNetworkCard } from '../rpc/RpcConnectedNetworkCard';
import { CONNECTED_NETWORK_REQUEST, WALLET_INFORMATION_REQUEST } from '../../utils/rpcCoreRequests';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { useRequireRpcSession } from '../../hooks/useRequirements';
import { toMethodData, useRpcStageCall } from '../../hooks/useRpcStageCall';
import { firstUnmetReason } from '../../utils/requirements';
import { StartFlowButton } from '../flows/StartFlowButton';
import { RPC_FLOW } from '../../flows';

const WALLET_INFORMATION_ACTIONS = {
  setRequest: setWalletInformationRequest,
  setResponse: setWalletInformationResponse,
  setError: setWalletInformationError,
};

const CONNECTED_NETWORK_ACTIONS = {
  setRequest: setConnectedNetworkRequest,
  setResponse: setConnectedNetworkResponse,
  setError: setConnectedNetworkError,
};

export const BasicInfoStage: React.FC = () => {
  const rpcSession = useRequireRpcSession();
  const walletInformation = useRpcStageCall(WALLET_INFORMATION_ACTIONS);
  const connectedNetwork = useRpcStageCall(CONNECTED_NETWORK_ACTIONS);
  const walletInformationData = useSelector((state: RootState) => state.walletInformation);
  const connectedNetworkData = useSelector((state: RootState) => state.connectedNetwork);
  const disabledReason = firstUnmetReason([rpcSession]);

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-basic-info"
        description="Read the wallet's network, first address and genesis hash."
        actions={<StartFlowButton flow={RPC_FLOW} label="Run the RPC flow" />}
      />
      <PreconditionStrip requirements={[rpcSession]} />
      <RpcWalletInformationCard
        onExecute={() => walletInformation.execute((h) => h.getRpcWalletInformation(), WALLET_INFORMATION_REQUEST)}
        methodData={toMethodData(walletInformationData)}
        isDryRun={walletInformation.isDryRun}
        disabledReason={disabledReason}
      />
      <RpcConnectedNetworkCard
        onExecute={() => connectedNetwork.execute((h) => h.getRpcConnectedNetwork(), CONNECTED_NETWORK_REQUEST)}
        methodData={toMethodData(connectedNetworkData)}
        isDryRun={connectedNetwork.isDryRun}
        disabledReason={disabledReason}
      />
    </div>
  );
};
