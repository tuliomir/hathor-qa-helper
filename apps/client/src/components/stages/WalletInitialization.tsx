/**
 * Wallet Initialization Stage
 * Allows users to add wallets and explicitly start/stop them
 * Wallets persist globally across all stages
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MdAdd,
  MdCamera,
  MdDelete,
  MdEdit,
  MdHourglassEmpty,
  MdPlayArrow,
  MdQrCode,
  MdStar,
  MdStarBorder,
  MdStop,
  MdViewList,
} from 'react-icons/md';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useScanForLostFunds } from '../../hooks/useScanForLostFunds';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectPreferredNetwork } from '../../store/slices/networkSlice';
import { startWallet, stopWallet } from '../../store/slices/walletStoreSlice';
import { setFundingWallet, setTestWallet } from '../../store/slices/walletSelectionSlice';
import {
  selectFilterHasBalance,
  selectScanProgress,
  selectScanResults,
  selectSortByBalance,
  toggleFilterHasBalance,
  toggleSortByBalance,
} from '../../store/slices/walletScanSlice';
import ImagePreview from '../ImagePreview';
import CameraCapture from '../CameraCapture';
import OCRReferenceImage from '../OCRReferenceImage';
import OCRReferenceModal from '../OCRReferenceModal';
import { treatSeedWords } from '../../utils/walletUtils';
import { replaceWordAt, splitSeedWords, validateSeedWords } from '../../utils/seedWords';
import { extractSeedWordsFromImage } from '../../utils/ocrService';
import { formatBalance } from '../../utils/balanceUtils';
import CopyButton from '../common/CopyButton';
import { CapabilityBadge } from '../common/CapabilityBadge';
import { canCreateShieldedOutputs } from '../../services/shieldedCapability';
import NetworkChip from '../common/NetworkChip';
import NetworkSwapButton from '../common/NetworkSwapButton';
import { Identifier } from '../common/Identifier';
import { StageHeader } from '../common/StageHeader';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { StatusChip } from '../ui/StatusChip';
import SeedPhraseModal from '../common/SeedPhraseModal';
import WalletBrowserModal from '../common/WalletBrowserModal';
import { NETWORK_CONFIG, NETWORK_KEYS, nextNetwork, type NetworkKey } from '../../constants/network';
import { getAddressesForWallet } from '../../services/addressDatabase';
import { useConfirm } from '../../hooks/useConfirm';

const DEFAULT_WALLETS_KEY = 'qa-helper-default-wallets';
const MAX_VISIBLE_WALLETS = 5;

export default function WalletInitialization() {
  const dispatch = useAppDispatch();
  const { wallets: walletsMap, addWallet, removeWallet, updateFriendlyName, updateNetwork } = useWalletStore();
  const { confirm, confirmDialog } = useConfirm();

  const [seedInput, setSeedInput] = useState('');
  const [walletName, setWalletName] = useState('');
  // New wallets default to the network chosen in the network switcher.
  const preferredNetwork = useAppSelector(selectPreferredNetwork);
  const [network, setNetwork] = useState<NetworkKey>(preferredNetwork);
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

  // Wallet browser modal state
  const [showWalletBrowser, setShowWalletBrowser] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoStartedRef = useRef(false);
  // Memoize allWallets to prevent infinite re-renders - walletsMap is already memoized by createSelector
  const allWallets = useMemo(() => Array.from(walletsMap.values()), [walletsMap]);

  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);

  // Scan for lost funds state
  const { startScanForLostFunds } = useScanForLostFunds();
  const scanProgress = useAppSelector(selectScanProgress);
  const scanResults = useAppSelector(selectScanResults);
  const filterHasBalance = useAppSelector(selectFilterHasBalance);
  const sortByBalance = useAppSelector(selectSortByBalance);

  // Stored first addresses from database (walletId -> address at index 0)
  const [storedFirstAddresses, setStoredFirstAddresses] = useState<Record<string, string>>({});

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
  // Uses Promise.allSettled to start both wallets simultaneously
  useEffect(() => {
    const autoStartDefaults = async () => {
      // Only run once, and only after we've loaded defaults from localStorage
      if (hasAutoStartedRef.current) return;
      if (!defaultFundWalletId && !defaultTestWalletId) return;

      hasAutoStartedRef.current = true;

      // Collect wallet startup promises for parallel execution
      const startupPromises: Promise<void>[] = [];

      if (defaultFundWalletId) {
        const wallet = allWallets.find((w) => w.metadata.id === defaultFundWalletId);
        if (wallet && wallet.status === 'idle') {
          startupPromises.push(handleStartWallet(defaultFundWalletId));
        }
      }
      if (defaultTestWalletId && defaultTestWalletId !== defaultFundWalletId) {
        const wallet = allWallets.find((w) => w.metadata.id === defaultTestWalletId);
        if (wallet && wallet.status === 'idle') {
          startupPromises.push(handleStartWallet(defaultTestWalletId));
        }
      }

      // Start all wallets in parallel (allSettled ensures all are attempted even if one fails)
      if (startupPromises.length > 0) {
        await Promise.allSettled(startupPromises);
      }
    };

    autoStartDefaults();
  }, [defaultFundWalletId, defaultTestWalletId]); // Run when default wallet IDs are loaded

  // Sort wallets: started (ready) first, then loading (connecting/syncing), then others
  // Secondary sort by lastUsedAt (most recent first)
  const wallets = useMemo(() => {
    return [...allWallets].sort((a, b) => {
      const statusPriority = (status: string) => {
        if (status === 'ready') return 0;
        if (status === 'connecting' || status === 'syncing') return 1;
        return 2;
      };
      const statusDiff = statusPriority(a.status) - statusPriority(b.status);
      if (statusDiff !== 0) return statusDiff;

      // Secondary sort by lastUsedAt (most recent first)
      const aLastUsed = a.metadata.lastUsedAt || a.metadata.createdAt;
      const bLastUsed = b.metadata.lastUsedAt || b.metadata.createdAt;
      return bLastUsed - aLastUsed;
    });
  }, [allWallets]);

  // Recent wallets for the main view (limited to MAX_VISIBLE_WALLETS)
  const recentWallets = useMemo(() => {
    return wallets.slice(0, MAX_VISIBLE_WALLETS);
  }, [wallets]);

  const hasMoreWallets = wallets.length > MAX_VISIBLE_WALLETS;

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
    setNetwork(preferredNetwork);
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
    setNetwork(e.target.value as NetworkKey);
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

  const handleRemoveWallet = async (walletId: string) => {
    const name = walletsMap.get(walletId)?.metadata.friendlyName ?? 'this wallet';
    if (
      await confirm({
        title: `Remove ${name}?`,
        body: 'The wallet is stopped and deleted from this browser.',
        confirmLabel: 'Remove wallet',
        tone: 'danger',
      })
    ) {
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

  const handleSwapNetwork = async (walletId: string, currentNetwork: NetworkKey, status: string) => {
    const newNetwork: NetworkKey = nextNetwork(currentNetwork);

    // Stop the wallet if it's running in any state
    if (status === 'ready' || status === 'connecting' || status === 'syncing') {
      await handleStopWallet(walletId);
    }

    // Update the network
    updateNetwork(walletId, newNetwork);

    // Restart on the new network
    await handleStartWallet(walletId);
  };

  // Return the first `n` words of the seed phrase (useful for compact display)
  const firstNWords = (seed: string, n: number = 3) => {
    if (!seed) return '';
    const words = seed.trim().split(/\s+/);
    if (words.length <= n) return words.join(' ');
    return words.slice(0, n).join(' ') + '...';
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Load stored first addresses from database on mount and when wallets change
  useEffect(() => {
    const loadStoredAddresses = async () => {
      const addressMap: Record<string, string> = {};

      for (const wallet of allWallets) {
        // Skip wallets that already have a runtime address
        if (wallet.firstAddress) continue;

        try {
          const addresses = await getAddressesForWallet(wallet.metadata.id);
          // Find address at index 0
          const firstAddr = addresses.find((a) => a.index === 0);
          if (firstAddr) {
            addressMap[wallet.metadata.id] = firstAddr.address;
          }
        } catch (err) {
          console.error(`Failed to load addresses for wallet ${wallet.metadata.id}:`, err);
        }
      }

      setStoredFirstAddresses(addressMap);
    };

    loadStoredAddresses();
  }, [allWallets]);

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

  const applySuggestion = (index: number, suggestion: string) => {
    // Only this position: the same misspelling elsewhere may be a different word.
    const newSeed = replaceWordAt(seedInput, index, suggestion);
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
  };

  type WalletRow = (typeof wallets)[number];

  const walletColumns: DataTableColumn<WalletRow>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (wallet) =>
        editingId === wallet.metadata.id ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            aria-label="Wallet name"
            className="input input-sm w-40"
            autoFocus
          />
        ) : (
          <span className="font-semibold">{wallet.metadata.friendlyName}</span>
        ),
    },
    {
      key: 'seed',
      header: 'Seed',
      render: (wallet) => (
        <span className="inline-flex items-center gap-1">
          <span className="whitespace-nowrap font-mono text-data-sm text-ink-muted">
            {firstNWords(wallet.metadata.seedWords, 3)}
          </span>
          <CopyButton text={wallet.metadata.seedWords} label={`Copy seed for ${wallet.metadata.friendlyName}`} />
          <button
            type="button"
            onClick={() => setSeedModalWalletId(wallet.metadata.id)}
            title="Show QR code"
            aria-label={`Show QR code for ${wallet.metadata.friendlyName}`}
            className="inline-flex h-6 w-6 items-center justify-center rounded-field text-ink-muted hover:bg-base-200 hover:text-base-content"
          >
            <MdQrCode aria-hidden="true" />
          </button>
        </span>
      ),
    },
    {
      key: 'network',
      header: 'Network',
      render: (wallet) => {
        return (
          <span className="inline-flex flex-wrap items-center gap-1">
            <NetworkChip network={wallet.metadata.network} size="sm" />
            <NetworkSwapButton
              walletId={wallet.metadata.id}
              walletName={wallet.metadata.friendlyName}
              currentNetwork={wallet.metadata.network}
              walletStatus={wallet.status}
              onSwap={handleSwapNetwork}
            />
            {NETWORK_CONFIG[wallet.metadata.network].supportsShielded && wallet.shieldedCapability && (
              <CapabilityBadge
                level={wallet.shieldedCapability.level}
                reason={wallet.shieldedCapability.reason}
                canCreateShieldedOutputs={canCreateShieldedOutputs(wallet.shieldedCapability)}
              />
            )}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (wallet) => (
        <span className="flex flex-col items-start gap-0.5">
          <StatusChip status={wallet.status} />
          {wallet.status === 'ready' && (
            <span className="whitespace-nowrap font-mono text-data-sm">
              {formatBalance(wallet.balance ?? 0n)} <span className="font-sans text-ink-muted">HTR</span>
            </span>
          )}
          {wallet.error && <span className="text-caption text-error">{wallet.error}</span>}
        </span>
      ),
    },
    {
      key: 'address',
      header: 'First address',
      type: 'identifier',
      render: (wallet) => {
        const storedAddress = storedFirstAddresses[wallet.metadata.id];
        const displayAddress = wallet.firstAddress || storedAddress;
        const isStoredOnly = !wallet.firstAddress && storedAddress;
        if (!displayAddress) return null;
        return (
          <span
            className={isStoredOnly ? 'text-ink-muted' : undefined}
            title={isStoredOnly ? 'Stored address; the wallet is not running' : undefined}
          >
            <Identifier value={displayAddress} kind="address" walletTag={false} head={4} tail={6} />
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      type: 'actions',
      hideLabelWhenStacked: true,
      render: (wallet) => (
        <span className="inline-flex flex-wrap items-center justify-end gap-1">
          {editingId === wallet.metadata.id ? (
            <>
              <button type="button" onClick={handleSaveEdit} className="btn btn-primary btn-xs">
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setEditingName('');
                }}
                className="btn btn-ghost btn-xs"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {wallet.status === 'idle' || wallet.status === 'error' ? (
                <button
                  type="button"
                  onClick={() => handleStartWallet(wallet.metadata.id)}
                  title="Start"
                  aria-label={`Start ${wallet.metadata.friendlyName}`}
                  className="btn btn-primary btn-xs btn-square"
                >
                  <MdPlayArrow aria-hidden="true" />
                </button>
              ) : wallet.status === 'ready' ? (
                <button
                  type="button"
                  onClick={() => handleStopWallet(wallet.metadata.id)}
                  title="Stop"
                  aria-label={`Stop ${wallet.metadata.friendlyName}`}
                  className="btn btn-secondary btn-xs btn-square"
                >
                  <MdStop aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      await confirm({
                        title: `Force stop ${wallet.metadata.friendlyName}?`,
                        body: `It appears stuck in the ${wallet.status} state.`,
                        confirmLabel: 'Force stop',
                        tone: 'danger',
                      })
                    ) {
                      handleStopWallet(wallet.metadata.id);
                    }
                  }}
                  title="Force stop (wallet appears stuck)"
                  aria-label={`Force stop ${wallet.metadata.friendlyName}`}
                  className="btn btn-outline btn-warning btn-xs btn-square"
                >
                  <MdHourglassEmpty aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleStartEdit(wallet.metadata.id, wallet.metadata.friendlyName)}
                title="Rename"
                aria-label={`Rename ${wallet.metadata.friendlyName}`}
                className="btn btn-ghost btn-xs btn-square"
              >
                <MdEdit aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => handleRemoveWallet(wallet.metadata.id)}
                title="Remove"
                aria-label={`Remove ${wallet.metadata.friendlyName}`}
                className="btn btn-ghost btn-xs btn-square text-error"
              >
                <MdDelete aria-hidden="true" />
              </button>
            </>
          )}
        </span>
      ),
    },
  ];

  const canAdd = !!seedInput.trim() && !!walletName.trim();

  return (
    <div className="flex max-w-stage flex-col gap-4">
      {confirmDialog}
      <StageHeader
        stageId="wallet-initialization"
        description="Add wallets and start them. Wallets persist across all QA stages until stopped or removed."
        docsUrl="https://docs.hathor.network/"
      />

      <Panel
        title={`Registered wallets (${wallets.length})`}
        description={hasMoreWallets ? `Showing the ${recentWallets.length} most recent` : undefined}
        actions={
          hasMoreWallets && (
            <button type="button" onClick={() => setShowWalletBrowser(true)} className="btn btn-secondary btn-sm">
              <MdViewList aria-hidden="true" />
              View all wallets
            </button>
          )
        }
      >
        <DataTable
          caption="Registered wallets"
          columns={walletColumns}
          rows={recentWallets}
          getRowKey={(wallet) => wallet.metadata.id}
          empty="No wallets registered yet. Add one with its seed phrase below."
        />
      </Panel>

      {readyWallets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title="Funding wallet" description="A wallet with funds for testing. Sorted by highest balance.">
            <Field label="Funding wallet" htmlFor="funding-wallet-select">
              <select
                value={fundingWalletId || ''}
                onChange={(e) => dispatch(setFundingWallet(e.target.value || null))}
                className="select w-full"
              >
                <option value="">Select funding wallet</option>
                {walletsSortedByBalanceDesc.map((wallet) => (
                  <option key={wallet.metadata.id} value={wallet.metadata.id}>
                    {wallet.metadata.friendlyName} - {formatBalance(wallet.balance)} HTR
                  </option>
                ))}
              </select>
            </Field>
            {fundingWalletId && (
              <button
                type="button"
                onClick={() =>
                  handleSetDefaultFundWallet(defaultFundWalletId === fundingWalletId ? null : fundingWalletId)
                }
                className="btn btn-ghost btn-sm self-start"
                aria-pressed={defaultFundWalletId === fundingWalletId}
              >
                {defaultFundWalletId === fundingWalletId ? (
                  <MdStar className="text-warning-ink" aria-hidden="true" />
                ) : (
                  <MdStarBorder aria-hidden="true" />
                )}
                {defaultFundWalletId === fundingWalletId
                  ? 'Unset default funding wallet'
                  : 'Set as default funding wallet'}
              </button>
            )}
          </Panel>

          <Panel title="Test wallet" description="The wallet being tested. Sorted by lowest balance.">
            <Field label="Test wallet" htmlFor="test-wallet-select">
              <select
                value={testWalletId || ''}
                onChange={(e) => dispatch(setTestWallet(e.target.value || null))}
                className="select w-full"
              >
                <option value="">Select test wallet</option>
                {walletsSortedByBalanceAsc.map((wallet) => (
                  <option key={wallet.metadata.id} value={wallet.metadata.id}>
                    {wallet.metadata.friendlyName} - {formatBalance(wallet.balance)} HTR
                  </option>
                ))}
              </select>
            </Field>
            {testWalletId && (
              <button
                type="button"
                onClick={() => handleSetDefaultTestWallet(defaultTestWalletId === testWalletId ? null : testWalletId)}
                className="btn btn-ghost btn-sm self-start"
                aria-pressed={defaultTestWalletId === testWalletId}
              >
                {defaultTestWalletId === testWalletId ? (
                  <MdStar className="text-warning-ink" aria-hidden="true" />
                ) : (
                  <MdStarBorder aria-hidden="true" />
                )}
                {defaultTestWalletId === testWalletId ? 'Unset default test wallet' : 'Set as default test wallet'}
              </button>
            )}
          </Panel>
        </div>
      )}

      <Panel title="Add new wallet">
        <Field label="Wallet name" htmlFor="wallet-name">
          <input
            type="text"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            placeholder="e.g. Android Nov14"
            className="input w-full"
          />
        </Field>

        <Field
          label="Seed phrase (24 words)"
          htmlFor="seed-input"
          hint="Tip: paste an image of the seed words here to extract them with OCR."
          trailing={
            <button type="button" onClick={() => setShowCamera(true)} className="btn btn-secondary btn-sm">
              <MdCamera aria-hidden="true" />
              Open camera
            </button>
          }
        >
          <textarea
            ref={textareaRef}
            value={seedInput}
            onChange={handleSeedChange}
            onPaste={handlePaste}
            placeholder="Enter the 24-word seed phrase separated by spaces, or paste an image with the seed words"
            rows={3}
            className={`textarea min-h-[4.5rem] w-full resize-y whitespace-pre-wrap break-words border-field-border font-mono text-data ${
              validationError ? 'textarea-error' : ''
            }`}
          />
        </Field>

        {validationError && ocrSourceImageUrl && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-body font-semibold">OCR source image</h3>
              <OCRReferenceImage
                imageDataUrl={ocrSourceImageUrl}
                onExpand={() => setShowOcrReferenceModal(true)}
                onDismiss={() => setOcrSourceImageUrl(null)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-body font-semibold">Extracted seed words</h3>
              <div className="max-h-[300px] overflow-y-auto break-words rounded-field bg-base-200 p-3 font-mono text-data">
                {seedInput}
              </div>
            </div>
          </div>
        )}

        {validationError && (
          <Callout tone="error" title={validationError}>
            {invalidWords.length > 0 && (
              <ul>
                {validateSeedWords(splitSeedWords(seedInput)).map(({ index, word, suggestion }) => (
                  <li key={index}>
                    <span className="mr-2">
                      Word {index + 1}: <span className="font-mono text-data">{word}</span>
                    </span>
                    {suggestion ? (
                      <button
                        type="button"
                        onClick={() => applySuggestion(index, suggestion)}
                        className="link link-primary"
                      >
                        Did you mean <strong>{suggestion}</strong>?
                      </button>
                    ) : (
                      <span className="text-ink-muted">(no suggestion available)</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Callout>
        )}

        <Field label="Network" htmlFor="network-select">
          <select value={network} onChange={handleNetworkChange} className="select w-full sm:w-64">
            {NETWORK_KEYS.map((key) => (
              <option key={key} value={key}>
                {NETWORK_CONFIG[key].label}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {!canAdd && (
            <span className="text-caption text-ink-muted">Enter a name and a seed phrase to add the wallet</span>
          )}
          <button type="button" onClick={handleAddWallet} disabled={!canAdd} className="btn btn-primary">
            <MdAdd aria-hidden="true" />
            Add wallet
          </button>
        </div>
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
        <OCRReferenceModal imageDataUrl={ocrSourceImageUrl} onClose={() => setShowOcrReferenceModal(false)} />
      )}
      <WalletBrowserModal
        isOpen={showWalletBrowser}
        onClose={() => setShowWalletBrowser(false)}
        wallets={wallets}
        onStartWallet={handleStartWallet}
        onStopWallet={handleStopWallet}
        onRemoveWallet={handleRemoveWallet}
        onEditWallet={handleStartEdit}
        onShowSeedModal={setSeedModalWalletId}
        onSwapNetwork={handleSwapNetwork}
        // Stored addresses from database
        storedFirstAddresses={storedFirstAddresses}
        // Scan for lost funds props
        scanState={scanProgress}
        scanResults={scanResults}
        filterHasBalance={filterHasBalance}
        sortByBalance={sortByBalance}
        onScanForLostFunds={startScanForLostFunds}
        onToggleFilterHasBalance={() => dispatch(toggleFilterHasBalance())}
        onToggleSortByBalance={() => dispatch(toggleSortByBalance())}
      />
      {/* After the wallet browser, so it opens on top of it. */}
      {seedModalWalletId && (
        <SeedPhraseModal
          isOpen={!!seedModalWalletId}
          onClose={() => setSeedModalWalletId(null)}
          seedPhrase={wallets.find((w) => w.metadata.id === seedModalWalletId)?.metadata.seedWords || ''}
          walletName={wallets.find((w) => w.metadata.id === seedModalWalletId)?.metadata.friendlyName || ''}
        />
      )}
    </div>
  );
}
