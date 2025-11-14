/**
 * Manual Wallet Input Component
 * Allows users to input seed phrase and select network manually
 */

import { useState } from 'react';
import Wallet from './Wallet';
import { treatSeedWords } from '../utils/walletUtils';
import type { NetworkType } from '../constants/network';

interface ManualWalletProps {
  onRemove?: () => void;
}

export default function ManualWallet({ onRemove }: ManualWalletProps) {
  const [seedInput, setSeedInput] = useState('');
  const [network, setNetwork] = useState<NetworkType>('TESTNET');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [validatedSeed, setValidatedSeed] = useState<string | null>(null);

  const handleConnect = () => {
    // Validate seed input
    const { valid: validation, treatedWords, error } = treatSeedWords(seedInput);

    if (!validation) {
      setValidationError(error || 'Invalid seed phrase');
      return;
    }

    // Clear any previous errors
    setValidationError(null);

    // Set the validated seed and mark as connected
    setValidatedSeed(treatedWords);
    setIsConnected(true);
  };

  const handleSeedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSeedInput(e.target.value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNetwork(e.target.value as NetworkType);
  };

  // If connected and validated, show the Wallet component
  if (isConnected && validatedSeed) {
    return (
      <div
        style={{
          padding: '20px',
          border: '2px solid #17a2b8',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
          }}
        >
          <h2 style={{ margin: 0 }}>Manual Wallet</h2>
          {onRemove && (
            <button
              onClick={onRemove}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Remove
            </button>
          )}
        </div>

        <Wallet seedPhrase={validatedSeed} network={network} />
      </div>
    );
  }

  // Show input form
  return (
    <div
      style={{
        padding: '20px',
        border: '2px dashed #6c757d',
        borderRadius: '8px',
        marginBottom: '20px',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
        }}
      >
        <h2 style={{ margin: 0 }}>Add Manual Wallet</h2>
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="seed-input" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Seed Phrase (24 words):
        </label>
        <textarea
          id="seed-input"
          value={seedInput}
          onChange={handleSeedChange}
          placeholder="Enter your 24-word seed phrase separated by spaces..."
          rows={4}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            fontFamily: 'monospace',
            border: validationError ? '2px solid #dc3545' : '1px solid #ced4da',
            borderRadius: '4px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        {validationError && (
          <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>⚠️ {validationError}</p>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="network-select" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Network:
        </label>
        <select
          id="network-select"
          value={network}
          onChange={handleNetworkChange}
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
          <option value="TESTNET">Testnet</option>
          <option value="MAINNET">Mainnet</option>
        </select>
      </div>

      <button
        onClick={handleConnect}
        disabled={!seedInput.trim()}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          fontWeight: 'bold',
          backgroundColor: seedInput.trim() ? '#28a745' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: seedInput.trim() ? 'pointer' : 'not-allowed',
          transition: 'background-color 0.2s',
        }}
      >
        Connect Wallet
      </button>
    </div>
  );
}
