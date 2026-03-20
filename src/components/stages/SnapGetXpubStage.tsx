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
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('getXpub');

  const [network, setNetwork] = useState('testnet');

  const liveRequest = useMemo(() => ({ method: 'htr_getXpub', params: { network } }), [network]);

  const handleExecute = () => execute((h) => h.getXpub(network));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Get Xpub (Snap)</h1>
      <p className="text-muted mb-7.5">Retrieve the wallet&apos;s extended public key via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <>
          <div className="bg-yellow-50 border border-yellow-300 rounded p-4 mb-5 space-y-2">
            <p className="text-sm text-yellow-800 m-0">
              <strong>Origin restricted:</strong> The snap only allows <code>htr_getXpub</code> from whitelisted
              origins. If you get an &quot;not authorized for origin&quot; error, add your origin to the snap&apos;s{' '}
              <code>RPC_RESTRICTIONS</code>.
            </p>
            <p className="text-xs text-yellow-700 m-0">
              In <code>hathor-rpc-lib/packages/snap/src/constants.ts</code>, add{' '}
              <code>&apos;http://localhost:5173&apos;</code> to the <code>RPC_RESTRICTIONS[GetXpub]</code> array, then
              rebuild the snap.
            </p>
          </div>
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
              <Select value={network} onChange={(e) => setNetwork(e.target.value)}>
                <option value="testnet">Testnet</option>
                <option value="mainnet">Mainnet</option>
              </Select>
              <p className="text-xs text-muted mt-1">The xpub is network-specific — select the target network</p>
            </div>
          </SnapMethodCard>
        </>
      )}
    </div>
  );
};
