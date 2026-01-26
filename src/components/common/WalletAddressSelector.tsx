/**
 * Wallet Address Selector Component
 * Allows selecting an address from a wallet by index
 * Reusable across Desktop and Mobile QA workflows
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppSelector } from '../../store/hooks';
import CopyButton from './CopyButton';

interface WalletAddressSelectorProps {
  /** Wallet ID to select address from. If not provided, uses test wallet from Redux */
  walletId?: string;
  /** Initial address index (default: 0) */
  initialIndex?: number;
  /** Callback when address changes */
  onAddressChange?: (address: string | null, index: number) => void;
  /** Label for the component (default: "Select Address") */
  label?: string;
  /** Whether to show the copy button (default: true) */
  showCopyButton?: boolean;
}

export default function WalletAddressSelector({
  walletId: walletIdProp,
  initialIndex = 0,
  onAddressChange,
  label = 'Select Address',
  showCopyButton = true,
}: WalletAddressSelectorProps) {
  const { getAllWallets } = useWalletStore();
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);

  // Use provided walletId or fall back to test wallet
  const walletId = walletIdProp ?? testWalletId;

  const [addressIndex, setAddressIndex] = useState(initialIndex);
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingFirstEmpty, setIsFetchingFirstEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get wallet from store
  const wallets = getAllWallets();
  const wallet = wallets.find((w) => w.metadata.id === walletId && w.status === 'ready');

  // Derive address when wallet or index changes
  useEffect(() => {
    const deriveAddress = async () => {
      if (!wallet?.instance) {
        setDerivedAddress(null);
        onAddressChange?.(null, addressIndex);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const address = await wallet.instance.getAddressAtIndex(addressIndex);
        setDerivedAddress(address);
        onAddressChange?.(address, addressIndex);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to derive address');
        setDerivedAddress(null);
        onAddressChange?.(null, addressIndex);
      } finally {
        setIsLoading(false);
      }
    };

    deriveAddress();
  }, [wallet, addressIndex]);

  const handleIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setAddressIndex(0);
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setAddressIndex(parsed);
    }
  };

  const handleGetAddr0 = () => {
    setAddressIndex(0);
    setError(null);
  };

  const handleGetFirstEmpty = async () => {
    if (!wallet?.instance) return;

    setIsFetchingFirstEmpty(true);
    setError(null);

    try {
      const currentAddress = await wallet.instance.getCurrentAddress();
      setAddressIndex(currentAddress.index);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get first empty address');
    } finally {
      setIsFetchingFirstEmpty(false);
    }
  };

  if (!walletId) {
    return (
      <div className="p-4 bg-yellow-50 border border-warning rounded-lg">
        <p className="text-yellow-800 m-0 text-sm mb-2">No test wallet selected.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-800 underline text-sm">
          Go to Wallet Initialization to select a test wallet
        </Link>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 m-0 text-sm">
          <span className="inline-block animate-pulse mr-2">⏳</span>
          Wallet is connecting... Please wait.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Wallet Info */}
      <div className="text-sm text-muted">
        Wallet: <span className="font-medium text-gray-900">{wallet.metadata.friendlyName}</span>
      </div>

      {/* Address Index Control */}
      <div>
        <label htmlFor="address-index-selector" className="block mb-1.5 font-bold text-sm">
          {label}
        </label>
        <div className="flex gap-2 items-start">
          <input
            id="address-index-selector"
            type="number"
            min={0}
            step={1}
            value={addressIndex}
            onChange={handleIndexChange}
            className="input flex-1"
            placeholder="Address index"
          />
          <button
            type="button"
            onClick={handleGetAddr0}
            disabled={!wallet.instance}
            className="btn btn-secondary px-3 py-2 whitespace-nowrap"
          >
            Addr0
          </button>
          <button
            type="button"
            onClick={handleGetFirstEmpty}
            disabled={isFetchingFirstEmpty || !wallet.instance}
            className="btn btn-primary px-3 py-2 whitespace-nowrap"
          >
            {isFetchingFirstEmpty ? 'Loading...' : 'Get First Empty'}
          </button>
        </div>
        <p className="text-muted text-xs mt-1.5 mb-0">Index used to derive the address (default 0)</p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-danger rounded">
          <p className="m-0 text-red-900 text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded text-center">
          <p className="m-0 text-sm">Loading address...</p>
        </div>
      )}

      {/* Derived Address Display */}
      {derivedAddress && !isLoading && (
        <div className="p-3 bg-green-50 border border-success rounded">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-green-800">Address (Index {addressIndex})</span>
            {showCopyButton && <CopyButton text={derivedAddress} label="Copy" size="sm" />}
          </div>
          <p className="font-mono text-xs break-all m-0 text-green-900">{derivedAddress}</p>
        </div>
      )}
    </div>
  );
}
