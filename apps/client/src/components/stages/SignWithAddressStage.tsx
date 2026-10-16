/**
 * Sign with Address Stage
 *
 * Tests htr_signWithAddress.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import {
  setSignWithAddressError,
  setSignWithAddressRequest,
  setSignWithAddressResponse,
} from '../../store/slices/signWithAddressSlice';
import { RpcSignWithAddressCard } from '../rpc/RpcSignWithAddressCard';
import { RpcAddressMismatchCallout } from '../rpc/RpcAddressMismatchCallout';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { useRequireRpcSession } from '../../hooks/useRequirements';
import { toMethodData, useRpcStageCall } from '../../hooks/useRpcStageCall';
import { ADDRESS_MISMATCH_REASON, useRpcAddressMismatch } from '../../hooks/useRpcAddressMismatch';
import { firstUnmetReason } from '../../utils/requirements';
import { buildSignWithAddressRequest } from '../../utils/rpcCoreRequests';
import { StartFlowButton } from '../flows/StartFlowButton';
import { RPC_FLOW } from '../../flows';

const SIGN_WITH_ADDRESS_ACTIONS = {
  setRequest: setSignWithAddressRequest,
  setResponse: setSignWithAddressResponse,
  setError: setSignWithAddressError,
};

export const SignWithAddressStage: React.FC = () => {
  const rpcSession = useRequireRpcSession();
  const mismatch = useRpcAddressMismatch();
  const { isDryRun, execute } = useRpcStageCall(SIGN_WITH_ADDRESS_ACTIONS);
  const signWithAddressData = useSelector((state: RootState) => state.signWithAddress);

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-sign-with-address"
        description="Ask the wallet to sign a message with one of its addresses."
        method="htr_signWithAddress"
        actions={<StartFlowButton flow={RPC_FLOW} label="Run the RPC flow" />}
      />
      <PreconditionStrip requirements={[rpcSession]} />
      {mismatch && <RpcAddressMismatchCallout mismatch={mismatch} />}
      <RpcSignWithAddressCard
        onExecute={(message, addressIndex) =>
          execute(
            (h) => h.getRpcSignWithAddress(message, addressIndex),
            buildSignWithAddressRequest(message, addressIndex)
          )
        }
        methodData={toMethodData(signWithAddressData)}
        isDryRun={isDryRun}
        disabledReason={mismatch ? ADDRESS_MISMATCH_REASON : firstUnmetReason([rpcSession])}
      />
    </div>
  );
};
