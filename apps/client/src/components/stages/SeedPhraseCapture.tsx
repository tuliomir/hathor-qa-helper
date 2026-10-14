/**
 * Seed Phrase Capture Component
 * Extracts seed words from images using OCR, shows them by position, and
 * points at wrong words on the source image. Can register the captured
 * seed as a new wallet.
 */

import { useMemo, useRef, useState } from 'react';
import { MdAdd, MdCamera, MdCheck, MdContentCopy, MdFileUpload } from 'react-icons/md';
import ImagePreview from '../ImagePreview';
import CameraCapture from '../CameraCapture';
import OCRReferenceImage from '../OCRReferenceImage';
import OCRReferenceModal from '../OCRReferenceModal';
import SeedWordGrid from '../SeedWordGrid';
import type { ImageHighlight } from '../ImageZoomPan';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { treatSeedWords } from '../../utils/walletUtils';
import { bboxToRect, replaceWordAt, splitSeedWords, validateSeedWords, type SeedWordBox } from '../../utils/seedWords';
import { extractSeedWordsFromImage } from '../../utils/ocrService';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch } from '../../store/hooks';
import { setTestWallet } from '../../store/slices/walletSelectionSlice';
import { startWallet } from '../../store/slices/walletStoreSlice';
import { NETWORK_CONFIG, NETWORK_KEYS, type NetworkKey } from '../../constants/network';

