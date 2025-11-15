/**
 * Address Validation Stage
 * Validates addresses using initialized wallets from the global store
 */

import { useState } from 'react';
import { useWalletStore } from '../../hooks/useWalletStore';

export default function AddressValidation() {
  const { getAllWallets } = useWalletStore();
  const wallets = getAllWallets();

  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWallet = wallets.find((w) => w.metadata.id === selectedWalletId);

  const handleDeriveAddress = async () => {
    if (!selectedWallet || !selectedWallet.instance) {
      setError('Please select a wallet that is ready');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const address = await selectedWallet.instance.getAddressAtIndex(addressIndex);
      setDerivedAddress(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to derive address');
      setDerivedAddress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-success';
      case 'error': return 'text-danger';
      case 'connecting':
      case 'syncing': return 'text-warning';
      default: return 'text-muted';
    }
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Address Validation</h1>
      <p className="text-muted mb-7.5">
        Validate and derive addresses using your initialized wallets. This stage demonstrates how to access wallet
        instances from the global store.
      </p>

      {wallets.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-warning rounded-lg bg-yellow-50 text-yellow-800">
          <h2 className="mt-0 text-2xl font-bold">No Wallets Available</h2>
          <p className="text-base">
            Please go to the <strong>Wallet Initialization</strong> stage and add at least one wallet before using this
            feature.
          </p>
        </div>
      ) : (
        <>
          {/* Wallet Selection */}
          <div className="card-primary mb-7.5">
            <h2 className="text-xl font-bold mb-4">Derive Address</h2>

            <div className="mb-4">
              <label htmlFor="wallet-select" className="block mb-1.5 font-bold">
                Select Wallet:
              </label>
              <select
                id="wallet-select"
                value={selectedWalletId}
                onChange={(e) => {
                  setSelectedWalletId(e.target.value);
                  setDerivedAddress(null);
                  setError(null);
                }}
                className="input cursor-pointer bg-white"
              >
                <option value="">-- Select a wallet --</option>
                {wallets.map((wallet) => (
                  <option key={wallet.metadata.id} value={wallet.metadata.id}>
                    {wallet.metadata.friendlyName} ({wallet.metadata.network}) - Status: {wallet.status}
                  </option>
                ))}
              </select>
            </div>

            {selectedWallet && (
              <div className="p-4 bg-cyan-50 border border-info rounded mb-4">
                <p className="m-0 mb-1.5 text-sm">
                  <strong>Wallet:</strong> {selectedWallet.metadata.friendlyName}
                </p>
                <p className="m-0 mb-1.5 text-sm">
                  <strong>Network:</strong> {selectedWallet.metadata.network}
                </p>
                <p className="m-0 mb-1.5 text-sm">
                  <strong>Status:</strong>{' '}
                  <span className={`${getStatusColor(selectedWallet.status)} font-bold`}>
                    {selectedWallet.status}
                  </span>
                </p>
                {selectedWallet.firstAddress && (
                  <p className="m-0 mt-1.5 text-xs font-mono">
                    <strong>First Address:</strong> {selectedWallet.firstAddress}
                  </p>
                )}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="address-index" className="block mb-1.5 font-bold">
                Address Index:
              </label>
              <input
                id="address-index"
                type="number"
                min="0"
                value={addressIndex}
                onChange={(e) => {
                  setAddressIndex(parseInt(e.target.value, 10) || 0);
                  setDerivedAddress(null);
                  setError(null);
                }}
                className="input"
              />
              <p className="text-muted text-xs mt-1.5 mb-0">
                Enter the index of the address to derive (0 = first address, 1 = second address, etc.)
              </p>
            </div>

            <button
              onClick={handleDeriveAddress}
              disabled={!selectedWalletId || isLoading || selectedWallet?.status !== 'ready'}
              className={`w-full btn text-base font-bold ${
                selectedWalletId && !isLoading && selectedWallet?.status === 'ready'
                  ? 'btn-primary'
                  : 'btn-secondary cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Deriving...' : 'Derive Address'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-danger rounded">
                <p className="m-0 text-red-900">❌ {error}</p>
              </div>
            )}

            {derivedAddress && (
              <div className="mt-4 p-4 bg-green-50 border border-success rounded">
                <h3 className="mt-0 text-lg font-bold">✅ Derived Address:</h3>
                <p className="font-mono text-lg break-all font-bold m-0">
                  {derivedAddress}
                </p>
              </div>
            )}
          </div>

          {/* Wallet List */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Available Wallets ({wallets.length})</h2>
            <div className="flex flex-col gap-4">
              {wallets.map((wallet) => (
                <div
                  key={wallet.metadata.id}
                  className={`p-4 rounded-lg ${
                    wallet.metadata.id === selectedWalletId
                      ? 'border-2 border-primary bg-blue-50'
                      : 'border border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="m-0 mb-2.5 text-lg font-bold">{wallet.metadata.friendlyName}</h3>
                      <p className="m-0 my-1.5 text-sm">
                        <strong>Network:</strong> {wallet.metadata.network}
                      </p>
                      <p className="m-0 my-1.5 text-sm">
                        <strong>Status:</strong>{' '}
                        <span className={`${getStatusColor(wallet.status)} font-bold`}>
                          {wallet.status}
                        </span>
                      </p>
                      {wallet.firstAddress && (
                        <p className="m-0 my-1.5 text-xs font-mono text-success">
                          <strong>First Address:</strong> {wallet.firstAddress}
                        </p>
                      )}
                    </div>
                    {wallet.metadata.id !== selectedWalletId && (
                      <button
                        onClick={() => setSelectedWalletId(wallet.metadata.id)}
                        className="btn-primary text-sm"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
