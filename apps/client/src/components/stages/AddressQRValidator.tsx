/**
 * Address QR Validator Component
 * Validates addresses through:
 * - Text input (paste address)
 * - Image paste from clipboard (QR code)
 * - File upload (QR code with filename validation)
 */

import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import { walletInstancesMap } from '../../store/slices/walletStoreSlice';
import { MdUploadFile } from 'react-icons/md';
import { Identifier } from '../common/Identifier';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { EmptyState } from '../ui/EmptyState';
import { useRequireTestWallet } from '../../hooks/useRequirements';

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
  const testWalletRequirement = useRequireTestWallet();

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
    const cleaned = address.startsWith(hathorPrefix) ? address.substring(hathorPrefix.length) : address.trim();
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
      filenameMatch = filenameWithoutExt.indexOf(address) > -1;
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
  const processQRFromImage = async (imageDataUrl: string, source: 'qr-paste' | 'qr-file', filename?: string) => {
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

  const sourceLabel: Record<ValidationResult['source'], string> = {
    text: 'Text input',
    'qr-paste': 'Pasted QR image',
    'qr-file': 'Uploaded file',
  };

  return (
    <div className="flex flex-col gap-4">
      <PreconditionStrip requirements={[testWalletRequirement]} />
      <Panel
        title="Address and QR code validator"
        description="Validate addresses by pasting text, pasting a QR code image, or uploading a QR code file."
      >
        {!testWalletId ? (
          <EmptyState>Select a test wallet to validate addresses against it.</EmptyState>
        ) : !testWallet ? (
          <p className="m-0 flex items-center gap-2 text-body text-ink-muted">
            <span className="loading loading-spinner loading-xs" aria-hidden="true" />
            Wallet is connecting…
          </p>
        ) : (
          <>
            <section className="flex flex-col gap-2">
              <h3 className="m-0 text-body font-semibold">1. Paste address</h3>
              <Field label="Address" htmlFor="qr-validator-address" wireControl={false}>
                <div className="flex gap-2">
                  <input
                    id="qr-validator-address"
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleValidateText()}
                    placeholder="Paste a Hathor address"
                    className="input min-w-0 flex-1 font-mono text-data"
                    disabled={isValidating}
                  />
                  <button
                    type="button"
                    onClick={handleValidateText}
                    disabled={isValidating || !addressInput.trim()}
                    className="btn btn-primary whitespace-nowrap"
                  >
                    {isValidating && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
                    Validate
                  </button>
                </div>
              </Field>
            </section>

            <section className="flex flex-col gap-2 border-t border-base-300 pt-3">
              <h3 className="m-0 text-body font-semibold">2. Paste QR code image</h3>
              <div ref={pasteAreaRef} className="flex flex-col items-start gap-3 rounded-box bg-base-200 p-3">
                <p className="m-0 text-body text-ink-muted">
                  Take a screenshot of the QR code and press <kbd className="kbd kbd-sm">Ctrl+V</kbd> /{' '}
                  <kbd className="kbd kbd-sm">Cmd+V</kbd> anywhere on this page.
                </p>
                {pastedImageUrl && (
                  <img
                    src={pastedImageUrl}
                    alt="Pasted QR code"
                    className="max-h-32 rounded-field border border-base-300"
                  />
                )}
                {isProcessingQR && (
                  <p className="m-0 flex items-center gap-2 text-body text-ink-muted" role="status">
                    <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                    Reading QR code…
                  </p>
                )}
              </div>
            </section>

            <section className="flex flex-col items-start gap-2 border-t border-base-300 pt-3">
              <h3 className="m-0 text-body font-semibold">3. Upload QR code file</h3>
              <p className="m-0 text-body text-ink-muted">
                Upload a QR code image file. The filename is compared with the address it contains.
              </p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
                disabled={isProcessingQR}
              >
                <MdUploadFile aria-hidden="true" />
                Choose file
              </button>
            </section>

            {validationResult && (
              <section className="flex flex-col gap-3 border-t border-base-300 pt-3" aria-label="Validation result">
                <div className="flex items-center gap-2">
                  <h3 className="m-0 text-body font-semibold">Validation result</h3>
                  <span className="rounded-selector bg-base-200 px-1.5 text-caption text-ink-muted">
                    {sourceLabel[validationResult.source]}
                  </span>
                  <button type="button" onClick={handleClear} className="btn btn-ghost btn-sm ml-auto">
                    Clear
                  </button>
                </div>

                {validationResult.address && (
                  <dl className="m-0 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
                    <dt className="text-caption text-ink-muted">Address</dt>
                    <dd className="m-0 min-w-0">
                      <Identifier value={validationResult.address} kind="address" walletTag={false} />
                    </dd>
                  </dl>
                )}

                {validationResult.isValid ? (
                  <Callout tone="success" title="Valid address">
                    Belongs to <strong>{validationResult.walletName}</strong>
                    {validationResult.addressIndex !== undefined && (
                      <>
                        {' '}
                        at index <strong>{validationResult.addressIndex}</strong>
                      </>
                    )}
                  </Callout>
                ) : (
                  <Callout tone="error" title="Invalid or unknown">
                    {validationResult.error}
                  </Callout>
                )}

                {validationResult.filename && (
                  <div className="flex flex-col gap-2">
                    <dl className="m-0 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
                      <dt className="text-caption text-ink-muted">Filename</dt>
                      <dd className="m-0 min-w-0 truncate font-mono text-data" title={validationResult.filename}>
                        {validationResult.filename}
                      </dd>
                    </dl>
                    {validationResult.filenameMatch !== undefined &&
                      (validationResult.filenameMatch ? (
                        <Callout tone="success">Filename matches the address.</Callout>
                      ) : (
                        <Callout tone="error">Filename does not match the address.</Callout>
                      ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
