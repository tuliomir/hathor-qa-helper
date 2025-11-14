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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Address Validation</h1>
      <p style={{ color: '#6c757d', marginBottom: '30px' }}>
        Validate and derive addresses using your initialized wallets. This stage demonstrates how to access wallet
        instances from the global store.
      </p>

      {wallets.length === 0 ? (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            border: '2px dashed #ffc107',
            borderRadius: '8px',
            backgroundColor: '#fff3cd',
            color: '#856404',
          }}
        >
          <h2 style={{ marginTop: 0 }}>No Wallets Available</h2>
          <p style={{ fontSize: '16px' }}>
            Please go to the <strong>Wallet Initialization</strong> stage and add at least one wallet before using this
            feature.
          </p>
        </div>
      ) : (
        <>
          {/* Wallet Selection */}
          <div
            style={{
              padding: '20px',
              border: '2px solid #007bff',
              borderRadius: '8px',
              marginBottom: '30px',
              backgroundColor: '#f8f9fa',
            }}
          >
            <h2>Derive Address</h2>

            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="wallet-select" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
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
              <div
                style={{
                  padding: '15px',
                  backgroundColor: '#d1ecf1',
                  border: '1px solid #17a2b8',
                  borderRadius: '4px',
                  marginBottom: '15px',
                }}
              >
                <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>
                  <strong>Wallet:</strong> {selectedWallet.metadata.friendlyName}
                </p>
                <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>
                  <strong>Network:</strong> {selectedWallet.metadata.network}
                </p>
                <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>
                  <strong>Status:</strong>{' '}
                  <span
                    style={{
                      color:
                        selectedWallet.status === 'ready'
                          ? '#28a745'
                          : selectedWallet.status === 'error'
                            ? '#dc3545'
                            : '#ffc107',
                      fontWeight: 'bold',
                    }}
                  >
                    {selectedWallet.status}
                  </span>
                </p>
                {selectedWallet.firstAddress && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '13px', fontFamily: 'monospace' }}>
                    <strong>First Address:</strong> {selectedWallet.firstAddress}
                  </p>
                )}
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="address-index" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ color: '#6c757d', fontSize: '13px', marginTop: '5px', marginBottom: '0' }}>
                Enter the index of the address to derive (0 = first address, 1 = second address, etc.)
              </p>
            </div>

            <button
              onClick={handleDeriveAddress}
              disabled={!selectedWalletId || isLoading || selectedWallet?.status !== 'ready'}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor:
                  selectedWalletId && !isLoading && selectedWallet?.status === 'ready' ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  selectedWalletId && !isLoading && selectedWallet?.status === 'ready' ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s',
              }}
            >
              {isLoading ? 'Deriving...' : 'Derive Address'}
            </button>

            {error && (
              <div
                style={{
                  marginTop: '15px',
                  padding: '15px',
                  backgroundColor: '#f8d7da',
                  border: '1px solid #dc3545',
                  borderRadius: '4px',
                }}
              >
                <p style={{ margin: 0, color: '#721c24' }}>❌ {error}</p>
              </div>
            )}

            {derivedAddress && (
              <div
                style={{
                  marginTop: '15px',
                  padding: '15px',
                  backgroundColor: '#d4edda',
                  border: '1px solid #28a745',
                  borderRadius: '4px',
                }}
              >
                <h3 style={{ marginTop: 0 }}>✅ Derived Address:</h3>
                <p
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1.1em',
                    wordBreak: 'break-all',
                    fontWeight: 'bold',
                    margin: 0,
                  }}
                >
                  {derivedAddress}
                </p>
              </div>
            )}
          </div>

          {/* Wallet List */}
          <div>
            <h2>Available Wallets ({wallets.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {wallets.map((wallet) => (
                <div
                  key={wallet.metadata.id}
                  style={{
                    padding: '15px',
                    border: wallet.metadata.id === selectedWalletId ? '2px solid #007bff' : '1px solid #dee2e6',
                    borderRadius: '8px',
                    backgroundColor: wallet.metadata.id === selectedWalletId ? '#e7f3ff' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 10px 0' }}>{wallet.metadata.friendlyName}</h3>
                      <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        <strong>Network:</strong> {wallet.metadata.network}
                      </p>
                      <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        <strong>Status:</strong>{' '}
                        <span
                          style={{
                            color:
                              wallet.status === 'ready'
                                ? '#28a745'
                                : wallet.status === 'error'
                                  ? '#dc3545'
                                  : '#ffc107',
                            fontWeight: 'bold',
                          }}
                        >
                          {wallet.status}
                        </span>
                      </p>
                      {wallet.firstAddress && (
                        <p
                          style={{
                            margin: '5px 0',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            color: '#28a745',
                          }}
                        >
                          <strong>First Address:</strong> {wallet.firstAddress}
                        </p>
                      )}
                    </div>
                    {wallet.metadata.id !== selectedWalletId && (
                      <button
                        onClick={() => setSelectedWalletId(wallet.metadata.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
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
