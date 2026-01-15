/**
 * Wallet Initialization Stage
 * Allows users to add wallets and explicitly start/stop them
 * Wallets persist globally across all stages
 */

import { useState, useRef, useEffect } from 'react';
import { MdPlayArrow, MdStop, MdEdit, MdDelete, MdCamera, MdStar, MdStarBorder, MdQrCode } from 'react-icons/md';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { startWallet, stopWallet } from '../../store/slices/walletStoreSlice';
import { setFundingWallet, setTestWallet } from '../../store/slices/walletSelectionSlice';
import ImagePreview from '../ImagePreview';
import CameraCapture from '../CameraCapture';
import OCRReferenceImage from '../OCRReferenceImage';
import OCRReferenceModal from '../OCRReferenceModal';
import { treatSeedWords, didYouMean } from '../../utils/walletUtils';
import { extractSeedWordsFromImage } from '../../utils/ocrService';
import { formatBalance } from '../../utils/balanceUtils';
import CopyButton from '../common/CopyButton';
import NetworkSwapButton from '../common/NetworkSwapButton';
import Select from '../common/Select';
import SeedPhraseModal from '../common/SeedPhraseModal';
import type { NetworkType } from '../../constants/network';

const DEFAULT_WALLETS_KEY = 'qa-helper-default-wallets';

