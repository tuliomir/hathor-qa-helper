/**
 * Hathor QA Helper - Wallet Display Component
 * Displays a wallet with auto-generated seed phrase
 */

import { useState } from 'react';
import Wallet from './Wallet';
import { generateSeed } from '../utils/walletUtils';
import { DEFAULT_NETWORK, NETWORK_CONFIG } from '../constants/network';
import type { WalletState } from '../types/wallet';

export default function WalletDisplay() {
  const [seedPhrase] = useState<string>(generateSeed());
  const [walletState, setWalletState] = useState<WalletState>({
    status: 'idle',
  });

  const handleStatusChange = (state: WalletState) => {
    setWalletState(state);
  };

  const network = DEFAULT_NETWORK;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Hathor QA Helper - Wallet Display</h1>

      {/* Seed Phrase Display */}
      {seedPhrase && walletState.status !== 'idle' && (
        <div
          style={{
            marginTop: '20px',
            marginBottom: '20px',
            padding: '15px',
            backgroundColor:
              walletState.status === 'ready' ? 'darkgoldenrod' : '#fff3cd',
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
      <Wallet
        seedPhrase={seedPhrase}
        network={network}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
