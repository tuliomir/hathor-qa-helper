/**
 * Hathor QA Helper - Wallet Display Component
 * Displays multiple wallets: one auto-generated and optional manual wallets
 */

import { useState } from 'react';
import Wallet from './Wallet';
import ManualWallet from './ManualWallet';
import { generateSeed } from '../utils/walletUtils';
import { DEFAULT_NETWORK, NETWORK_CONFIG } from '../constants/network';
import type { WalletState } from '../types/wallet';

export default function WalletDisplay() {
  const [seedPhrase] = useState<string>(generateSeed());
  const [walletState, setWalletState] = useState<WalletState>({
    status: 'idle',
  });
  const [manualWallets, setManualWallets] = useState<number[]>([]);
  const [nextWalletId, setNextWalletId] = useState(1);

  const handleStatusChange = (state: WalletState) => {
    setWalletState(state);
  };

  const handleAddWallet = () => {
    setManualWallets((prev) => [...prev, nextWalletId]);
    setNextWalletId((prev) => prev + 1);
  };

  const handleRemoveWallet = (id: number) => {
    setManualWallets((prev) => prev.filter((walletId) => walletId !== id));
  };

  const network = DEFAULT_NETWORK;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Hathor QA Helper - Multiple Wallets</h1>

      {/* Auto-generated Wallet Section */}
      <div
        style={{
          padding: '20px',
          border: '2px solid #28a745',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: '#f8f9fa',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Auto-Generated Wallet</h2>

        {/* Seed Phrase Display */}
        {seedPhrase && walletState.status !== 'idle' && (
          <div
            style={{
              marginTop: '20px',
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: walletState.status === 'ready' ? 'darkgoldenrod' : '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
            }}
          >
            <h3>📝 Seed Phrase:</h3>
            <p
              style={{
                fontFamily: 'monospace',
                wordBreak: 'break-word',
                fontSize: '0.9em',
                color: walletState.status === 'ready' ? 'white' : 'inherit',
              }}
            >
              {seedPhrase}
            </p>
            <p
              style={{
                fontSize: '0.85em',
                color: walletState.status === 'ready' ? 'black' : '#856404',
                marginTop: '10px',
              }}
            >
              ⚠️ Save this seed phrase if you want to access this wallet again!
            </p>
            <p
              style={{
                fontSize: '0.85em',
                color: walletState.status === 'ready' ? 'black' : '#856404',
                marginTop: '5px',
              }}
            >
              Network: {NETWORK_CONFIG[network].name}
            </p>
          </div>
        )}

        {/* Wallet Component */}
        <Wallet seedPhrase={seedPhrase} network={network} onStatusChange={handleStatusChange} />
      </div>

      {/* Manual Wallets Section */}
      <div style={{ marginTop: '30px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ margin: 0 }}>Manual Wallets</h2>
          <button
            onClick={handleAddWallet}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0056b3')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#007bff')}
          >
            + Add Wallet
          </button>
        </div>

        {manualWallets.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              border: '2px dashed #6c757d',
              borderRadius: '8px',
              color: '#6c757d',
            }}
          >
            <p style={{ fontSize: '18px', margin: 0 }}>
              No manual wallets added yet. Click "Add Wallet" to get started.
            </p>
          </div>
        ) : (
          manualWallets.map((walletId) => <ManualWallet key={walletId} onRemove={() => handleRemoveWallet(walletId)} />)
        )}
      </div>
    </div>
  );
}
