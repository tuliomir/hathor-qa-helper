/**
 * Snap Sign with Address Stage
 *
 * Tests htr_signWithAddress via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';

export const SnapSignWithAddressStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('signWithAddress');

  const [message, setMessage] = useState<string>('');
  const [addressIndex, setAddressIndex] = useState<number>(0);

  const liveRequest = useMemo(
    () => ({
      method: 'htr_signWithAddress',
      params: { message: message || '<message>', addressIndex },
    }),
    [message, addressIndex],
  );

  const handleExecute = () =>
    execute((h) => h.signWithAddress(message, addressIndex));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Sign with Address (Snap)</h1>
      <p className="text-muted mb-7.5">
        Sign a message using a specific address via MetaMask Snap
      </p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Sign with Address"
          description="Sign a message using an address at a specific index"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Message</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message to sign"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Address Index</label>
            <input
              type="number"
              value={addressIndex}
              onChange={(e) => setAddressIndex(parseInt(e.target.value) || 0)}
              min={0}
              className="input"
            />
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
