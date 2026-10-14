/**
 * Wallet Address Display
 * Simple component that displays address 0 of a wallet for easy copying
 * Can be configured for either funding or test wallet
 */

import { useEffect, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import { Identifier } from './Identifier';
import { PreconditionStrip } from './PreconditionStrip';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { useRequireFundingWallet, useRequireTestWallet } from '../../hooks/useRequirements';

type WalletType = 'funding' | 'test';

interface WalletAddressDisplayProps {
  walletType: WalletType;
}

function WalletAddressDisplay({ walletType }: WalletAddressDisplayProps) {
  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const { getWallet } = useWalletStore();

  const walletId = walletType === 'funding' ? fundingWalletId : testWalletId;
  const wallet = walletId ? getWallet(walletId) : undefined;
  const label = walletType === 'funding' ? 'Funding' : 'Test';
  const testRequirement = useRequireTestWallet();
  const fundingRequirement = useRequireFundingWallet();
  const requirement = walletType === 'funding' ? fundingRequirement : testRequirement;

  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchAddress() {
      if (!wallet?.instance) {
        setAddress(null);
        return;
      }

      setIsLoading(true);
      try {
        const addr = await wallet.instance.getAddressAtIndex(0);
        setAddress(addr);
      } catch (err) {
        console.error(`Failed to get ${label.toLowerCase()} wallet address:`, err);
        setAddress(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAddress();
  }, [wallet?.instance, label]);

  if (requirement.met !== true) {
    return <PreconditionStrip requirements={[requirement]} />;
  }

  return (
    <Panel title={`${label} wallet address`} description={`${wallet?.metadata.friendlyName}, address at index 0`}>
      {isLoading ? (
        <span className="skeleton block h-9 w-full" aria-label="Loading address" />
      ) : address ? (
        <Identifier value={address} kind="address" truncate="none" walletTag={false} />
      ) : (
        <Callout tone="error" role="alert">
          Could not load the address.
        </Callout>
      )}
    </Panel>
  );
}

// Pre-configured components for the component registry (no props allowed)
export default function DisplayWalletAddress() {
  return <WalletAddressDisplay walletType="funding" />;
}

export function TestWalletAddress() {
  return <WalletAddressDisplay walletType="test" />;
}
