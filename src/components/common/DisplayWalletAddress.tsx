/**
 * Wallet Address Display
 * Simple component that displays address 0 of a wallet for easy copying
 * Can be configured for either funding or test wallet
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import CopyButton from './CopyButton';

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

  if (!walletId) {
    return (
      <div className="p-4 bg-yellow-50 border border-warning rounded-lg">
        <p className="text-yellow-800 m-0 text-sm mb-2">No {label.toLowerCase()} wallet selected.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-800 underline text-sm">
          Go to Wallet Initialization to select a {label.toLowerCase()} wallet
        </Link>
      </div>
    );
  }

  if (!wallet || wallet.status !== 'ready') {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 m-0 text-sm">
          <span className="inline-block animate-pulse mr-2">⏳</span>
          {label} wallet is connecting... Please wait.
        </p>
      </div>
    );
  }

  return (
    <div className="card-primary">
      <h3 className="text-lg font-bold mb-2">{label} Wallet Address</h3>
      <p className="text-xs text-muted mb-3">
        {wallet.metadata.friendlyName} - Address at index 0
      </p>

      {isLoading ? (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-muted text-sm m-0">Loading address...</p>
        </div>
      ) : address ? (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <code className="text-sm font-mono break-all flex-1">{address}</code>
            <CopyButton text={address} label="Copy" />
          </div>
        </div>
      ) : (
        <div className="p-4 bg-red-50 border border-danger rounded-lg">
          <p className="text-red-800 text-sm m-0">Failed to load address.</p>
        </div>
      )}
    </div>
  );
}

// Pre-configured components for the component registry (no props allowed)
export default function DisplayWalletAddress() {
  return <WalletAddressDisplay walletType="funding" />;
}

export function TestWalletAddress() {
  return <WalletAddressDisplay walletType="test" />;
}
