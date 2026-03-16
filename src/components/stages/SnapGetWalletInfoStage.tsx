/**
 * Snap Get Wallet Information Stage
 *
 * Tests htr_getWalletInformation via MetaMask Snap
 */

import React, { useMemo } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';

export const SnapGetWalletInfoStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('getWalletInformation');

  const liveRequest = useMemo(
    () => ({ method: 'htr_getWalletInformation' }),
    [],
  );

  const handleExecute = () => execute((h) => h.getWalletInformation());

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Wallet Information (Snap)</h1>
      <p className="text-muted mb-7.5">
        Get the wallet network and first address via MetaMask Snap
      </p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Wallet Information"
          description="Returns the connected network and the address at index 0"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <p className="text-sm text-muted">
            No parameters required — this method returns the wallet&apos;s current network and primary address.
          </p>
        </SnapMethodCard>
      )}
    </div>
  );
};
