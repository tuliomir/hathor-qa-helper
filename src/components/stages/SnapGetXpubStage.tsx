/**
 * Snap Get Xpub Stage
 *
 * Tests htr_getXpub via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import Select from '../common/Select';

export const SnapGetXpubStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('getXpub');

  const [network, setNetwork] = useState('testnet');

  const liveRequest = useMemo(
    () => ({ method: 'htr_getXpub', params: { network } }),
    [network],
  );

  const handleExecute = () => execute((h) => h.getXpub(network));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Get Xpub (Snap)</h1>
      <p className="text-muted mb-7.5">
        Retrieve the wallet&apos;s extended public key via MetaMask Snap
      </p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Get Xpub"
          description="Get the wallet's extended public key (requires user approval)"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Network</label>
            <Select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </Select>
            <p className="text-xs text-muted mt-1">
              The xpub is network-specific — select the target network
            </p>
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
