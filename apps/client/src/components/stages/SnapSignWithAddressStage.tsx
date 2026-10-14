/**
 * Snap Sign with Address Stage
 *
 * Tests htr_signWithAddress via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useRequireSnap } from '../../hooks/useRequirements';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Field } from '../ui/Field';
import { firstUnmetReason } from '../../utils/requirements';

export const SnapSignWithAddressStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('signWithAddress');
  const snapRequirement = useRequireSnap();

  const [message, setMessage] = useState<string>('Hello, Hathor!');
  const [addressIndex, setAddressIndex] = useState<number>(0);

  const liveRequest = useMemo(
    () => ({
      method: 'htr_signWithAddress',
      params: { message: message || '<message>', addressIndex },
    }),
    [message, addressIndex]
  );

  const handleExecute = () => execute((h) => h.signWithAddress(message, addressIndex));

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-sign-with-address"
        description="Sign a message with the snap wallet's address at a given index."
        method="htr_signWithAddress"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Sign message"
        description="The snap shows the message for approval."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <Field label="Message">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message to sign"
            className="input w-full"
          />
        </Field>
        <Field label="Address index" className="max-w-48">
          <input
            type="number"
            value={addressIndex}
            onChange={(e) => setAddressIndex(parseInt(e.target.value) || 0)}
            min={0}
            className="input w-full font-mono text-data"
          />
        </Field>
      </SnapMethodCard>
    </div>
  );
};
