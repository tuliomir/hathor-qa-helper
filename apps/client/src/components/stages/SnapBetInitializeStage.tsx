/**
 * Snap Bet Initialize Stage
 *
 * Tests htr_sendNanoContractTx (initialize) for the Bet nano contract via MetaMask Snap
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
import { BlueprintUnavailable } from '../common/BlueprintUnavailable';
import { firstUnmetReason } from '../../utils/requirements';
import { selectSnapAddress, setSnapBetNc } from '../../store/slices/snapSlice';
import { parseSnapResponse, isSnapEnvelope, isTransactionLike } from '../../utils/snapResponseHelpers';
import { NETWORK_CONFIG } from '../../constants/network';
import { blueprintIdFor, snapNetworkKey } from '../../utils/blueprints';
import { getOracleBuffer } from '../../utils/betHelpers';
import CopyButton from '../common/CopyButton';
import type { AppDispatch, RootState } from '../../store';

export const SnapBetInitializeStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isDryRun, methodData, execute } = useSnapMethod('snapBetInitialize');
  const snapRequirement = useRequireSnap();

  const snapAddress = useSelector(selectSnapAddress);

  // Form state
  // QA blueprints exist only on some networks; the snap's network decides.
  const snapNetwork = useSelector((state: RootState) => state.snap.network);
  const networkKey = snapNetworkKey(snapNetwork);
  const defaultBlueprintId = blueprintIdFor(networkKey, 'bet');
  const [blueprintId, setBlueprintId] = useState(defaultBlueprintId ?? '');
  useEffect(() => {
    if (defaultBlueprintId) setBlueprintId(defaultBlueprintId);
  }, [defaultBlueprintId]);
  const [oracleAddress, setOracleAddress] = useState(snapAddress ?? '');
  const [token, setToken] = useState('00');
  const [deadline, setDeadline] = useState<string>(() => {
    const date = new Date(Date.now() + 3600 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  });

  // Intermediate calculations — oracle buffer + timestamp
  const intermediates = useMemo(() => {
    let oracleBuffer: string | null = null;
    let oracleBufferError: string | undefined = undefined;
    let timestamp: number | null = null;

    if (oracleAddress.trim()) {
      try {
        oracleBuffer = getOracleBuffer(oracleAddress, networkKey ?? undefined);
      } catch (err) {
        oracleBufferError = err instanceof Error ? err.message : 'Invalid oracle address';
      }
    }

    if (deadline) {
      try {
        timestamp = Math.floor(new Date(deadline).getTime() / 1000);
      } catch {
        /* invalid date */
      }
    }

    return { oracleBuffer, oracleBufferError, timestamp };
  }, [oracleAddress, deadline, networkKey]);

  // Build params using intermediates
  const params = useMemo(
    () => ({
      method: 'initialize',
      blueprint_id: blueprintId,
      actions: [] as unknown[],
      args: [intermediates.oracleBuffer || '', token, intermediates.timestamp ?? 0],
      push_tx: true,
      nc_id: null,
    }),
    [blueprintId, intermediates, token]
  );

  const liveRequest = useMemo(() => ({ method: 'htr_sendNanoContractTx', params }), [params]);

  const handleExecute = async () => {
    const result = await execute((h) => h.sendNanoContractTx(params));
    // Extract tx hash from response and store as NC ID
    const parsed = parseSnapResponse(result.response);
    const inner = isSnapEnvelope(parsed) ? (parsed as { response: unknown }).response : parsed;
    if (inner && typeof inner === 'object' && isTransactionLike(inner)) {
      const hash = (inner as Record<string, unknown>).hash as string | undefined;
      if (hash) {
        dispatch(setSnapBetNc({ ncId: hash, token }));
      }
    }
    return result;
  };

  const networkLabel = networkKey ? NETWORK_CONFIG[networkKey].label : (snapNetwork ?? 'this network');

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-bet-initialize"
        description="Create a Bet nano contract from the snap wallet."
        method="htr_sendNanoContractTx"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      {defaultBlueprintId === null && <BlueprintUnavailable kind="Bet" networkLabel={networkLabel} switchWhat="snap" />}

      {defaultBlueprintId !== null && (
        <SnapMethodCard
          title="Initialize bet"
          txExplorerPage="nc_detail"
          description="The new contract's ID is kept for the other Bet stages."
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
              placeholder="Bet blueprint ID"
              className="input w-full font-mono text-data"
            />
          </Field>
          <AddressInput
            label="Oracle address"
            value={oracleAddress}
            onChange={setOracleAddress}
            placeholder="Oracle address (base58)"
            suggestedValue={snapAddress ?? undefined}
            sources={['snap']}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Token UID">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="00"
                className="input w-full font-mono text-data"
              />
            </Field>
            <Field label="Deadline">
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input w-full"
              />
            </Field>
          </div>

          <section className="flex flex-col gap-3 border-t border-base-300 pt-4" aria-labelledby="snap-bet-derived">
            <div>
              <h3 id="snap-bet-derived" className="m-0 text-body font-semibold">
                Calculated values
              </h3>
              <p className="m-0 text-caption text-ink-muted">
                Derived from the inputs above and sent in the request args.
              </p>
            </div>
            <dl className="m-0 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <dt className="flex items-center gap-1 text-caption text-ink-muted">
                  Oracle script (hex from address)
                  {intermediates.oracleBuffer && (
                    <CopyButton text={intermediates.oracleBuffer} label="Copy oracle script" />
                  )}
                </dt>
                <dd className="m-0">
                  {intermediates.oracleBufferError ? (
                    <span className="text-body text-error">{intermediates.oracleBufferError}</span>
                  ) : intermediates.oracleBuffer ? (
                    <code className="block rounded-field bg-base-200 px-2 py-1.5 font-mono text-data [overflow-wrap:anywhere]">
                      {intermediates.oracleBuffer}
                    </code>
                  ) : (
                    <span className="text-body text-ink-muted">Enter an oracle address to calculate it.</span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="flex items-center gap-1 text-caption text-ink-muted">
                  Unix timestamp (from deadline)
                  {intermediates.timestamp !== null && (
                    <CopyButton text={intermediates.timestamp.toString()} label="Copy timestamp" />
                  )}
                </dt>
                <dd className="m-0">
                  {intermediates.timestamp !== null ? (
                    <code className="font-mono text-data tabular-nums">{intermediates.timestamp}</code>
                  ) : (
                    <span className="text-body text-ink-muted">Enter a deadline to calculate it.</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>
        </SnapMethodCard>
      )}
    </div>
  );
};
