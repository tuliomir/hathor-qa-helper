/**
 * Snap Fee Initialize Stage
 *
 * Tests htr_sendNanoContractTx (initialize) for the Fee nano contract via MetaMask Snap
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { useRequireSnap } from '../../hooks/useRequirements';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { AddressInput } from '../common/AddressInput';
import { Field } from '../ui/Field';
import { Callout } from '../ui/Callout';
import { firstUnmetReason } from '../../utils/requirements';
import { selectSnapAddress, setSnapFeeNc } from '../../store/slices/snapSlice';
import { parseSnapResponse, isSnapEnvelope, isTransactionLike } from '../../utils/snapResponseHelpers';
import { NETWORK_CONFIG } from '../../constants/network';
import { blueprintIdFor, snapNetworkKey } from '../../utils/blueprints';
import type { AppDispatch, RootState } from '../../store';

export const SnapFeeInitializeStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isDryRun, methodData, execute } = useSnapMethod('snapFeeInitialize');
  const snapRequirement = useRequireSnap();

  const snapAddress = useSelector(selectSnapAddress);

  // QA blueprints exist only on some networks; the snap's network decides.
  const snapNetwork = useSelector((state: RootState) => state.snap.network);
  const networkKey = snapNetworkKey(snapNetwork);
  const defaultBlueprintId = blueprintIdFor(networkKey, 'fee');
  const [blueprintId, setBlueprintId] = useState(defaultBlueprintId ?? '');
  useEffect(() => {
    if (defaultBlueprintId) setBlueprintId(defaultBlueprintId);
  }, [defaultBlueprintId]);
  const [htrAmount, setHtrAmount] = useState('2');
  const [changeAddress, setChangeAddress] = useState(snapAddress ?? '');

  const params = useMemo(
    () => ({
      method: 'initialize',
      blueprint_id: blueprintId,
      actions: [{ type: 'deposit', token: '00', amount: htrAmount, changeAddress }],
      args: [],
      nc_id: null,
    }),
    [blueprintId, htrAmount, changeAddress]
  );

  const liveRequest = useMemo(() => ({ method: 'htr_sendNanoContractTx', params }), [params]);

  const handleExecute = async () => {
    const result = await execute((h) => h.sendNanoContractTx(params));
    const parsed = parseSnapResponse(result.response);
    const inner = isSnapEnvelope(parsed) ? (parsed as { response: unknown }).response : parsed;
    if (inner && typeof inner === 'object' && isTransactionLike(inner)) {
      const hash = (inner as Record<string, unknown>).hash as string | undefined;
      if (hash) {
        dispatch(setSnapFeeNc({ ncId: hash }));
      }
    }
    return result;
  };

  const networkLabel = networkKey ? NETWORK_CONFIG[networkKey].label : (snapNetwork ?? 'this network');

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-fee-initialize"
        description="Create a Fee nano contract from the snap wallet with an HTR deposit."
        method="htr_sendNanoContractTx"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      {defaultBlueprintId === null && (
        <Callout tone="warning" title={`Fee blueprint not available on ${networkLabel}`} role="alert">
          The QA blueprints are deployed on Testnet only. Switch the snap to Testnet to use this stage.
        </Callout>
      )}

      {defaultBlueprintId !== null && (
        <SnapMethodCard
          title="Initialize fee"
          txExplorerPage="nc_detail"
          description="The new contract's ID is kept for the other Fee stages."
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
          disabledReason={firstUnmetReason([snapRequirement])}
        >
          <Field label="Blueprint ID">
            <input
              type="text"
              value={blueprintId}
              onChange={(e) => setBlueprintId(e.target.value)}
              placeholder="Fee blueprint ID"
              className="input w-full font-mono text-data"
            />
          </Field>
          <Field label="HTR amount" className="sm:max-w-60">
            <input
              type="text"
              inputMode="numeric"
              value={htrAmount}
              onChange={(e) => setHtrAmount(e.target.value)}
              placeholder="100"
              className="input w-full text-right font-mono text-data tabular-nums"
            />
          </Field>
          <AddressInput
            label="Change address"
            value={changeAddress}
            onChange={setChangeAddress}
            placeholder="Change address"
            suggestedValue={snapAddress ?? undefined}
            sources={['snap']}
          />
        </SnapMethodCard>
      )}
    </div>
  );
};
