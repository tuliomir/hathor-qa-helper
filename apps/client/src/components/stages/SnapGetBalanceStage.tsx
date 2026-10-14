/**
 * Snap Get Balance Stage
 *
 * Tests htr_getBalance via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useRequireSnap } from '../../hooks/useRequirements';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { firstUnmetReason } from '../../utils/requirements';

export const SnapGetBalanceStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('getBalance');
  const snapRequirement = useRequireSnap();

  const [tokens, setTokens] = useState<string[]>(['00']);

  const liveRequest = useMemo(
    () => ({
      method: 'htr_getBalance',
      params: { tokens: tokens.filter((t) => t.trim() !== '') },
    }),
    [tokens]
  );

  const handleExecute = () => execute((h) => h.getBalance(tokens.filter((t) => t.trim() !== '')));

  const addToken = () => setTokens([...tokens, '']);
  const removeToken = (i: number) => setTokens(tokens.filter((_, idx) => idx !== i));
  const updateToken = (i: number, value: string) => setTokens(tokens.map((t, idx) => (idx === i ? value : t)));

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-get-balance"
        description="Get the snap wallet's balance for one or more tokens."
        method="htr_getBalance"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Get balance"
        description="Empty rows are left out of the request."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 p-0 text-body font-medium">Token UIDs</legend>
          {tokens.map((token, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={token}
                onChange={(e) => updateToken(i, e.target.value)}
                placeholder="Token UID (00 for HTR)"
                aria-label={`Token UID ${i + 1}`}
                className="input w-full flex-1 font-mono text-data"
              />
              {tokens.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeToken(i)}
                  className="btn btn-ghost btn-sm btn-square"
                  aria-label={`Remove token ${i + 1}`}
                >
                  <MdClose aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addToken} className="btn btn-secondary btn-sm self-start">
            <MdAdd aria-hidden="true" />
            Add token
          </button>
        </fieldset>
      </SnapMethodCard>
    </div>
  );
};
