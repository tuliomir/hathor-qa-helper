/**
 * Address QR Validator Component
 * Validates addresses through:
 * - Text input (paste address)
 * - Image paste from clipboard (QR code)
 * - File upload (QR code with filename validation)
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import { walletInstancesMap } from '../../store/slices/walletStoreSlice';
import CopyButton from '../common/CopyButton';
import Loading from '../common/Loading';

interface ValidationResult {
  address: string;
  isValid: boolean;
  walletName?: string;
  addressIndex?: number;
  source: 'text' | 'qr-paste' | 'qr-file';
  filename?: string;
  filenameMatch?: boolean;
  error?: string;
}

export default function AddressQRValidator() {
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const { getWallet, getAllWallets } = useWalletStore();

  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;
  const wallets = getAllWallets();

  const [addressInput, setAddressInput] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [pastedImageUrl, setPastedImageUrl] = useState<string | null>(null);
  const [isProcessingQR, setIsProcessingQR] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);

  // Handle clipboard paste for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              setPastedImageUrl(dataUrl);
              processQRFromImage(dataUrl, 'qr-paste');
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [testWallet]);

  /**
   * Clean an address string (remove hathor: prefix)
   */
  const cleanAddress = (address: string): string => {
    const hathorPrefix = 'hathor:';
    const cleaned = address.startsWith(hathorPrefix)
      ? address.substring(hathorPrefix.length)
      : address.trim();
    return cleaned;
  };

  /**
   * Validate an address against the test wallet
   */
  const validateAddress = async (
    rawAddress: string,
    source: ValidationResult['source'],
    filename?: string
  ): Promise<ValidationResult> => {
    const address = cleanAddress(rawAddress);

    if (!address) {
      return {
        address: rawAddress,
        isValid: false,
        source,
        error: 'Empty address',
      };
    }

    // Check filename match if provided
    let filenameMatch: boolean | undefined;
    if (filename) {
      // Extract address from filename (remove extension)
      const filenameWithoutExt = filename.replace(/\.[^.]+$/, '');
      filenameMatch = (filenameWithoutExt.indexOf(address) > -1);
    }

    // Try to find which wallet this address belongs to
    for (const wallet of wallets) {
      if (wallet.status !== 'ready') continue;

      const instance = walletInstancesMap.get(wallet.metadata.id);
      if (!instance) continue;

      try {
        const addressIndex = await instance.getAddressIndex(address);
        if (addressIndex !== null && addressIndex !== undefined) {
          return {
            address,
            isValid: true,
            walletName: wallet.metadata.friendlyName,
            addressIndex,
            source,
            filename,
            filenameMatch,
          };
        }
      } catch {
        // Address not in this wallet, continue
      }
    }

    // Address not found in any wallet
    return {
      address,
      isValid: false,
      source,
      filename,
      filenameMatch,
      error: 'Address not found in any known wallet',
    };
  };

  /**
   * Process QR code from image data URL
   */
  const processQRFromImage = async (
    imageDataUrl: string,
    source: 'qr-paste' | 'qr-file',
    filename?: string
  ) => {
    setIsProcessingQR(true);
    setValidationResult(null);

    try {
      const codeReader = new BrowserQRCodeReader();

      // Create an image element to decode from
      const img = new Image();
      img.src = imageDataUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Decode QR from image
      const result = await codeReader.decodeFromImageElement(img);
      const qrContent = result.getText();

      console.log('QR Code decoded:', qrContent);

      // Validate the decoded address
      const validation = await validateAddress(qrContent, source, filename);
      setValidationResult(validation);
    } catch (err) {
      console.error('QR decode error:', err);
      setValidationResult({
        address: '',
        isValid: false,
        source,
        filename,
        error: 'Failed to read QR code from image. Make sure it contains a valid QR code.',
      });
    } finally {
      setIsProcessingQR(false);
      setPastedImageUrl(null);
    }
  };

  /**
   * Handle text address validation
   */
  const handleValidateText = async () => {
    if (!addressInput.trim()) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await validateAddress(addressInput, 'text');
      setValidationResult(result);
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      processQRFromImage(dataUrl, 'qr-file', file.name);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  /**
   * Clear validation result
   */
  const handleClear = () => {
    setValidationResult(null);
    setAddressInput('');
    setPastedImageUrl(null);
  };

  if (!testWalletId) {
    return (
      <div className="p-4 bg-yellow-50 border border-warning rounded-lg">
        <p className="text-yellow-800 m-0 text-sm mb-2">No test wallet selected.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-800 underline text-sm">
          Go to Wallet Initialization to select a test wallet
        </Link>
      </div>
    );
  }

  if (!testWallet) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 m-0 text-sm">
          <span className="inline-block animate-pulse mr-2">⏳</span>
          Wallet is connecting... Please wait.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loading overlay */}
      {isProcessingQR && <Loading overlay message="Reading QR code..." />}

      <div className="card-primary">
        <h2 className="text-xl font-bold mb-2">Address & QR Code Validator</h2>
        <p className="text-muted text-sm mb-4">
          Validate addresses by pasting text, pasting a QR code image, or uploading a QR code file.
        </p>

        {/* Text Input Section */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-2 text-gray-700">1. Paste Address</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleValidateText()}
              placeholder="Paste a Hathor address..."
              className="input flex-1 font-mono text-sm"
              disabled={isValidating}
            />
            <button
              onClick={handleValidateText}
              disabled={isValidating || !addressInput.trim()}
              className="btn btn-primary px-4 py-2 whitespace-nowrap"
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </button>
          </div>
        </div>

        {/* Image Paste Section */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-2 text-gray-700">2. Paste QR Code Image</h3>
          <div
            ref={pasteAreaRef}
            className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <p className="text-muted text-sm m-0">
              Take a screenshot of the QR code and press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+V</kbd> / <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Cmd+V</kbd> anywhere on this page
            </p>
            {pastedImageUrl && (
              <div className="mt-4">
                <img src={pastedImageUrl} alt="Pasted QR" className="max-h-32 mx-auto rounded border" />
                <p className="text-xs text-muted mt-2">Processing...</p>
              </div>
            )}
          </div>
        </div>

        {/* File Upload Section */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-2 text-gray-700">3. Upload QR Code File</h3>
          <p className="text-xs text-muted mb-2">
            Upload a QR code image file. The filename will be compared with the address content.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary px-4 py-2"
          >
            Choose File...
          </button>
        </div>

        {/* Validation Result */}
        {validationResult && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold m-0">Validation Result</h3>
              <button onClick={handleClear} className="btn btn-ghost text-sm">
                Clear
              </button>
            </div>

            {/* Source indicator */}
            <div className="mb-3">
              <span className="text-xs text-muted">Source: </span>
              <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded">
                {validationResult.source === 'text' && 'Text Input'}
                {validationResult.source === 'qr-paste' && 'Pasted QR Image'}
                {validationResult.source === 'qr-file' && 'Uploaded File'}
              </span>
            </div>

            {/* Address display */}
            {validationResult.address && (
              <div className="mb-4">
                <p className="text-xs text-muted mb-1">Address:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs p-2 bg-gray-100 rounded break-all flex-1">
                    {validationResult.address}
                  </code>
                  <CopyButton text={validationResult.address} label="" />
                </div>
              </div>
            )}

            {/* Result status */}
            {validationResult.isValid ? (
              <div className="p-4 bg-green-50 border border-success rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-success text-xl">✓</span>
                  <div>
                    <p className="font-bold text-green-900 m-0">Valid Address</p>
                    <p className="text-sm text-green-800 mt-1 mb-0">
                      Belongs to <strong>{validationResult.walletName}</strong>
                      {validationResult.addressIndex !== undefined && (
                        <> at index <strong>{validationResult.addressIndex}</strong></>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-danger rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-danger text-xl">✗</span>
                  <div>
                    <p className="font-bold text-red-900 m-0">Invalid or Unknown</p>
                    {validationResult.error && (
                      <p className="text-sm text-red-800 mt-1 mb-0">{validationResult.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Filename validation (for file uploads) */}
            {validationResult.filename && (
              <div className="mt-4">
                <p className="text-xs text-muted mb-1">Filename:</p>
                <code className="text-xs p-2 bg-gray-100 rounded block mb-2">
                  {validationResult.filename}
                </code>

                {validationResult.filenameMatch !== undefined && (
                  <div
                    className={`p-3 rounded ${
                      validationResult.filenameMatch
                        ? 'bg-green-50 border border-success'
                        : 'bg-red-50 border border-danger'
                    }`}
                  >
                    {validationResult.filenameMatch ? (
                      <p className="text-sm text-green-800 m-0">
                        <span className="font-bold">✓ Filename matches address</span>
                      </p>
                    ) : (
                      <p className="text-sm text-red-800 m-0">
                        <span className="font-bold">✗ Filename does NOT match address</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