const SEED_LENGTH = 24;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SeedPhraseCapture() {
  const dispatch = useAppDispatch();
  const { addWallet } = useWalletStore();

  const [seedInput, setSeedInput] = useState('');
  const [walletName, setWalletName] = useState('');
  const [network, setNetwork] = useState<NetworkKey>('TESTNET');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [pastedImageUrl, setPastedImageUrl] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrSourceImageUrl, setOcrSourceImageUrl] = useState<string | null>(null);
  const [ocrWords, setOcrWords] = useState<SeedWordBox[] | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [showOcrReferenceModal, setShowOcrReferenceModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [walletAdded, setWalletAdded] = useState(false);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [addWalletError, setAddWalletError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const words = useMemo(() => splitSeedWords(seedInput), [seedInput]);
  const issues = useMemo(() => validateSeedWords(words), [words]);
  const invalidSet = useMemo(() => new Set(issues.map((i) => i.index)), [issues]);
  const seedCheck = useMemo(
    () => (words.length > 0 && issues.length === 0 ? treatSeedWords(seedInput) : null),
    [seedInput, words.length, issues.length]
  );
  const isValid = !!seedCheck?.valid;
  const canAddWallet = isValid && walletName.trim() && !walletAdded;

  // Word boxes map to seed positions by index; only trust them while the
  // word count still matches what OCR found.
  const boxesMatch = !!ocrWords && ocrWords.length === words.length;
  const boxAt = (i: number) => (boxesMatch ? (ocrWords?.[i]?.bbox ?? null) : null);
  const hasBoxes = !!ocrWords?.some((w) => w.bbox);

  const selectedBox = selectedIndex !== null ? boxAt(selectedIndex) : null;
  const focusRect = selectedBox ? bboxToRect(selectedBox) : null;
  const highlights: ImageHighlight[] = [];
  if (boxesMatch) {
    for (const issue of issues) {
      const b = boxAt(issue.index);
      if (b && issue.index !== selectedIndex) {
        highlights.push({ rect: bboxToRect(b), tone: 'error', label: String(issue.index + 1) });
      }
    }
    if (selectedBox && selectedIndex !== null) {
      highlights.push({ rect: bboxToRect(selectedBox), tone: 'focus', label: String(selectedIndex + 1) });
    }
  }

  const selectWord = (index: number, edit: boolean) => {
    setSelectedIndex(index);
    setEditingIndex(edit ? index : null);
    if (boxAt(index)) setReferenceOpen(true);
    if (edit) {
      gridRef.current
        ?.querySelector(`[data-word-index="${index}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const setWordAt = (index: number, word: string) => {
    setSeedInput((prev) => replaceWordAt(prev, index, word));
    setSelectedIndex(index);
  };

  const handleEditEnd = (index: number, value: string | null) => {
    setEditingIndex(null);
    if (value === null) return;
    const next = value.trim().toLowerCase();
    if (next !== words[index]) setWordAt(index, next);
  };

  const handleSeedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSeedInput(e.target.value);
    setEditingIndex(null);
    setOcrError(null);
  };

  const openImage = async (file: Blob) => {
    setOcrError(null);
    setPastedImageUrl(await readAsDataUrl(file));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (!blob) continue;
        e.preventDefault();
        void openImage(blob);
        break;
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void openImage(file);
  };

  const handleExtractText = async (imageDataUrl: string) => {
    setIsProcessingOcr(true);
    try {
      const result = await extractSeedWordsFromImage(imageDataUrl);
      setPastedImageUrl(null);
      if (result.success) {
        setSeedInput(result.seedWords);
        setOcrWords(result.words);
        setOcrSourceImageUrl(imageDataUrl);
        setOcrError(null);
        setEditingIndex(null);
        const found = validateSeedWords(result.words.map((w) => w.word));
        setSelectedIndex(found[0]?.index ?? null);
        setReferenceOpen(found.length > 0);
      } else {
        setOcrError(result.error || 'Failed to extract seed words from image');
        setOcrSourceImageUrl(null);
        setOcrWords(null);
      }
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const dismissReference = () => {
    setOcrSourceImageUrl(null);
    setOcrWords(null);
    setReferenceOpen(false);
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
      const walletId = addWallet({
        friendlyName: walletName.trim(),
        seedWords: treatedWords,
        network,
      });
      await dispatch(startWallet(walletId)).unwrap();
      dispatch(setTestWallet(walletId));
      setWalletAdded(true);
    } catch (error) {
      console.error('Failed to add wallet:', error);
      setAddWalletError(error instanceof Error ? error.message : 'Failed to add wallet');
    } finally {
      setIsAddingWallet(false);
    }
  };

  const countNote =
    words.length > 0 && words.length !== SEED_LENGTH
      ? `Found ${words.length} word${words.length === 1 ? '' : 's'}; a seed phrase has ${SEED_LENGTH}.`
      : null;

  const showReference = !!ocrSourceImageUrl && referenceOpen;

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Seed phrase capture"
        description="Paste a screenshot of the seed words screen, upload it or capture it with the camera. OCR extracts the words."
      >
        <Field
          label="Seed phrase"
          htmlFor="seed-capture-input"
          hint="Paste an image (Ctrl+V / Cmd+V) here, or type or paste the words."
          trailing={
            <>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm">
                <MdFileUpload aria-hidden="true" />
                Upload image
              </button>
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
            value={seedInput}
            onChange={handleSeedChange}
            onPaste={handlePaste}
            placeholder="Paste an image of the seed words here, or type or paste the seed phrase"
            rows={3}
            className={`textarea min-h-[4.5rem] w-full resize-y border-field-border font-mono text-data ${
              words.length === 0 ? '' : isValid ? 'textarea-success' : 'textarea-error'
            }`}
          />
        </Field>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload seed words image"
          data-testid="seed-image-upload"
        />

        {ocrError && <Callout tone="error">{ocrError}</Callout>}

        {words.length > 0 &&
          (isValid ? (
            <Callout tone="success">Valid seed phrase ({words.length} words)</Callout>
          ) : issues.length > 0 ? (
            <Callout
              tone="error"
              title={`${issues.length} word${issues.length === 1 ? ' is' : 's are'} not in the BIP39 list`}
            >
              <ul className="m-0 flex flex-col gap-1.5" data-testid="seed-issues">
                {issues.map((issue) => (
                  <li key={issue.index} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      <strong>Word {issue.index + 1}</strong> — <span className="font-mono">{`'${issue.word}'`}</span>{' '}
                      is not a BIP39 word.
                      {issue.suggestion && (
                        <>
                          {' '}
                          Did you mean <span className="font-mono">{`'${issue.suggestion}'`}</span>?
                        </>
                      )}
                    </span>
                    <span className="flex gap-1">
                      {issue.suggestion && (
                        <button
                          type="button"
                          onClick={() => setWordAt(issue.index, issue.suggestion)}
                          className="btn btn-secondary btn-xs"
                        >
                          Use {`'${issue.suggestion}'`}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => selectWord(issue.index, true)}
                        className="btn btn-ghost btn-xs"
                      >
                        Go to word {issue.index + 1}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              {countNote && <p className="m-0 mt-1.5">{countNote}</p>}
            </Callout>
          ) : (
            <Callout tone="error" title={seedCheck?.error || 'Invalid seed phrase'}>
              {countNote ??
                'Every word is a BIP39 word, but the checksum does not match. A word may be in the wrong position.'}
            </Callout>
          ))}

        {words.length > 0 && (
          <div className={`grid grid-cols-1 gap-4 ${showReference ? 'lg:grid-cols-2' : ''}`}>
            <section ref={gridRef} className="flex flex-col gap-2">
              <h3 className="m-0 text-body font-semibold">
                Words{' '}
                <span className="font-normal text-ink-muted">
                  {words.length}
                  {issues.length > 0 ? ` · ${issues.length} to fix` : ''}
                </span>
              </h3>
              <SeedWordGrid
                words={words}
                invalid={invalidSet}
                selectedIndex={selectedIndex}
                editingIndex={editingIndex}
                onSelect={(i) => selectWord(i, true)}
                onEditEnd={handleEditEnd}
              />
              <p className="m-0 text-caption text-ink-muted">
                Click a word to edit it{hasBoxes && boxesMatch ? ' and find it on the image' : ''}.
              </p>
            </section>

            {ocrSourceImageUrl && (
              <section className="flex min-w-0 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="m-0 text-body font-semibold">OCR source image</h3>
                  <button
                    type="button"
                    onClick={() => setReferenceOpen((o) => !o)}
                    className="btn btn-ghost btn-xs ml-auto"
                    aria-expanded={referenceOpen}
                  >
                    {referenceOpen ? 'Hide image' : 'Show image'}
                  </button>
                </div>
                {showReference && (
                  <OCRReferenceImage
                    imageDataUrl={ocrSourceImageUrl}
                    highlights={highlights}
                    focus={focusRect}
                    onExpand={() => setShowOcrReferenceModal(true)}
                    onDismiss={dismissReference}
                  />
                )}
                {hasBoxes && !boxesMatch && (
                  <p className="m-0 text-caption text-ink-muted" data-testid="boxes-hidden-hint">
                    Word boxes are hidden: OCR found {ocrWords?.length} words and the seed now has {words.length}, so
                    positions no longer line up.
                  </p>
                )}
                {!hasBoxes && (
                  <p className="m-0 text-caption text-ink-muted">OCR returned no word positions for this image.</p>
                )}
              </section>
            )}
          </div>
        )}

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
      </Panel>

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
          highlights={highlights}
          focus={focusRect}
          onClose={() => setShowOcrReferenceModal(false)}
        />
      )}
    </div>
  );
}
