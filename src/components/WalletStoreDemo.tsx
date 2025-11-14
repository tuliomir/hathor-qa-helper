/**
 * Demo component to test the wallet store functionality
 * This component demonstrates how to use the wallet store context
 */

import { useState } from 'react';
import { useWalletStore } from '../hooks/useWalletStore';
import type { NetworkType } from '../constants/network';

export default function WalletStoreDemo() {
  const {
    addWallet,
    removeWallet,
    updateFriendlyName,
    getAllWallets,
  } = useWalletStore();

  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletSeeds, setNewWalletSeeds] = useState('');
  const [newWalletNetwork, setNewWalletNetwork] = useState<NetworkType>('TESTNET');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const wallets = getAllWallets();

  const handleAddWallet = () => {
    if (!newWalletName.trim() || !newWalletSeeds.trim()) {
      alert('Please enter both a name and seed words');
      return;
    }

    addWallet({
      friendlyName: newWalletName,
      seedWords: newWalletSeeds,
      network: newWalletNetwork,
    });

    // Clear form
    setNewWalletName('');
    setNewWalletSeeds('');
    setNewWalletNetwork('TESTNET');
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      updateFriendlyName(editingId, editingName);
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Wallet Store Demo</h1>
      <p style={{ color: '#6c757d', marginBottom: '30px' }}>
        This demo shows the wallet store functionality. Data persists in LocalStorage.
      </p>

      {/* Add Wallet Form */}
      <div
        style={{
          padding: '20px',
          border: '2px solid #007bff',
          borderRadius: '8px',
          marginBottom: '30px',
          backgroundColor: '#f8f9fa',
        }}
      >
        <h2>Add New Wallet</h2>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Friendly Name:
          </label>
          <input
            type="text"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            placeholder="e.g., Android Nov14"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Seed Words:
          </label>
          <textarea
            value={newWalletSeeds}
            onChange={(e) => setNewWalletSeeds(e.target.value)}
            placeholder="Enter 24 seed words..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              fontFamily: 'monospace',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Network:
          </label>
          <select
            value={newWalletNetwork}
            onChange={(e) => setNewWalletNetwork(e.target.value as NetworkType)}
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
          }}
        >
          Add Wallet
        </button>
      </div>

      {/* Wallets List */}
      <div>
        <h2>Stored Wallets ({wallets.length})</h2>
        {wallets.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              border: '2px dashed #6c757d',
              borderRadius: '8px',
              color: '#6c757d',
            }}
          >
            <p style={{ fontSize: '18px', margin: 0 }}>No wallets stored yet</p>
          </div>
        ) : (
          wallets.map((wallet) => (
            <div
              key={wallet.metadata.id}
              style={{
                padding: '15px',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                marginBottom: '15px',
                backgroundColor: 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  {editingId === wallet.metadata.id ? (
                    <div style={{ marginBottom: '10px' }}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        style={{
                          padding: '8px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          border: '2px solid #007bff',
                          borderRadius: '4px',
                          marginRight: '10px',
                        }}
                      />
                      <button
                        onClick={handleSaveEdit}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '5px',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h3 style={{ margin: '0 0 10px 0' }}>{wallet.metadata.friendlyName}</h3>
                  )}

                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    <strong>Network:</strong> {wallet.metadata.network}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    <strong>Status:</strong> {wallet.status}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '12px', color: '#6c757d' }}>
                    <strong>ID:</strong> {wallet.metadata.id}
                  </p>
                  <p
                    style={{
                      margin: '5px 0',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      color: '#6c757d',
                    }}
                  >
                    <strong>Seeds:</strong> {wallet.metadata.seedWords.substring(0, 50)}...
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
                      <strong>Address:</strong> {wallet.firstAddress}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {editingId !== wallet.metadata.id && (
                    <button
                      onClick={() => handleStartEdit(wallet.metadata.id, wallet.metadata.friendlyName)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ffc107',
                        color: 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Edit Name
                    </button>
                  )}
                  <button
                    onClick={() => removeWallet(wallet.metadata.id)}
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
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* LocalStorage Info */}
      <div
        style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#d1ecf1',
          border: '1px solid #17a2b8',
          borderRadius: '4px',
        }}
      >
        <p style={{ margin: 0, fontSize: '14px' }}>
          <strong>Note:</strong> Wallet metadata (names, seeds, network) is persisted in LocalStorage.
          Refresh the page to see that your wallets are still here!
        </p>
      </div>
    </div>
  );
}
