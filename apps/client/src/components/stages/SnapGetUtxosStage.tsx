/**
 * Snap Get UTXOs Stage
 *
 * Tests htr_getUtxos via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useRequireSnap } from '../../hooks/useRequirements';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Field } from '../ui/Field';
import { setSnapUtxos } from '../../store/slices/snapSlice';
import type { SnapUtxo } from '../../store/slices/snapSlice';
import type { AppDispatch } from '../../store';
import { parseSnapResponse, isSnapEnvelope } from '../../utils/snapResponseHelpers';
import { firstUnmetReason } from '../../utils/requirements';

function extractUtxos(rawResponse: unknown): SnapUtxo[] {
  const parsed = parseSnapResponse(rawResponse);
  const inner = isSnapEnvelope(parsed) ? (parsed as { response: unknown }).response : parsed;
  if (!inner || typeof inner !== 'object') return [];
  const data = inner as Record<string, unknown>;
  const utxos = Array.isArray(data.utxos) ? data.utxos : [];
  return utxos
    .filter((u: Record<string, unknown>) => u.tx_id && typeof u.tx_id === 'string')
    .map((u: Record<string, unknown>) => ({
      txId: u.tx_id as string,
      index: Number(u.index ?? 0),
      amount: Number(u.amount ?? 0),
      token: typeof u.token === 'string' ? u.token : '00',
      address: typeof u.address === 'string' ? u.address : '',
      locked: !!u.locked,
    }));
}

const MONO_INPUT = 'input w-full font-mono text-data';

export const SnapGetUtxosStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isDryRun, methodData, execute } = useSnapMethod('getUtxos');
  const snapRequirement = useRequireSnap();

  const [tokenUid, setTokenUid] = useState<string>('');
  const [maxUtxos, setMaxUtxos] = useState<string>('');
  const [amountSmallerThan, setAmountSmallerThan] = useState<string>('');
  const [amountBiggerThan, setAmountBiggerThan] = useState<string>('');
  const [filterAddress, setFilterAddress] = useState<string>('');
  const [authorities, setAuthorities] = useState<string>('');
  const [maximumAmount, setMaximumAmount] = useState<string>('');
  const [onlyAvailableUtxos, setOnlyAvailableUtxos] = useState<boolean>(false);

  const params = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (tokenUid.trim()) p.token = tokenUid.trim();
    if (maxUtxos.trim()) p.maxUtxos = parseInt(maxUtxos);
    if (amountSmallerThan.trim()) p.amountSmallerThan = parseInt(amountSmallerThan);
    if (amountBiggerThan.trim()) p.amountBiggerThan = parseInt(amountBiggerThan);
    if (filterAddress.trim()) p.filterAddress = filterAddress.trim();
    if (authorities.trim()) p.authorities = parseInt(authorities);
    if (maximumAmount.trim()) p.maximumAmount = parseInt(maximumAmount);
    if (onlyAvailableUtxos) p.onlyAvailableUtxos = true;
    return p;
  }, [
    tokenUid,
    maxUtxos,
    amountSmallerThan,
    amountBiggerThan,
    filterAddress,
    authorities,
    maximumAmount,
    onlyAvailableUtxos,
  ]);

  const liveRequest = useMemo(() => ({ method: 'htr_getUtxos', params }), [params]);

  const handleExecute = async () => {
    const result = await execute((h) => h.getUtxos(params));
    const utxos = extractUtxos(result.response);
    // If a token filter was used, tag UTXOs with it (response doesn't include token per-utxo)
    const tagged = tokenUid.trim() ? utxos.map((u) => ({ ...u, token: tokenUid.trim() })) : utxos;
    dispatch(setSnapUtxos(tagged));
    return result;
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-get-utxos"
        description="List the snap wallet's unspent outputs, with optional filters."
        method="htr_getUtxos"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Get UTXOs"
        description="Every filter is optional; empty ones are left out of the request."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <Field label="Token UID" hint="00 for HTR. Send transaction can reuse the UTXOs this returns.">
          <input
            type="text"
            value={tokenUid}
            onChange={(e) => setTokenUid(e.target.value)}
            placeholder="00"
            className={MONO_INPUT}
          />
        </Field>
        <Field label="Filter address">
          <input
            type="text"
            value={filterAddress}
            onChange={(e) => setFilterAddress(e.target.value)}
            placeholder="Filter by address"
            className={MONO_INPUT}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Max UTXOs">
            <input
              type="number"
              value={maxUtxos}
              onChange={(e) => setMaxUtxos(e.target.value)}
              placeholder="10"
              className={MONO_INPUT}
            />
          </Field>
          <Field label="Authorities" hint="1 for mint, 2 for melt.">
            <input
              type="number"
              value={authorities}
              onChange={(e) => setAuthorities(e.target.value)}
              className={MONO_INPUT}
            />
          </Field>
          <Field label="Amount smaller than">
            <input
              type="number"
              value={amountSmallerThan}
              onChange={(e) => setAmountSmallerThan(e.target.value)}
              className={MONO_INPUT}
            />
          </Field>
          <Field label="Amount bigger than">
            <input
              type="number"
              value={amountBiggerThan}
              onChange={(e) => setAmountBiggerThan(e.target.value)}
              className={MONO_INPUT}
            />
          </Field>
          <Field label="Maximum amount">
            <input
              type="number"
              value={maximumAmount}
              onChange={(e) => setMaximumAmount(e.target.value)}
              className={MONO_INPUT}
            />
          </Field>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-body">
          <input
            type="checkbox"
            checked={onlyAvailableUtxos}
            onChange={(e) => setOnlyAvailableUtxos(e.target.checked)}
            className="checkbox checkbox-sm"
          />
          Only available UTXOs
        </label>
      </SnapMethodCard>
    </div>
  );
};
