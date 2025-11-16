/**
 * Address Validation Stage
 * Validates addresses using initialized wallets from the global store
 */

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setSelectedWalletId, setAddressIndex, setAmount } from '../../store/slices/addressValidationSlice';

export default function AddressValidation() {
  const { getAllWallets } = useWalletStore();
  const wallets = getAllWallets();
  const readyWallets = wallets.filter((w) => w.status === 'ready');

  const dispatch = useAppDispatch();
  const selectedWalletIdFromStore = useAppSelector((s) => s.addressValidation.selectedWalletId);
  const addressIndexFromStore = useAppSelector((s) => s.addressValidation.addressIndex);
  const amountFromStore = useAppSelector((s) => s.addressValidation.amount);

  const [selectedWalletIdLocal, setSelectedWalletIdLocal] = useState<string>(selectedWalletIdFromStore || '');
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWallet = readyWallets.find((w) => w.metadata.id === (selectedWalletIdFromStore || selectedWalletIdLocal));

  // Auto-derive selected address when wallet is selected
  useEffect(() => {
    const deriveAddress = async () => {
      if (!selectedWallet || !selectedWallet.instance) {
        setDerivedAddress(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const index = addressIndexFromStore ?? 0;
        const address = await selectedWallet.instance.getAddressAtIndex(index);
        setDerivedAddress(address);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to derive address');
        setDerivedAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    deriveAddress();
  }, [selectedWallet, addressIndexFromStore]);

  // Keep local selection in sync with store
  useEffect(() => {
    setSelectedWalletIdLocal(selectedWalletIdFromStore || '');
  }, [selectedWalletIdFromStore]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      dispatch(setAmount(value));
    } else if (e.target.value === '') {
      dispatch(setAmount(1));
    }
  };

  const handleIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // allow empty input to be typed; only commit numbers >= 0
    if (val === '') {
      dispatch(setAddressIndex(0));
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      dispatch(setAddressIndex(parsed));
    }
  };

  const getAddressUri = () => derivedAddress ? `hathor:${derivedAddress}` : '';

  const getPaymentRequest = () => {
    if (!derivedAddress) return '';
    return JSON.stringify({
      address: `hathor:${derivedAddress}`,
      amount: amountFromStore.toString(),
      token: {
        uid: '00',
        name: 'Hathor',
        symbol: 'HTR'
      }
    });
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Address Validation</h1>
      <p className="text-muted mb-7.5">
        Select a ready wallet to view and share its first address through QR codes.
      </p>

      {readyWallets.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-warning rounded-lg bg-yellow-50 text-yellow-800">
          <h2 className="mt-0 text-2xl font-bold">No Ready Wallets Available</h2>
          <p className="text-base">
            Please go to the <strong>Wallet Initialization</strong> stage, add a wallet, and start it before using this
            feature.
          </p>
        </div>
      ) : (
        <>
          {/* Wallet Selection */}
          <div className="card-primary mb-7.5">
            <h2 className="text-xl font-bold mb-4">Select Wallet</h2>

            <div className="mb-4 grid grid-cols-2 gap-4 items-end">
              <div>
                <label htmlFor="address-index" className="block mb-1.5 font-bold">
                  Address Index:
                </label>
                <input
                  id="address-index"
                  type="number"
                  min={0}
                  step={1}
                  value={addressIndexFromStore}
                  onChange={handleIndexChange}
                  className="input"
                />
                <p className="text-muted text-xs mt-1.5 mb-0">Index used to derive the address (default 0)</p>
              </div>

              <div>
                <label htmlFor="wallet-select" className="block mb-1.5 font-bold">
                  Choose a Ready Wallet:
                </label>
                <select
                  id="wallet-select"
                  value={selectedWalletIdFromStore || selectedWalletIdLocal}
                  onChange={(e) => dispatch(setSelectedWalletId(e.target.value))}
                  className="input cursor-pointer bg-white"
                >
                  <option value="">-- Select a wallet --</option>
                  {readyWallets.map((wallet) => (
                    <option key={wallet.metadata.id} value={wallet.metadata.id}>
                      {wallet.metadata.friendlyName} ({wallet.metadata.network})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-danger rounded">
                <p className="m-0 text-red-900">{error}</p>
              </div>
            )}
          </div>

          {/* Address Display */}
          {isLoading && (
            <div className="card-primary mb-7.5 text-center">
              <p className="m-0">Loading address...</p>
            </div>
          )}

          {derivedAddress && !isLoading && (
            <>
              {/* Address Display */}
              <div className="card-primary mb-7.5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold m-0">Address (Index {addressIndexFromStore})</h3>
                  <button
                    onClick={() => handleCopy(derivedAddress)}
                    className="btn-primary text-xs"
                    title="Copy address"
                  >
                    <span className="i-mdi-content-copy inline-block mr-1" />
                    Copy
                  </button>
                </div>
                <p className="font-mono text-2xs break-all m-0 p-2 bg-gray-100 rounded">
                  {derivedAddress}
                </p>
              </div>

              {/* Address URI QR Code */}
              <div className="card-primary mb-7.5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold m-0">Address QR Code</h3>
                  <button
                    onClick={() => handleCopy(getAddressUri())}
                    className="btn-primary text-xs"
                    title="Copy address URI"
                  >
                    <span className="i-mdi-content-copy inline-block mr-1" />
                    Copy
                  </button>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-white border-2 border-gray-300 rounded">
                    <QRCode value={getAddressUri()} size={200} />
                  </div>
                  <p className="font-mono text-2xs break-all m-0 p-2 bg-gray-100 rounded w-full text-center">
                    {getAddressUri()}
                  </p>
                </div>
              </div>

              {/* Amount Field */}
              <div className="card-primary mb-7.5">
                <label htmlFor="amount-input" className="block mb-1.5 font-bold">
                  Payment Amount:
                </label>
                <input
                  id="amount-input"
                  type="number"
                  min="1"
                  step="1"
                  value={amountFromStore}
                  onChange={handleAmountChange}
                  className="input"
                  placeholder="Enter amount"
                />
                <p className="text-muted text-xs mt-1.5 mb-0">
                  Enter a positive integer for the payment amount (HTR tokens)
                </p>
              </div>

              {/* Payment Request QR Code */}
              <div className="card-primary mb-7.5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold m-0">Payment Request QR Code</h3>
                  <button
                    onClick={() => handleCopy(getPaymentRequest())}
                    className="btn-primary text-xs"
                    title="Copy payment request"
                  >
                    <span className="i-mdi-content-copy inline-block mr-1" />
                    Copy
                  </button>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-white border-2 border-gray-300 rounded">
                    <QRCode value={getPaymentRequest()} size={200} />
                  </div>
                  <p className="font-mono text-2xs break-all m-0 p-2 bg-gray-100 rounded w-full">
                    {getPaymentRequest()}
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
