/**
 * Wallet Address Selector Component
 * Allows selecting an address from a wallet by index
 * Reusable across Desktop and Mobile QA workflows
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppSelector } from '../../store/hooks';
import { Identifier } from './Identifier';
import { Field } from '../ui/Field';
import { Callout } from '../ui/Callout';
import { getStageUrl } from '../../config/stageRoutes';

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
  label = 'Address index',
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

  // Derive address when wallet or index changes. Keyed on the instance: the
  // wallet record is replaced on every event, and re-deriving would flash the
  // loading state and scroll the stage back up.
  const instance = wallet?.instance;
  useEffect(() => {
    const deriveAddress = async () => {
      if (!instance) {
        setDerivedAddress(null);
        onAddressChange?.(null, addressIndex);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const address = await instance.getAddressAtIndex(addressIndex);
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
  }, [instance, addressIndex]);

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
      if (currentAddress.index != null) setAddressIndex(currentAddress.index);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get first empty address');
    } finally {
      setIsFetchingFirstEmpty(false);
    }
  };

  if (!walletId) {
    return (
      <Callout
        tone="warning"
        title="No test wallet selected"
        action={
          <Link to={getStageUrl('wallet-initialization')} className="btn btn-secondary btn-sm">
            Select a wallet
          </Link>
        }
      >
        Select a test wallet in Wallet initialization.
      </Callout>
    );
  }

  if (!wallet) {
    return (
      <Callout tone="info" role="status">
        Waiting for the wallet to be ready.
      </Callout>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-body text-ink-muted">
        Wallet <span className="font-medium text-base-content">{wallet.metadata.friendlyName}</span>
      </p>

      <Field
        label={label}
        htmlFor="address-index-selector"
        hint="Index used to derive the address (default 0)."
        wireControl={false}
      >
        <div className="flex flex-wrap items-start gap-2">
          <input
            id="address-index-selector"
            aria-describedby="address-index-selector-hint"
            type="number"
            min={0}
            step={1}
            value={addressIndex}
            onChange={handleIndexChange}
            className="input min-w-24 flex-1 font-mono text-data"
            placeholder="Address index"
          />
          <button type="button" onClick={handleGetAddr0} disabled={!wallet.instance} className="btn btn-secondary">
            Index 0
          </button>
          <button
            type="button"
            onClick={handleGetFirstEmpty}
            disabled={isFetchingFirstEmpty || !wallet.instance}
            className="btn btn-secondary"
          >
            {isFetchingFirstEmpty ? 'Looking up…' : 'First empty'}
          </button>
        </div>
      </Field>

      {error && (
        <Callout tone="error" role="alert">
          {error}
        </Callout>
      )}

      {isLoading && <span className="skeleton block h-9 w-full" aria-label="Loading address" />}

      {derivedAddress && !isLoading && (
        <div className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Address at index {addressIndex}</span>
          <Identifier value={derivedAddress} kind="address" truncate="none" copy={showCopyButton} />
        </div>
      )}
    </div>
  );
}
