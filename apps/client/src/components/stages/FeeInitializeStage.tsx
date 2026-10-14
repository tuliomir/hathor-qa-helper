/**
 * Fee Initialize Stage
 *
 * Tests htr_sendNanoContractTx (initialize) RPC call with Redux state persistence
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setFeeInitializeError,
  setFeeInitializeRequest,
  setFeeInitializeResponse,
} from '../../store/slices/feeInitializeSlice';
import { setFeeNanoContractId } from '../../store/slices/feeNanoContractSlice';
import { RpcFeeInitializeCard } from '../rpc/RpcFeeInitializeCard';
import { BlueprintUnavailable } from '../common/BlueprintUnavailable';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { NETWORK_CONFIG } from '../../constants/network';
import { blueprintIdFor } from '../../utils/blueprints';
import { buildFeeInitializeRequest, nanoTxHash } from '../../utils/nanoRpcRequests';
import { firstUnmetReason } from '../../utils/requirements';
import { methodDataOf, useNanoRpcExecute, useNanoStageWallet } from '../../hooks/useNanoRpcStage';

export const FeeInitializeStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const feeInitializeData = useSelector((state: RootState) => state.feeInitialize);

  const [addressIndex, setAddressIndex] = useState<number>(0);
  const { network, derivedAddress: changeAddress, requirements } = useNanoStageWallet(addressIndex);

  // QA blueprints exist only on some networks; the test wallet's network decides.
  const defaultBlueprintId = blueprintIdFor(network, 'fee');
  const [blueprintId, setBlueprintId] = useState<string>(defaultBlueprintId ?? '');
  useEffect(() => {
    if (defaultBlueprintId) setBlueprintId(defaultBlueprintId);
  }, [defaultBlueprintId]);
  const [amount, setAmount] = useState<string>('2');
  const [pushTx, setPushTx] = useState<boolean>(false);

  const liveRequest = useMemo(
    () =>
      buildFeeInitializeRequest({
        blueprintId: blueprintId || '<blueprint_id>',
        amount: amount || '<amount>',
        changeAddress: changeAddress || '<change_address>',
        pushTx,
      }),
    [blueprintId, amount, changeAddress, pushTx]
  );

  const { isDryRun, execute } = useNanoRpcExecute({
    request: setFeeInitializeRequest,
    response: (response, duration) => setFeeInitializeResponse({ response, duration }),
    error: setFeeInitializeError,
  });

  const handleExecute = async () => {
    const response = await execute(
      (h) => h.getRpcFeeInitialize(blueprintId, amount, changeAddress, pushTx),
      liveRequest
    );
    // Store the nano contract ID for the other fee stages.
    const ncId = nanoTxHash(response);
    if (ncId) dispatch(setFeeNanoContractId({ ncId, blueprintId }));
    return response;
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-fee-initialize"
        title="Initialize fee"
        description="Create a fee nano contract funded with an HTR deposit."
        method="htr_sendNanoContractTx"
      />
      <PreconditionStrip requirements={requirements} />
      {defaultBlueprintId === null ? (
        <BlueprintUnavailable kind="Fee" networkLabel={NETWORK_CONFIG[network].label} switchWhat="test wallet" />
      ) : (
        <RpcFeeInitializeCard
          onExecute={handleExecute}
          liveRequest={liveRequest}
          methodData={methodDataOf(feeInitializeData)}
          isDryRun={isDryRun}
          disabledReason={firstUnmetReason(requirements)}
          network={network}
          blueprintId={blueprintId}
          setBlueprintId={setBlueprintId}
          amount={amount}
          setAmount={setAmount}
          changeAddress={changeAddress}
          addressIndex={addressIndex}
          setAddressIndex={setAddressIndex}
          pushTx={pushTx}
          setPushTx={setPushTx}
        />
      )}
    </div>
  );
};
