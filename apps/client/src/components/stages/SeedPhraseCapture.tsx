/**
 * Seed Phrase Capture Component
 * Extracts seed words from images using OCR
 * Reusable component for capturing and validating seed phrases from screenshots
 * Can also register the captured seed as a new wallet
 */

import { useRef, useState } from 'react';
import { MdAdd, MdCamera, MdCheck, MdContentCopy } from 'react-icons/md';
import ImagePreview from '../ImagePreview';
import CameraCapture from '../CameraCapture';
import OCRReferenceImage from '../OCRReferenceImage';
import OCRReferenceModal from '../OCRReferenceModal';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { didYouMean, treatSeedWords } from '../../utils/walletUtils';
import { extractSeedWordsFromImage } from '../../utils/ocrService';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch } from '../../store/hooks';
import { setTestWallet } from '../../store/slices/walletSelectionSlice';
import { startWallet } from '../../store/slices/walletStoreSlice';
import { NETWORK_CONFIG, NETWORK_KEYS, type NetworkKey } from '../../constants/network';

export default function SeedPhraseCapture() {
  const dispatch = useAppDispatch();
  const { addWallet } = useWalletStore();

  const [seedInput, setSeedInput] = useState('');
  const [walletName, setWalletName] = useState('');
  const [network, setNetwork] = useState<NetworkKey>('TESTNET');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invalidWords, setInvalidWords] = useState<string[]>([]);
  const [pastedImageUrl, setPastedImageUrl] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrSourceImageUrl, setOcrSourceImageUrl] = useState<string | null>(null);
  const [showOcrReferenceModal, setShowOcrReferenceModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletAdded, setWalletAdded] = useState(false);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [addWalletError, setAddWalletError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSeedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSeedInput = e.target.value;
    setSeedInput(newSeedInput);

    if (newSeedInput.trim()) {
      const { valid, error, invalidWords: invalidWordsList } = treatSeedWords(newSeedInput);
      if (!valid) {
        setValidationError(error || 'Invalid seed phrase');
        setInvalidWords(invalidWordsList || []);
      } else {
        setValidationError(null);
        setInvalidWords([]);
      }
    } else {
      setValidationError(null);
      setInvalidWords([]);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = (event) => setPastedImageUrl(event.target?.result as string);
        reader.readAsDataURL(blob);
        break;
      }
    }
  };

  const handleExtractText = async (imageDataUrl: string) => {
    setIsProcessingOcr(true);
    try {
      const result = await extractSeedWordsFromImage(imageDataUrl);
      if (result.success) {
        setSeedInput(result.seedWords);
        setPastedImageUrl(null);
        setOcrSourceImageUrl(imageDataUrl);

        // Validate the extracted seed words
        const { valid, error, invalidWords: invalidWordsList } = treatSeedWords(result.seedWords);
        if (!valid) {
          setValidationError(error || 'Invalid seed phrase extracted from image');
          setInvalidWords(invalidWordsList || []);
        } else {
          setValidationError(null);
          setInvalidWords([]);
        }
      } else {
        setValidationError(result.error || 'Failed to extract seed words from image');
        setPastedImageUrl(null);
        setOcrSourceImageUrl(null);
      }
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleCopy = async () => {
    if (seedInput) {
      await navigator.clipboard.writeText(seedInput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddWallet = async () => {
    setAddWalletError(null);

    const { valid, treatedWords, error } = treatSeedWords(seedInput);
    if (!valid) {
      setAddWalletError(error || 'Invalid seed phrase');
      return;
    }

    if (!walletName.trim()) {
      setAddWalletError('Please enter a wallet name');
      return;
    }

    setIsAddingWallet(true);
    try {
      // Add the wallet
      const walletId = addWallet({
        friendlyName: walletName.trim(),
        seedWords: treatedWords,
        network,
      });

      // Start the wallet
      await dispatch(startWallet(walletId)).unwrap();

      // Set as test wallet
      dispatch(setTestWallet(walletId));

      setWalletAdded(true);
    } catch (error) {
      console.error('Failed to add wallet:', error);
      setAddWalletError(error instanceof Error ? error.message : 'Failed to add wallet');
    } finally {
      setIsAddingWallet(false);
    }
  };

  const isValid = seedInput.trim() && !validationError;
  const canAddWallet = isValid && walletName.trim() && !walletAdded;

  const applySuggestion = (w: string, suggestion: string) => {
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + escapeRegExp(w) + '\\b', 'gi');
    const newSeed = seedInput.replace(re, suggestion);
    setSeedInput(newSeed);
    const { valid: v, invalidWords: newInvalid } = treatSeedWords(newSeed);
    if (v) {
      setValidationError(null);
      setInvalidWords([]);
    } else {
      setValidationError('Invalid seed phrase');
      setInvalidWords(newInvalid || []);
    }
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Seed phrase capture"
        description="Paste a screenshot of the seed words screen or capture it with the camera. OCR extracts the words."
      >
        <Field
          label="Extracted seed phrase"
          htmlFor="seed-capture-input"
          hint="Paste an image (Ctrl+V / Cmd+V) or use the camera to capture the seed words screen."
          trailing={
            <>
              <button type="button" onClick={() => setShowCamera(true)} className="btn btn-secondary btn-sm">
                <MdCamera aria-hidden="true" />
                Camera
              </button>
              {seedInput && (
                <button type="button" onClick={handleCopy} className="btn btn-ghost btn-sm">
                  {copied ? <MdCheck aria-hidden="true" /> : <MdContentCopy aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </>
          }
        >
          <textarea
            ref={textareaRef}
            value={seedInput}
            onChange={handleSeedChange}
            onPaste={handlePaste}
            placeholder="Paste an image of the seed words here, or type or paste the seed phrase"
            rows={3}
            className={`textarea min-h-[4.5rem] w-full resize-y border-field-border font-mono text-data ${
              validationError ? 'textarea-error' : isValid ? 'textarea-success' : ''
            }`}
          />
        </Field>

        {seedInput &&
          (isValid ? (
            <Callout tone="success">Valid seed phrase ({seedInput.trim().split(/\s+/).length} words)</Callout>
          ) : (
            <Callout tone="error" title={validationError}>
              {invalidWords.length > 0 && (
                <ul>
                  {invalidWords.map((w, idx) => {
                    const suggestion = didYouMean(w);
                    return (
                      <li key={`${w}-${idx}`}>
                        <span className="mr-2 font-mono text-data">{w}</span>
                        {suggestion ? (
                          <button
                            type="button"
                            onClick={() => applySuggestion(w, suggestion)}
                            className="link link-primary"
                          >
                            Did you mean <strong>{suggestion}</strong>?
                          </button>
                        ) : (
                          <span className="text-ink-muted">(no suggestion)</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Callout>
          ))}

        {isValid && (
          <section className="flex flex-col gap-3 border-t border-base-300 pt-3">
            <h3 className="m-0 text-body font-semibold">Register as test wallet</h3>

            {walletAdded ? (
              <Callout tone="success">Wallet added and set as the test wallet.</Callout>
            ) : (
              <>
                {!walletName.trim() && (
                  <Callout tone="info">Add this seed phrase as a test wallet to keep testing with it.</Callout>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Wallet name" htmlFor="wallet-name-input" className="md:col-span-2">
                    <input
                      type="text"
                      value={walletName}
                      onChange={(e) => {
                        setWalletName(e.target.value);
                        setAddWalletError(null);
                      }}
                      placeholder="e.g. Desktop QA wallet"
                      className="input w-full"
                    />
                  </Field>
                  <Field label="Network" htmlFor="network-select">
                    <select
                      value={network}
                      onChange={(e) => setNetwork(e.target.value as NetworkKey)}
                      className="select w-full"
                    >
                      {NETWORK_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {NETWORK_CONFIG[key].label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {addWalletError && <Callout tone="error">{addWalletError}</Callout>}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddWallet}
                    disabled={!canAddWallet || isAddingWallet}
                    className="btn btn-primary"
                  >
                    {isAddingWallet ? (
                      <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                    ) : (
                      <MdAdd aria-hidden="true" />
                    )}
                    {isAddingWallet ? 'Adding wallet' : 'Add as test wallet'}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {ocrSourceImageUrl && (
          <section className="flex flex-col gap-2 border-t border-base-300 pt-3">
            <h3 className="m-0 text-body font-semibold">OCR source image</h3>
            <OCRReferenceImage
              imageDataUrl={ocrSourceImageUrl}
              onExpand={() => setShowOcrReferenceModal(true)}
              onDismiss={() => setOcrSourceImageUrl(null)}
            />
          </section>
        )}
      </Panel>

      {/* Modals */}
      {showCamera && (
        <CameraCapture
          onCapture={(url) => {
            setShowCamera(false);
            setPastedImageUrl(url);
          }}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {pastedImageUrl && (
        <ImagePreview
          imageDataUrl={pastedImageUrl}
          onExtractText={handleExtractText}
          onCancel={() => setPastedImageUrl(null)}
          isProcessing={isProcessingOcr}
        />
      )}

      {showOcrReferenceModal && ocrSourceImageUrl && (
        <OCRReferenceModal imageDataUrl={ocrSourceImageUrl} onClose={() => setShowOcrReferenceModal(false)} />
      )}
    </div>
  );
}
