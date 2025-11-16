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
import { treatSeedWords, didYouMean } from '../../utils/walletUtils';
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
  const [pastedImageUrl, setPastedImageUrl] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wallets = getAllWallets();

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
    addWallet({ friendlyName: walletName, seedWords: treatedWords, network });
    setSeedInput('');
    setWalletName('');
    setNetwork('TESTNET');
  };

  const handleSeedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSeedInput(e.target.value);
    if (validationError) {
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
        setValidationError(null);
      } else {
        setValidationError(result.error || 'Failed to extract seed words from image');
        setPastedImageUrl(null);
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
    }
  };

  const truncateSeed = (seed: string, maxLength: number = 30) => {
    if (seed.length <= maxLength) return seed;
    return seed.substring(0, maxLength) + '...';
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

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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
                  <tr key={wallet.metadata.id} className="table-row">
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
                      {truncateSeed(wallet.metadata.seedWords, 40)}
                    </td>
                    <td className="p-3">{wallet.metadata.network}</td>
                    <td className="p-3">
                      <span className={`${getStatusColor(wallet.status)} font-bold text-sm`}>
                        {wallet.status}
                      </span>
                      {wallet.error && (
                        <div className="text-xs text-danger mt-1">{wallet.error}</div>
                      )}
                    </td>
                    <td className={`p-3 font-mono text-2.5xs ${wallet.firstAddress ? 'text-success' : 'text-muted'}`}>
                      {wallet.firstAddress || '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1.5 justify-center flex-wrap">
                        {editingId === wallet.metadata.id ? (
                          <>
                            <button onClick={handleSaveEdit} className="btn-success text-xs">
                              Save
                            </button>
                            <button onClick={() => { setEditingId(null); setEditingName(''); }} className="btn-secondary text-xs">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {wallet.status === 'idle' || wallet.status === 'error' ? (
                              <button onClick={() => handleStartWallet(wallet.metadata.id)} className="btn-primary text-xs">
                                <span className="i-mdi-play inline-block mr-1" />Start
                              </button>
                            ) : wallet.status === 'ready' ? (
                              <button onClick={() => handleStopWallet(wallet.metadata.id)} className="btn-danger text-xs">
                                <span className="i-mdi-stop inline-block mr-1" />Stop
                              </button>
                            ) : (
                              <button disabled className="btn-secondary text-xs cursor-not-allowed opacity-60">
                                {wallet.status === 'connecting' ? '⏳ Connecting...' : '⏳ Syncing...'}
                              </button>
                            )}
                            <button onClick={() => handleStartEdit(wallet.metadata.id, wallet.metadata.friendlyName)} className="btn-warning text-xs">
                              <span className="i-mdi-pencil inline-block mr-1" />Rename
                            </button>
                            <button onClick={() => handleRemoveWallet(wallet.metadata.id)} className="btn-danger text-xs">
                              <span className="i-mdi-delete inline-block mr-1" />Remove
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
              <span className="i-mdi-camera inline-block" />
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
            className={validationError ? 'input-error font-mono resize-y' : 'input font-mono resize-y'}
          />
          <p className="text-muted text-xs mt-2 mb-0">
            💡 <strong>Tip:</strong> You can paste an image of your seed words here for automatic extraction using OCR.
          </p>
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
          <select
            id="network-select"
            value={network}
            onChange={handleNetworkChange}
            className="input cursor-pointer bg-white"
          >
            <option value="TESTNET">Testnet</option>
            <option value="MAINNET">Mainnet</option>
          </select>
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
    </div>
  );
}
