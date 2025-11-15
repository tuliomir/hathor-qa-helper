/**
 * Wallet Initialization Stage
 * Allows users to add wallets and explicitly start/stop them
 * Wallets persist globally across all stages
 */

import { useState, useRef, useEffect } from 'react';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch } from '../../store/hooks';
import { startWallet, stopWallet } from '../../store/slices/walletStoreSlice';
import ImagePreview from '../ImagePreview';
import CameraCapture from '../CameraCapture';
import { treatSeedWords } from '../../utils/walletUtils';
import { extractSeedWordsFromImage } from '../../utils/ocrService';
import type { NetworkType } from '../../constants/network';

export default function WalletInitialization() {
  const dispatch = useAppDispatch();
  const { addWallet, removeWallet, getAllWallets, updateFriendlyName } = useWalletStore();

  const [seedInput, setSeedInput] = useState('');
  const [walletName, setWalletName] = useState('');
  const [network, setNetwork] = useState<NetworkType>('TESTNET');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invalidWords, setInvalidWords] = useState<string[]>([]);

  // OCR-related state
  const [pastedImageUrl, setPastedImageUrl] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const wallets = getAllWallets();

  const handleAddWallet = () => {
    // Validate seed input
    const { valid: validation, treatedWords, error, invalidWords: invalidWordsList } = treatSeedWords(seedInput);

    if (!validation) {
      setValidationError(error || 'Invalid seed phrase');
      setInvalidWords(invalidWordsList || []);
      return;
    }

    if (!walletName.trim()) {
      setValidationError('Please enter a wallet name');
      return;
    }

    // Clear any previous errors
    setValidationError(null);
    setInvalidWords([]);

    // Add wallet to global store
    addWallet({
      friendlyName: walletName,
      seedWords: treatedWords,
      network,
    });

    // Clear form
    setSeedInput('');
    setWalletName('');
    setNetwork('TESTNET');
  };

  const handleSeedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSeedInput(e.target.value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
      setInvalidWords([]);
    }
  };

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNetwork(e.target.value as NetworkType);
  };

  // Handle clipboard paste event
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Look for image in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault(); // Prevent default paste behavior for images

        const blob = item.getAsFile();
        if (!blob) continue;

        // Convert blob to data URL
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageDataUrl = event.target?.result as string;
          setPastedImageUrl(imageDataUrl);
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  };

  // Handle OCR extraction
  const handleExtractText = async (imageDataUrl: string) => {
    setIsProcessingOcr(true);

    try {
      const result = await extractSeedWordsFromImage(imageDataUrl);

      if (result.success) {
        setSeedInput(result.seedWords);
        setPastedImageUrl(null);
        // Clear any previous validation errors
        setValidationError(null);
      } else {
        setValidationError(result.error || 'Failed to extract seed words from image');
        setPastedImageUrl(null);
      }
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // Handle cancel preview
  const handleCancelPreview = () => {
    setPastedImageUrl(null);
  };

  // Handle camera open
  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  // Handle camera capture
  const handleCameraCapture = (imageDataUrl: string) => {
    setShowCamera(false);
    setPastedImageUrl(imageDataUrl);
  };

  // Handle camera cancel
  const handleCameraCancel = () => {
    setShowCamera(false);
  };

  // Handle edit wallet name
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

  // Handle start wallet
  const handleStartWallet = async (walletId: string) => {
    try {
      await dispatch(startWallet(walletId)).unwrap();
    } catch (error) {
      console.error('Failed to start wallet:', error);
    }
  };

  // Handle stop wallet
  const handleStopWallet = async (walletId: string) => {
    try {
      await dispatch(stopWallet(walletId)).unwrap();
    } catch (error) {
      console.error('Failed to stop wallet:', error);
    }
  };

  // Handle remove wallet
  const handleRemoveWallet = (walletId: string) => {
    if (window.confirm('Are you sure you want to remove this wallet?')) {
      removeWallet(walletId);
    }
  };

  // Truncate seed words for display
  const truncateSeed = (seed: string, maxLength: number = 30) => {
    if (seed.length <= maxLength) return seed;
    return seed.substring(0, maxLength) + '...';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'connecting':
      case 'syncing':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  // Focus textarea on mount to enable paste
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Wallet Initialization</h1>
      <p style={{ color: '#6c757d', marginBottom: '30px' }}>
        Add wallets and explicitly start them. Wallets persist globally across all QA stages until stopped or removed.
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
          <label htmlFor="wallet-name" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Wallet Name:
          </label>
          <input
            id="wallet-name"
            type="text"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '5px',
            }}
          >
            <label htmlFor="seed-input" style={{ fontWeight: 'bold', margin: 0 }}>
              Seed Phrase (24 words):
            </label>
            <button
              onClick={handleOpenCamera}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>📷</span>
              Open Camera
            </button>
          </div>
          <textarea
            ref={textareaRef}
            id="seed-input"
            value={seedInput}
            onChange={handleSeedChange}
            onPaste={handlePaste}
            placeholder="Enter your 24-word seed phrase separated by spaces, or paste an image with seed words..."
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
          <p style={{ color: '#6c757d', fontSize: '13px', marginTop: '8px', marginBottom: '0' }}>
            💡 <strong>Tip:</strong> You can paste an image of your seed words here for automatic extraction using OCR.
          </p>
          {validationError && (
            <div style={{ marginTop: '5px' }}>
              <p style={{ color: '#dc3545', fontSize: '14px', margin: '0 0 5px 0' }}>⚠️ {validationError}</p>
              {invalidWords.length > 0 && (
                <p style={{ color: '#dc3545', fontSize: '13px', margin: '0' }}>
                  Invalid words: <strong>{invalidWords.join(', ')}</strong>
                </p>
              )}
            </div>
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
          onClick={handleAddWallet}
          disabled={!seedInput.trim() || !walletName.trim()}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: seedInput.trim() && walletName.trim() ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: seedInput.trim() && walletName.trim() ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
          }}
        >
          Add Wallet
        </button>
      </div>

      {/* Camera capture */}
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onCancel={handleCameraCancel} />}

      {/* Image preview and OCR processing */}
      {pastedImageUrl && (
        <ImagePreview
          imageDataUrl={pastedImageUrl}
          onExtractText={handleExtractText}
          onCancel={handleCancelPreview}
          isProcessing={isProcessingOcr}
        />
      )}

      {/* Wallets Table */}
      <div>
        <h2>Registered Wallets ({wallets.length})</h2>
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
            <p style={{ fontSize: '18px', margin: 0 }}>No wallets registered yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Seed (truncated)</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Network</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>First Address</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet) => (
                  <tr key={wallet.metadata.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>
                      {editingId === wallet.metadata.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          style={{
                            padding: '6px',
                            fontSize: '14px',
                            border: '1px solid #007bff',
                            borderRadius: '4px',
                            width: '100%',
                          }}
                        />
                      ) : (
                        <strong>{wallet.metadata.friendlyName}</strong>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#6c757d' }}>
                      {truncateSeed(wallet.metadata.seedWords, 40)}
                    </td>
                    <td style={{ padding: '12px' }}>{wallet.metadata.network}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          color: getStatusColor(wallet.status),
                          fontWeight: 'bold',
                          fontSize: '14px',
                        }}
                      >
                        {wallet.status}
                      </span>
                      {wallet.error && (
                        <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '4px' }}>
                          {wallet.error}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: wallet.firstAddress ? '#28a745' : '#6c757d',
                      }}
                    >
                      {wallet.firstAddress || '-'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {editingId === wallet.metadata.id ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              style={{
                                padding: '6px 12px',
                                fontSize: '13px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{
                                padding: '6px 12px',
                                fontSize: '13px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {wallet.status === 'idle' || wallet.status === 'error' ? (
                              <button
                                onClick={() => handleStartWallet(wallet.metadata.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '13px',
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                ▶ Start
                              </button>
                            ) : wallet.status === 'ready' ? (
                              <button
                                onClick={() => handleStopWallet(wallet.metadata.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '13px',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                ⏹ Stop
                              </button>
                            ) : (
                              <button
                                disabled
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '13px',
                                  backgroundColor: '#6c757d',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'not-allowed',
                                }}
                              >
                                {wallet.status === 'connecting' ? '⏳ Connecting...' : '⏳ Syncing...'}
                              </button>
                            )}
                            <button
                              onClick={() => handleStartEdit(wallet.metadata.id, wallet.metadata.friendlyName)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '13px',
                                backgroundColor: '#ffc107',
                                color: 'black',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              ✏️ Rename
                            </button>
                            <button
                              onClick={() => handleRemoveWallet(wallet.metadata.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '13px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              🗑️ Remove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
