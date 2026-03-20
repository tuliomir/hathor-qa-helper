/**
 * Snap Get Balance Stage
 *
 * Tests htr_getBalance via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';

export const SnapGetBalanceStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('getBalance');

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
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Get Balance (Snap)</h1>
      <p className="text-muted mb-7.5">Query token balances via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Get Balance"
          description="Retrieve balances for specified tokens"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Token UIDs</label>
            {tokens.map((token, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => updateToken(i, e.target.value)}
                  placeholder="Token UID (00 for HTR)"
                  className="input flex-1"
                />
                {tokens.length > 1 && (
                  <button onClick={() => removeToken(i)} className="btn-secondary py-1.5 px-3 text-sm">
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button onClick={addToken} className="btn-secondary py-1.5 px-3 text-sm mt-1">
              + Add Token
            </button>
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
