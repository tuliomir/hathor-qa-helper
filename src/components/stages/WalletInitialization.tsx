/**
 * Wallet Initialization Stage
 * Allows users to initialize wallets by entering seed words
 * Integrates with the global wallet store
 */

import { useState, useRef, useEffect } from 'react';
import { useWalletStore } from '../../hooks/useWalletStore';
import Wallet from '../Wallet';
import ImagePreview from '../ImagePreview';
import CameraCapture from '../CameraCapture';
import { treatSeedWords } from '../../utils/walletUtils';
import { extractSeedWordsFromImage } from '../../utils/ocrService';
import type { NetworkType } from '../../constants/network';

export default function WalletInitialization() {
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
        Initialize wallets by entering seed words. All wallets are stored in the global wallet store and can be used
        across different QA stages.
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

      {/* Initialized Wallets List */}
      <div>
        <h2>Initialized Wallets ({wallets.length})</h2>
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
            <p style={{ fontSize: '18px', margin: 0 }}>No wallets initialized yet</p>
          </div>
        ) : (
          wallets.map((wallet) => (
            <div
              key={wallet.metadata.id}
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
                {editingId === wallet.metadata.id ? (
                  <div style={{ flex: 1, display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: '2px solid #007bff',
                        borderRadius: '4px',
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
                  <>
                    <h3 style={{ margin: 0 }}>{wallet.metadata.friendlyName}</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
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
                        Rename
                      </button>
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
                  </>
                )}
              </div>

              <Wallet
                seedPhrase={wallet.metadata.seedWords}
                network={wallet.metadata.network}
                onWalletReady={(walletInstance) => {
                  // This will be handled by the Wallet component integration with the store
                  console.log('Wallet ready:', wallet.metadata.id, walletInstance);
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
