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
import Select from '../common/Select';
import { didYouMean, treatSeedWords } from '../../utils/walletUtils';
import { extractSeedWordsFromImage } from '../../utils/ocrService';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch } from '../../store/hooks';
import { setTestWallet } from '../../store/slices/walletSelectionSlice';
import { startWallet } from '../../store/slices/walletStoreSlice';
import type { NetworkType } from '../../constants/network';

export default function SeedPhraseCapture() {
  const dispatch = useAppDispatch();
  const { addWallet } = useWalletStore();

  const [seedInput, setSeedInput] = useState('');
  const [walletName, setWalletName] = useState('');
  const [network, setNetwork] = useState<NetworkType>('TESTNET');
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

  return (
    <div className="space-y-4">
      <div className="card-primary">
        <h2 className="text-xl font-bold mb-2">Seed Phrase Capture</h2>
        <p className="text-muted text-sm mb-4">
          Paste a screenshot of the seed words screen or use the camera to capture it.
          The OCR will extract the seed words automatically.
        </p>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="seed-capture-input" className="font-bold text-sm">
              Extracted Seed Phrase:
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCamera(true)}
                className="btn bg-info text-white hover:bg-cyan-600 text-xs flex items-center gap-1"
              >
                <MdCamera size={16} />
                Camera
              </button>
              {seedInput && (
                <button
                  onClick={handleCopy}
                  className="btn btn-secondary text-xs flex items-center gap-1"
                >
                  {copied ? <MdCheck size={16} /> : <MdContentCopy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            id="seed-capture-input"
            value={seedInput}
            onChange={handleSeedChange}
            onPaste={handlePaste}
            placeholder="Paste an image of the seed words here, or type/paste the seed phrase directly..."
            rows={3}
            className={`w-full font-mono text-sm resize-y ${
              validationError ? 'input-error' : isValid ? 'input border-success' : 'input'
            }`}
            style={{ minHeight: '4.5rem' }}
          />

          <p className="text-muted text-xs mt-2 mb-0">
            Paste an image (Ctrl+V / Cmd+V) or use the camera button to capture the seed words screen.
          </p>
        </div>

        {/* Validation Status */}
        {seedInput && (
          <div className={`p-3 rounded-lg ${isValid ? 'bg-green-50 border border-success' : 'bg-red-50 border border-danger'}`}>
            {isValid ? (
              <p className="text-success text-sm m-0 font-medium">
                Valid seed phrase ({seedInput.trim().split(/\s+/).length} words)
              </p>
            ) : (
              <>
                <p className="text-danger text-sm m-0 mb-2">
                  {validationError}
                </p>
                {invalidWords.length > 0 && (
                  <div className="text-danger text-xs">
                    <div className="font-bold mb-1">Invalid words:</div>
                    {invalidWords.map((w, idx) => {
                      const suggestion = didYouMean(w);
                      return (
                        <div key={`${w}-${idx}`} className="mb-1">
                          <span className="mr-2 font-mono">{w}</span>
                          {suggestion ? (
                            <button
                              type="button"
                              onClick={() => {
                                const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
                              }}
                              className="text-info underline cursor-pointer text-xs bg-transparent border-0 p-0"
                            >
                              Did you mean: <strong>{suggestion}</strong>?
                            </button>
                          ) : (
                            <span className="text-muted">(no suggestion)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Add Wallet Section - shown when seed is valid */}
        {isValid && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-bold mb-3">Register as Test Wallet</h3>

            {walletAdded ? (
              <div className="flex items-center gap-2 text-success">
                <MdCheck size={20} />
                <span className="font-medium">Wallet added and set as Test Wallet!</span>
              </div>
            ) : (
              <>
                {/* Warning about adding the wallet */}
                {!walletName.trim() && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-300 rounded text-yellow-800 text-xs">
                    Add this seed phrase as a test wallet to continue testing with it.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="md:col-span-2">
                    <label htmlFor="wallet-name-input" className="block text-xs font-medium mb-1">
                      Wallet Name
                    </label>
                    <input
                      id="wallet-name-input"
                      type="text"
                      value={walletName}
                      onChange={(e) => {
                        setWalletName(e.target.value);
                        setAddWalletError(null);
                      }}
                      placeholder="e.g., Desktop QA Wallet"
                      className="input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="network-select" className="block text-xs font-medium mb-1">
                      Network
                    </label>
                    <Select
                      id="network-select"
                      value={network}
                      onChange={(e) => setNetwork(e.target.value as NetworkType)}
                      className="w-full text-sm"
                    >
                      <option value="TESTNET">Testnet</option>
                      <option value="MAINNET">Mainnet</option>
                    </Select>
                  </div>
                </div>

                {/* Error message */}
                {addWalletError && (
                  <div className="mb-3 p-2 bg-red-50 border border-danger rounded text-danger text-xs">
                    {addWalletError}
                  </div>
                )}

                <button
                  onClick={handleAddWallet}
                  disabled={!canAddWallet || isAddingWallet}
                  className={`w-full btn flex items-center justify-center gap-2 ${
                    canAddWallet && !isAddingWallet ? 'btn-success' : 'btn-secondary opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isAddingWallet ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Adding Wallet...
                    </>
                  ) : (
                    <>
                      <MdAdd size={18} />
                      Add as Test Wallet
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* OCR Reference Section */}
        {ocrSourceImageUrl && (
          <div className="mt-4">
            <h3 className="text-sm font-bold mb-2 text-muted">OCR Source Image</h3>
            <OCRReferenceImage
              imageDataUrl={ocrSourceImageUrl}
              onExpand={() => setShowOcrReferenceModal(true)}
              onDismiss={() => setOcrSourceImageUrl(null)}
            />
          </div>
        )}
      </div>

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
        <OCRReferenceModal
          imageDataUrl={ocrSourceImageUrl}
          onClose={() => setShowOcrReferenceModal(false)}
        />
      )}
    </div>
  );
}