export default function WalletInitialization() {
  const dispatch = useAppDispatch();
  const { addWallet, removeWallet, getAllWallets, updateFriendlyName, updateNetwork } = useWalletStore();

  const [seedInput, setSeedInput] = useState('');
  const [walletName, setWalletName] = useState('');
  const [network, setNetwork] = useState<NetworkType>('TESTNET');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invalidWords, setInvalidWords] = useState<string[]>([]);
  const [pastedImageUrl, setPastedImageUrl] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [defaultFundWalletId, setDefaultFundWalletId] = useState<string | null>(null);
  const [defaultTestWalletId, setDefaultTestWalletId] = useState<string | null>(null);

  // OCR reference image state (stored in memory only, not persisted)
  const [ocrSourceImageUrl, setOcrSourceImageUrl] = useState<string | null>(null);
  const [showOcrReferenceModal, setShowOcrReferenceModal] = useState(false);

  // Seed phrase modal state
  const [seedModalWalletId, setSeedModalWalletId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoStartedRef = useRef(false);
  const allWallets = getAllWallets();

  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);

  // Load default wallets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DEFAULT_WALLETS_KEY);
      if (stored) {
        const { fundWalletId, testWalletId } = JSON.parse(stored);
        setDefaultFundWalletId(fundWalletId || null);
        setDefaultTestWalletId(testWalletId || null);
      }
    } catch (error) {
      console.error('Failed to load default wallets:', error);
    }
  }, []);

  // Auto-start default wallets after they're loaded from localStorage
  useEffect(() => {
    const autoStartDefaults = async () => {
      // Only run once, and only after we've loaded defaults from localStorage
      if (hasAutoStartedRef.current) return;
      if (!defaultFundWalletId && !defaultTestWalletId) return;

      hasAutoStartedRef.current = true;

      if (defaultFundWalletId) {
        const wallet = allWallets.find(w => w.metadata.id === defaultFundWalletId);
        if (wallet && wallet.status === 'idle') {
          await handleStartWallet(defaultFundWalletId);
        }
      }
      if (defaultTestWalletId) {
        const wallet = allWallets.find(w => w.metadata.id === defaultTestWalletId);
        if (wallet && wallet.status === 'idle') {
          await handleStartWallet(defaultTestWalletId);
        }
      }
    };

    autoStartDefaults();
  }, [defaultFundWalletId, defaultTestWalletId]); // Run when default wallet IDs are loaded

  // Sort wallets: started (ready) first, then loading (connecting/syncing), then others
  const wallets = [...allWallets].sort((a, b) => {
    const statusPriority = (status: string) => {
      if (status === 'ready') return 0;
      if (status === 'connecting' || status === 'syncing') return 1;
      return 2;
    };
    return statusPriority(a.status) - statusPriority(b.status);
  });

  // Get ready wallets for selection
  const readyWallets = wallets.filter((w) => w.status === 'ready');

  // Sort wallets by balance for selection (BigInt comparison)
  const walletsSortedByBalanceDesc = [...readyWallets].sort((a, b) => {
    const balanceA = a.balance || 0n;
    const balanceB = b.balance || 0n;
    if (balanceA > balanceB) return -1;
    if (balanceA < balanceB) return 1;
    return 0;
  });
  const walletsSortedByBalanceAsc = [...readyWallets].sort((a, b) => {
    const balanceA = a.balance || 0n;
    const balanceB = b.balance || 0n;
    if (balanceA < balanceB) return -1;
    if (balanceA > balanceB) return 1;
    return 0;
  });

  const handleAddWallet = () => {
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

    setValidationError(null);
    setInvalidWords([]);
    setOcrSourceImageUrl(null); // Clear OCR image on successful wallet addition
    addWallet({ friendlyName: walletName, seedWords: treatedWords, network });
    setSeedInput('');
    setWalletName('');
    setNetwork('TESTNET');
  };

  const handleSeedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSeedInput = e.target.value;
    setSeedInput(newSeedInput);

    // Real-time validation for faster interaction
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
      // Clear validation when input is empty
      setValidationError(null);
      setInvalidWords([]);
    }
  };

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNetwork(e.target.value as NetworkType);
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
        setOcrSourceImageUrl(imageDataUrl); // Save OCR source image in memory
        setValidationError(null);
      } else {
        setValidationError(result.error || 'Failed to extract seed words from image');
        setPastedImageUrl(null);
        setOcrSourceImageUrl(null); // Clear on OCR failure
      }
    } finally {
      setIsProcessingOcr(false);
    }
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

  const handleStartWallet = async (walletId: string) => {
    try {
      await dispatch(startWallet(walletId)).unwrap();
    } catch (error) {
      console.error('Failed to start wallet:', error);
    }
  };

  const handleStopWallet = async (walletId: string) => {
    try {
      await dispatch(stopWallet(walletId)).unwrap();
    } catch (error) {
      console.error('Failed to stop wallet:', error);
    }
  };

  const handleRemoveWallet = (walletId: string) => {
    if (window.confirm('Are you sure you want to remove this wallet?')) {
      removeWallet(walletId);

      // Clear default status if this wallet was default
      if (walletId === defaultFundWalletId || walletId === defaultTestWalletId) {
        const newDefaults = {
          fundWalletId: walletId === defaultFundWalletId ? null : defaultFundWalletId,
          testWalletId: walletId === defaultTestWalletId ? null : defaultTestWalletId,
        };
        localStorage.setItem(DEFAULT_WALLETS_KEY, JSON.stringify(newDefaults));
        if (walletId === defaultFundWalletId) setDefaultFundWalletId(null);
        if (walletId === defaultTestWalletId) setDefaultTestWalletId(null);
      }
    }
  };

  const handleSetDefaultFundWallet = (walletId: string | null) => {
    setDefaultFundWalletId(walletId);
    const defaults = {
      fundWalletId: walletId,
      testWalletId: defaultTestWalletId,
    };
    localStorage.setItem(DEFAULT_WALLETS_KEY, JSON.stringify(defaults));
  };

  const handleSetDefaultTestWallet = (walletId: string | null) => {
    setDefaultTestWalletId(walletId);
    const defaults = {
      fundWalletId: defaultFundWalletId,
      testWalletId: walletId,
    };
    localStorage.setItem(DEFAULT_WALLETS_KEY, JSON.stringify(defaults));
  };

  const handleSwapNetwork = async (walletId: string, currentNetwork: NetworkType, status: string) => {
    const newNetwork: NetworkType = currentNetwork === 'TESTNET' ? 'MAINNET' : 'TESTNET';

    if (status === 'ready') {
      // Stop the wallet first
      await handleStopWallet(walletId);
      // Update the network
      updateNetwork(walletId, newNetwork);
      // Start the wallet again
      await handleStartWallet(walletId);
    } else {
      // Just update the network
      updateNetwork(walletId, newNetwork);
    }
  };

  // Return the first `n` words of the seed phrase (useful for compact display)
  const firstNWords = (seed: string, n: number = 3) => {
    if (!seed) return '';
    const words = seed.trim().split(/\s+/);
    if (words.length <= n) return words.join(' ');
    return words.slice(0, n).join(' ') + '...';
  };

	/**
	 * Truncate an address for display, keeping start and end for recognizability
	 * @param addr
	 * @param start
	 * @param end
	 * @deprecated Use the function from utils instead
	 */
  const truncateAddress = (addr: string, start = 3, end = 8) => {
    if (!addr) return '';
    if (addr.length <= start + end + 3) return addr;
    return addr.slice(0, start) + '...' + addr.slice(-end);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-success';
      case 'error': return 'text-danger';
      case 'connecting':
      case 'syncing': return 'text-warning';
      default: return 'text-muted';
    }
  };

  const getRowBackgroundColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-50';
      case 'error': return 'bg-red-50';
      case 'connecting':
      case 'syncing': return 'bg-yellow-50';
      default: return '';
    }
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-assign fund and test wallets when exactly 2 ready wallets exist
  useEffect(() => {
    if (readyWallets.length === 2) {
      // Sort by balance to determine which is richest
      const sortedByBalance = [...readyWallets].sort((a, b) => {
        const balanceA = a.balance || 0n;
        const balanceB = b.balance || 0n;
        if (balanceA > balanceB) return -1;
        if (balanceA < balanceB) return 1;
        return 0;
      });

      const richestWallet = sortedByBalance[0];
      const otherWallet = sortedByBalance[1];

      // Only auto-assign if not already set
      if (!fundingWalletId) {
        dispatch(setFundingWallet(richestWallet.metadata.id));
      }
      if (!testWalletId) {
        dispatch(setTestWallet(otherWallet.metadata.id));
      }
    }
  }, [readyWallets, fundingWalletId, testWalletId, dispatch]);

  return (
    <div className="max-w-300 mx-auto">
      {/* Wallets Table */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Registered Wallets ({wallets.length})</h2>
        {wallets.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-muted rounded-lg text-muted">
            <p className="text-lg m-0">No wallets registered yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white shadow-sm">
              <thead>
                <tr className="table-header">
                  <th className="p-3 text-left font-bold">Name</th>
                  <th className="p-3 text-left font-bold">Seed</th>
                  <th className="p-3 text-left font-bold">Network</th>
                  <th className="p-3 text-left font-bold">Status</th>
                  <th className="p-3 text-left font-bold">First Address</th>
                  <th className="p-3 text-center font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet) => (
                  <tr key={wallet.metadata.id} className={`table-row ${getRowBackgroundColor(wallet.status)}`}>
                    <td className="p-3">
                      {editingId === wallet.metadata.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="input border-primary"
                        />
                      ) : (
                        <strong>{wallet.metadata.friendlyName}</strong>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted">
                      <div className="flex items-center gap-2">
                        {/* show first 3 words, allow wrapping inside the cell */}
                        <span className="break-words max-w-[20rem] block font-mono">
                          {firstNWords(wallet.metadata.seedWords, 3)}
                        </span>
                        <CopyButton text={wallet.metadata.seedWords} label={`Copy seed for ${wallet.metadata.friendlyName}`} className="text-muted" />
                        <button
                          onClick={() => setSeedModalWalletId(wallet.metadata.id)}
                          title="Show QR Code"
                          aria-label={`Show QR code for ${wallet.metadata.friendlyName}`}
                          className="text-muted hover:text-primary transition-colors"
                        >
                          <MdQrCode size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col items-start gap-1">
                        <span>{wallet.metadata.network}</span>
                        <NetworkSwapButton
                          walletId={wallet.metadata.id}
                          currentNetwork={wallet.metadata.network}
                          walletStatus={wallet.status}
                          onSwap={handleSwapNetwork}
                        />
                      </div>
                    </td>
                    <td className={`p-3 ${getStatusColor(wallet.status)} font-bold text-sm`}>
                      {wallet.status}
                      {wallet.status === 'ready' && (
                        <div className="text-xs text-success mt-1">
                          Balance: {formatBalance(wallet.balance ?? 0n)} HTR
                        </div>
                      )}
                      {wallet.error && (
                        <div className="text-xs text-danger mt-1">{wallet.error}</div>
                      )}
                    </td>
                    <td className={`p-3 font-mono text-2.5xs ${wallet.firstAddress ? 'text-success' : 'text-muted'}`}>
                      {wallet.firstAddress ? (
                        <div className="flex items-center gap-2">
                          <span className="break-all text-xs">{truncateAddress(wallet.firstAddress)}</span>
                          <CopyButton text={wallet.firstAddress} label={`Copy address for ${wallet.metadata.friendlyName}`} className="text-muted" />
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1.5 justify-center flex-wrap">
                        {editingId === wallet.metadata.id ? (
                          <>
                            <button onClick={handleSaveEdit} className="btn-success text-xs">
                              {/* Keep Save text during edit for clarity */}
                              Save
                            </button>
                            <button onClick={() => { setEditingId(null); setEditingName(''); }} className="btn-secondary text-xs">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {wallet.status === 'idle' || wallet.status === 'error' ? (
                              <button
                                onClick={() => handleStartWallet(wallet.metadata.id)}
                                title="Start"
                                aria-label={`Start ${wallet.metadata.friendlyName}`}
                                className="btn-primary btn-square text-xs p-2"
                              >
                                <MdPlayArrow />
                              </button>
                            ) : wallet.status === 'ready' ? (
                              <button
                                onClick={() => handleStopWallet(wallet.metadata.id)}
                                title="Stop"
                                aria-label={`Stop ${wallet.metadata.friendlyName}`}
                                className="btn btn-square text-xs p-2 bg-black text-white hover:bg-gray-800"
                              >
                                <MdStop />
                              </button>
                            ) : (
                              <button disabled className="btn-secondary btn-square text-xs cursor-not-allowed opacity-60 p-2">
                                ⏳
                              </button>
                            )}

                            <button
                              onClick={() => handleStartEdit(wallet.metadata.id, wallet.metadata.friendlyName)}
                              title="Rename"
                              aria-label={`Rename ${wallet.metadata.friendlyName}`}
                              className="btn-warning btn-square text-xs p-2"
                            >
                              <MdEdit />
                            </button>

                            <button
                              onClick={() => handleRemoveWallet(wallet.metadata.id)}
                              title="Remove"
                              aria-label={`Remove ${wallet.metadata.friendlyName}`}
                              className="btn-danger btn-square text-xs p-2"
                            >
                              <MdDelete />
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

      {/* Wallet Selection Cards */}
      {readyWallets.length > 0 && (
        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Funding Wallet Selection */}
          <div className="card-primary">
            <h2 className="text-xl font-bold mb-4">Select Funding Wallet</h2>
            <p className="text-muted text-sm mb-4">
              Choose a wallet with funds to use for testing. Sorted by highest balance.
            </p>
            <Select
              id="funding-wallet-select"
              value={fundingWalletId || ''}
              onChange={(e) => dispatch(setFundingWallet(e.target.value || null))}
              className="w-full mb-3"
            >
              <option value="">-- Select funding wallet --</option>
              {walletsSortedByBalanceDesc.map((wallet) => (
                <option key={wallet.metadata.id} value={wallet.metadata.id}>
                  {wallet.metadata.friendlyName} - {formatBalance(wallet.balance)} HTR
                </option>
              ))}
            </Select>
            {fundingWalletId && (
              <button
                onClick={() => handleSetDefaultFundWallet(defaultFundWalletId === fundingWalletId ? null : fundingWalletId)}
                className={`btn text-xs flex items-center gap-1 w-full ${
                  defaultFundWalletId === fundingWalletId ? 'btn-warning' : 'btn-secondary'
                }`}
              >
                {defaultFundWalletId === fundingWalletId ? <MdStar /> : <MdStarBorder />}
                {defaultFundWalletId === fundingWalletId ? 'Unset Default Fund Wallet' : 'Set as Default Fund Wallet'}
              </button>
            )}
          </div>

          {/* Test Wallet Selection */}
          <div className="card-primary">
            <h2 className="text-xl font-bold mb-4">Select Wallet Being Tested</h2>
            <p className="text-muted text-sm mb-4">
              Choose a wallet to test. Sorted by lowest balance.
            </p>
            <Select
              id="test-wallet-select"
              value={testWalletId || ''}
              onChange={(e) => dispatch(setTestWallet(e.target.value || null))}
              className="w-full mb-3"
            >
              <option value="">-- Select test wallet --</option>
              {walletsSortedByBalanceAsc.map((wallet) => (
                <option key={wallet.metadata.id} value={wallet.metadata.id}>
                  {wallet.metadata.friendlyName} - {formatBalance(wallet.balance)} HTR
                </option>
              ))}
            </Select>
            {testWalletId && (
              <button
                onClick={() => handleSetDefaultTestWallet(defaultTestWalletId === testWalletId ? null : testWalletId)}
                className={`btn text-xs flex items-center gap-1 w-full ${
                  defaultTestWalletId === testWalletId ? 'btn-warning' : 'btn-secondary'
                }`}
              >
                {defaultTestWalletId === testWalletId ? <MdStar /> : <MdStarBorder />}
                {defaultTestWalletId === testWalletId ? 'Unset Default Test Wallet' : 'Set as Default Test Wallet'}
              </button>
            )}
          </div>
        </div>
      )}

      <h1 className="mt-0 text-3xl font-bold">Wallet Initialization</h1>
      <p className="text-muted mb-7.5">
        Add wallets and explicitly start them. Wallets persist globally across all QA stages until stopped or removed.
      </p>

      {/* Add Wallet Form */}
      <div className="card-primary mb-7.5">
        <h2 className="text-xl font-bold mb-4">Add New Wallet</h2>

        <div className="mb-4">
          <label htmlFor="wallet-name" className="block mb-1.5 font-bold">
            Wallet Name:
          </label>
          <input
            id="wallet-name"
            type="text"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            placeholder="e.g., Android Nov14"
            className="input"
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="seed-input" className="font-bold m-0">
              Seed Phrase (24 words):
            </label>
            <button
              onClick={() => setShowCamera(true)}
              className="btn bg-info text-white hover:bg-cyan-600 text-xs flex items-center gap-1">
              <MdCamera />
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
            rows={3}
            className={validationError ? 'input-error font-mono resize-y whitespace-pre-wrap break-words' : 'input font-mono resize-y whitespace-pre-wrap break-words'}
            style={{ minHeight: '4.5rem' }}
          />
          <p className="text-muted text-xs mt-2 mb-0">
            💡 <strong>Tip:</strong> You can paste an image of your seed words here for automatic extraction using OCR.
          </p>

          {/* OCR Reference Section - Show when validation error exists AND OCR image available */}
          {validationError && ocrSourceImageUrl && (
            <div className="mt-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left side: OCR Source Image */}
              <div>
                <h3 className="text-sm font-bold mb-2 text-muted">OCR Source Image</h3>
                <OCRReferenceImage
                  imageDataUrl={ocrSourceImageUrl}
                  onExpand={() => setShowOcrReferenceModal(true)}
                  onDismiss={() => setOcrSourceImageUrl(null)}
                />
              </div>

              {/* Right side: Extracted Words */}
              <div>
                <h3 className="text-sm font-bold mb-2 text-muted">Extracted Seed Words</h3>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono break-words max-h-[300px] overflow-y-auto">
                  {seedInput}
                </div>
              </div>
            </div>
          )}

          {validationError && (
            <div className="mt-1.5">
              <p className="text-danger text-sm m-0 mb-1.5">⚠️ {validationError}</p>
              {invalidWords.length > 0 && (
                <div className="text-danger text-xs m-0">
                  <div className="font-bold mb-1">Invalid words:</div>
                  {invalidWords.map((w, idx) => {
                    const suggestion = didYouMean(w);
                    return (
                      <div key={`${w}-${idx}`} className="mb-1">
                        <span className="mr-2">{w}</span>
                        {suggestion ? (
                          <button
                            type="button"
                            onClick={() => {
                              // Replace the invalid word (word-boundary) in the seed input with the suggestion
                              const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                              const re = new RegExp('\\b' + escapeRegExp(w) + '\\b', 'gi');
                              const newSeed = seedInput.replace(re, suggestion);
                              setSeedInput(newSeed);
                              // Re-validate the updated seed input
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
                            Did you mean: <strong className="ml-1">{suggestion}</strong>?
                          </button>
                        ) : (
                          <span className="text-xs text-muted">(no suggestion available)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="network-select" className="block mb-1.5 font-bold">
            Network:
          </label>
          <Select
            id="network-select"
            value={network}
            onChange={handleNetworkChange}
          >
            <option value="TESTNET">Testnet</option>
            <option value="MAINNET">Mainnet</option>
          </Select>
        </div>

        <button
          onClick={handleAddWallet}
          disabled={!seedInput.trim() || !walletName.trim()}
          className={`w-full btn text-base font-bold ${seedInput.trim() && walletName.trim() ? 'btn-success' : 'btn-secondary cursor-not-allowed'}`}
        >
          Add Wallet
        </button>
      </div>

      {showCamera && <CameraCapture onCapture={(url) => { setShowCamera(false); setPastedImageUrl(url); }} onCancel={() => setShowCamera(false)} />}
      {pastedImageUrl && <ImagePreview imageDataUrl={pastedImageUrl} onExtractText={handleExtractText} onCancel={() => setPastedImageUrl(null)} isProcessing={isProcessingOcr} />}
      {showOcrReferenceModal && ocrSourceImageUrl && (
        <OCRReferenceModal
          imageDataUrl={ocrSourceImageUrl}
          onClose={() => setShowOcrReferenceModal(false)}
        />
      )}
      {seedModalWalletId && (
        <SeedPhraseModal
          isOpen={!!seedModalWalletId}
          onClose={() => setSeedModalWalletId(null)}
          seedPhrase={wallets.find(w => w.metadata.id === seedModalWalletId)?.metadata.seedWords || ''}
          walletName={wallets.find(w => w.metadata.id === seedModalWalletId)?.metadata.friendlyName || ''}
        />
      )}
    </div>
  );
}
