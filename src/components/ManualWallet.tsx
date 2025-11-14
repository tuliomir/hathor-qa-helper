/**
 * Manual Wallet Input Component
 * Allows users to input seed phrase and select network manually
 */

import { useState, useEffect, useRef } from 'react';
import Wallet from './Wallet';
import ImagePreview from './ImagePreview';
import CameraCapture from './CameraCapture';
import { treatSeedWords } from '../utils/walletUtils';
import { extractSeedWordsFromImage } from '../utils/ocrService';
import type { NetworkType } from '../constants/network';

interface ManualWalletProps {
  onRemove?: () => void;
}

export default function ManualWallet({ onRemove }: ManualWalletProps) {
  const [seedInput, setSeedInput] = useState('');
  const [network, setNetwork] = useState<NetworkType>('TESTNET');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invalidWords, setInvalidWords] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [validatedSeed, setValidatedSeed] = useState<string | null>(null);

  // OCR-related state
  const [pastedImageUrl, setPastedImageUrl] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleConnect = () => {
    // Validate seed input
    const { valid: validation, treatedWords, error, invalidWords: invalidWordsList } = treatSeedWords(seedInput);

    if (!validation) {
      setValidationError(error || 'Invalid seed phrase');
      setInvalidWords(invalidWordsList || []);
      return;
    }

    // Clear any previous errors
    setValidationError(null);
    setInvalidWords([]);

    // Set the validated seed and mark as connected
    setValidatedSeed(treatedWords);
    setIsConnected(true);
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
    } catch (error) {
      setValidationError('An error occurred while processing the image');
      setPastedImageUrl(null);
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

  // Focus textarea on mount to enable paste
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

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
            <p style={{ color: '#dc3545', fontSize: '14px', margin: '0 0 5px 0' }}>
              ⚠️ {validationError}
            </p>
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
    </div>
  );
}
