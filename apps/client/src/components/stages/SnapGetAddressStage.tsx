/**
 * Snap Get Address Stage
 *
 * Tests htr_getAddress via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useRequireSnap } from '../../hooks/useRequirements';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Field } from '../ui/Field';
import { firstUnmetReason } from '../../utils/requirements';

type AddressType = 'index' | 'first_empty' | 'client';

const ADDRESS_TYPES: { value: AddressType; label: string; hint: string }[] = [
  { value: 'index', label: 'Index', hint: 'Returns the address at a specific derivation index.' },
  { value: 'first_empty', label: 'First empty', hint: 'Returns the first unused address (needs a synced wallet).' },
  { value: 'client', label: 'Client', hint: 'Asks the MetaMask user to pick an address to share.' },
];

export const SnapGetAddressStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('getAddress');
  const snapRequirement = useRequireSnap();

  const [type, setType] = useState<AddressType>('index');
  const [index, setIndex] = useState<number>(0);

  const needsIndex = type === 'index';

  const liveRequest = useMemo(() => {
    const params: Record<string, unknown> = { type };
    if (needsIndex) params.index = index;
    return { method: 'htr_getAddress', params };
  }, [type, index, needsIndex]);

  const handleExecute = () => execute((h) => h.getAddress(type, needsIndex ? index : undefined));

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-get-address"
        description="Get an address from the snap wallet by type and index."
        method="htr_getAddress"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Get address"
        description="Choose how the snap picks the address."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-body font-medium">Address type</span>
          <SegmentedControl aria-label="Address type" options={ADDRESS_TYPES} value={type} onChange={setType} />
          <span className="text-caption text-ink-muted">{ADDRESS_TYPES.find((t) => t.value === type)?.hint}</span>
        </div>
        {needsIndex && (
          <Field label="Address index" className="max-w-48">
            <input
              type="number"
              value={index}
              onChange={(e) => setIndex(parseInt(e.target.value) || 0)}
              min={0}
              className="input w-full font-mono text-data"
            />
          </Field>
        )}
      </SnapMethodCard>
    </div>
  );
};
