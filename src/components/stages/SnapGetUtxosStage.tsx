/**
 * Snap Get UTXOs Stage
 *
 * Tests htr_getUtxos via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';

export const SnapGetUtxosStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('getUtxos');

  const [tokenUid, setTokenUid] = useState<string>('');
  const [maxUtxos, setMaxUtxos] = useState<string>('');
  const [amountSmallerThan, setAmountSmallerThan] = useState<string>('');
  const [amountBiggerThan, setAmountBiggerThan] = useState<string>('');

  const params = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (tokenUid.trim()) p.token = tokenUid.trim();
    if (maxUtxos.trim()) p.maxUtxos = parseInt(maxUtxos);
    if (amountSmallerThan.trim()) p.amountSmallerThan = parseInt(amountSmallerThan);
    if (amountBiggerThan.trim()) p.amountBiggerThan = parseInt(amountBiggerThan);
    return p;
  }, [tokenUid, maxUtxos, amountSmallerThan, amountBiggerThan]);

  const liveRequest = useMemo(
    () => ({ method: 'htr_getUtxos', params }),
    [params],
  );

  const handleExecute = () => execute((h) => h.getUtxos(params));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Get UTXOs (Snap)</h1>
      <p className="text-muted mb-7.5">
        Retrieve unspent transaction outputs via MetaMask Snap
      </p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Get UTXOs"
          description="Retrieve UTXOs with optional filters"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Token UID (optional)</label>
            <input
              type="text"
              value={tokenUid}
              onChange={(e) => setTokenUid(e.target.value)}
              placeholder="00 for HTR"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Max UTXOs (optional)</label>
            <input
              type="number"
              value={maxUtxos}
              onChange={(e) => setMaxUtxos(e.target.value)}
              placeholder="e.g. 10"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount Smaller Than (optional)</label>
            <input
              type="number"
              value={amountSmallerThan}
              onChange={(e) => setAmountSmallerThan(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount Bigger Than (optional)</label>
            <input
              type="number"
              value={amountBiggerThan}
              onChange={(e) => setAmountBiggerThan(e.target.value)}
              className="input"
            />
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
