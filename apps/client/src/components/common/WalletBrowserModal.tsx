/**
 * Wallet Browser Modal
 * Modal for browsing, searching, and managing all registered wallets
 * Used when there are many wallets to avoid cluttering the main view
 * Includes "Scan for Lost Funds" feature to check all wallets for balances
 */

import { useMemo, useState } from 'react';
import {
  MdSync,
  MdClose,
  MdDelete,
  MdEdit,
  MdFilterList,
  MdPlayArrow,
  MdQrCode,
  MdSearch,
  MdSort,
  MdStop,
} from 'react-icons/md';
import { useAppDispatch } from '../../store/hooks';
import { exportWalletsToCloud, importWalletsFromCloud } from '../../store/slices/walletStoreSlice';
import type { WalletInfo } from '../../types/walletStore';
import { CLOUD_SYNC_ENABLED, type NetworkKey } from '../../constants/network';
import type { WalletScanResult } from '../../store/slices/walletScanSlice';
import { calculateTotalValue } from '../../store/slices/walletScanSlice';
import { formatBalance } from '../../utils/balanceUtils';
import CopyButton from './CopyButton';
import NetworkSwapButton from './NetworkSwapButton';
import NetworkChip from './NetworkChip';
import { Identifier } from './Identifier';
import { Callout } from '../ui/Callout';
import { StatusChip } from '../ui/StatusChip';
import { DataTable, type DataTableColumn } from '../ui/DataTable';

/**
 * Scan progress state passed from parent
 */
interface ScanProgressState {
  isScanning: boolean;
  progress: number;
  currentWalletName: string | null;
  estimatedRemainingMs: number | null;
  scannedCount: number;
  totalWallets: number;
}

interface WalletBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletInfo[];
  onStartWallet: (walletId: string) => Promise<void>;
  onStopWallet: (walletId: string) => Promise<void>;
  onRemoveWallet: (walletId: string) => void;
  onEditWallet: (walletId: string, currentName: string) => void;
  onShowSeedModal: (walletId: string) => void;
  onSwapNetwork: (walletId: string, currentNetwork: NetworkKey, status: string) => Promise<void>;
  // Stored addresses from database (walletId -> address at index 0)
  storedFirstAddresses?: Record<string, string>;
  // Scan props
  scanState?: ScanProgressState;
  scanResults?: Record<string, WalletScanResult>;
  filterHasBalance?: boolean;
  sortByBalance?: boolean;
  onScanForLostFunds?: () => void;
  onToggleFilterHasBalance?: () => void;
  onToggleSortByBalance?: () => void;
}

/**
 * Format milliseconds as human-readable time (e.g., "~2m 30s")
 */
function formatTimeRemaining(ms: number | null): string {
  if (ms === null || ms <= 0) return '';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `~${minutes}m ${seconds}s`;
  }
  return `~${seconds}s`;
}

export default function WalletBrowserModal({
  isOpen,
  onClose,
  wallets,
  onStartWallet,
  onStopWallet,
  onRemoveWallet,
  onEditWallet,
  onShowSeedModal,
  onSwapNetwork,
  storedFirstAddresses,
  scanState,
  scanResults,
  filterHasBalance,
  sortByBalance,
  onScanForLostFunds,
  onToggleFilterHasBalance,
  onToggleSortByBalance,
}: WalletBrowserModalProps) {
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // Handle bidirectional cloud sync: import from cloud first, then export local wallets
  const handleCloudSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      // Step 1: Import wallets from cloud (pull new wallets from other machines)
      const importResult = await dispatch(importWalletsFromCloud()).unwrap();

      // Step 2: Export all local wallets to cloud (push our wallets for other machines)
      const exportResult = await dispatch(exportWalletsToCloud()).unwrap();

      const parts: string[] = [];
      if (importResult.imported > 0) {
        parts.push(`${importResult.imported} imported`);
      }
      if (exportResult.stored > 0) {
        parts.push(`${exportResult.stored} uploaded`);
      }
      if (exportResult.filtered > 0) {
        parts.push(`${exportResult.filtered} filtered`);
      }

      const message = parts.length > 0 ? `Sync complete: ${parts.join(', ')}` : 'Sync complete: everything up to date';

      setSyncResult({ success: true, message });
      // Clear success message after 5 seconds
      setTimeout(() => setSyncResult(null), 5000);
    } catch (error) {
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync wallets',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Check if scan data exists
  const hasScanData = scanResults && Object.keys(scanResults).length > 0;

  // Filter wallets based on search query and balance filter
  const filteredWallets = useMemo(() => {
    let result = wallets;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((w) => {
        // Check name and seed words
        if (
          w.metadata.friendlyName.toLowerCase().includes(query) ||
          w.metadata.seedWords.toLowerCase().includes(query)
        ) {
          return true;
        }
        // Check runtime address or stored address
        const displayAddress = w.firstAddress || storedFirstAddresses?.[w.metadata.id];
        return displayAddress?.toLowerCase().includes(query);
      });
    }

    // Balance filter (only if scan data exists)
    if (filterHasBalance && scanResults) {
      result = result.filter((w) => {
        const scanResult = scanResults[w.metadata.id];
        if (!scanResult) return false;
        const htrBalance = BigInt(scanResult.htrBalance || '0');
        const hasCustomTokens = scanResult.customTokenBalances.length > 0;
        return htrBalance > 0n || hasCustomTokens;
      });
    }

    return result;
  }, [wallets, searchQuery, filterHasBalance, scanResults, storedFirstAddresses]);

  // Sort wallets
  const sortedWallets = useMemo(() => {
    const sorted = [...filteredWallets];

    if (sortByBalance && scanResults) {
      // Sort by total value (descending)
      sorted.sort((a, b) => {
        const resultA = scanResults[a.metadata.id];
        const resultB = scanResults[b.metadata.id];

        const valueA = resultA ? calculateTotalValue(resultA) : 0n;
        const valueB = resultB ? calculateTotalValue(resultB) : 0n;

        if (valueB > valueA) return 1;
        if (valueB < valueA) return -1;
        return 0;
      });
    } else {
      // Default sort: lastUsedAt (most recent first), then by createdAt
      sorted.sort((a, b) => {
        const aLastUsed = a.metadata.lastUsedAt || a.metadata.createdAt;
        const bLastUsed = b.metadata.lastUsedAt || b.metadata.createdAt;
        return bLastUsed - aLastUsed;
      });
    }

    return sorted;
  }, [filteredWallets, sortByBalance, scanResults]);

  const firstNWords = (seed: string, n: number = 3) => {
    if (!seed) return '';
    const words = seed.trim().split(/\s+/);
    if (words.length <= n) return words.join(' ');
    return words.slice(0, n).join(' ') + '...';
  };

  /**
   * Render scan result info for a wallet
   */
  const renderScanInfo = (walletId: string) => {
    if (!scanResults) return null;
    const result = scanResults[walletId];
    if (!result) return null;

    const htrBalance = BigInt(result.htrBalance || '0');
    const customTokenCount = result.customTokenBalances.length;

    return (
      <span className="flex flex-col text-caption">
        <span className="font-mono tabular-nums">Scanned: {formatBalance(htrBalance)} HTR</span>
        {customTokenCount > 0 && (
          <span className="text-ink-muted">
            +{customTokenCount} token{customTokenCount > 1 ? 's' : ''}
          </span>
        )}
      </span>
    );
  };

  if (!isOpen) return null;

  const columns: DataTableColumn<WalletInfo>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (wallet) => (
        <span className="flex flex-col">
          <span className="font-semibold">{wallet.metadata.friendlyName}</span>
          {wallet.metadata.lastUsedAt && (
            <span className="text-caption text-ink-muted">
              Last used {new Date(wallet.metadata.lastUsedAt).toLocaleDateString()}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'seed',
      header: 'Seed',
      render: (wallet) => (
        <span className="inline-flex items-center gap-1">
          <span className="max-w-48 truncate font-mono text-data-sm text-ink-muted">
            {firstNWords(wallet.metadata.seedWords, 3)}
          </span>
          <CopyButton text={wallet.metadata.seedWords} label={`Copy seed for ${wallet.metadata.friendlyName}`} />
          <button
            type="button"
            onClick={() => onShowSeedModal(wallet.metadata.id)}
            title="Show QR code"
            aria-label={`Show QR code for ${wallet.metadata.friendlyName}`}
            className="btn btn-ghost btn-xs btn-square"
          >
            <MdQrCode aria-hidden="true" />
          </button>
        </span>
      ),
    },
    {
      key: 'network',
      header: 'Network',
      render: (wallet) => (
        <span className="inline-flex items-center gap-1">
          <NetworkChip network={wallet.metadata.network} size="sm" />
          <NetworkSwapButton
            walletId={wallet.metadata.id}
            walletName={wallet.metadata.friendlyName}
            currentNetwork={wallet.metadata.network}
            walletStatus={wallet.status}
            onSwap={onSwapNetwork}
          />
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status / balance',
      render: (wallet) => (
        <span className="flex flex-col items-start gap-1">
          <StatusChip status={wallet.status} />
          {wallet.status === 'ready' && (
            <span className="font-mono text-data tabular-nums">{formatBalance(wallet.balance ?? 0n)} HTR</span>
          )}
          {wallet.error && <span className="text-caption text-error">{wallet.error}</span>}
          {wallet.status !== 'ready' && renderScanInfo(wallet.metadata.id)}
        </span>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      type: 'identifier',
      render: (wallet) => {
        // Runtime address when the wallet is running, else the one stored in the database.
        const storedAddress = storedFirstAddresses?.[wallet.metadata.id];
        const displayAddress = wallet.firstAddress || storedAddress;
        if (!displayAddress) return <span className="text-ink-muted">None</span>;
        return (
          <span className="inline-flex items-center gap-1.5">
            <Identifier value={displayAddress} kind="address" walletTag={false} />
            {!wallet.firstAddress && <span className="text-caption text-ink-muted">stored</span>}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      type: 'actions',
      hideLabelWhenStacked: true,
      render: (wallet) => {
        const name = wallet.metadata.friendlyName;
        return (
          <span className="inline-flex flex-wrap justify-end gap-1">
            {wallet.status === 'idle' || wallet.status === 'error' ? (
              <button
                type="button"
                onClick={() => onStartWallet(wallet.metadata.id)}
                title="Start"
                aria-label={`Start ${name}`}
                className="btn btn-primary btn-sm btn-square"
              >
                <MdPlayArrow aria-hidden="true" />
              </button>
            ) : wallet.status === 'ready' ? (
              <button
                type="button"
                onClick={() => onStopWallet(wallet.metadata.id)}
                title="Stop"
                aria-label={`Stop ${name}`}
                className="btn btn-secondary btn-sm btn-square"
              >
                <MdStop aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                disabled
                aria-label={`${name} is ${wallet.status}`}
                className="btn btn-secondary btn-sm btn-square"
              >
                <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onEditWallet(wallet.metadata.id, name)}
              title="Rename"
              aria-label={`Rename ${name}`}
              className="btn btn-ghost btn-sm btn-square"
            >
              <MdEdit aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onRemoveWallet(wallet.metadata.id)}
              title="Remove"
              aria-label={`Remove ${name}`}
              className="btn btn-ghost btn-sm btn-square text-error"
            >
              <MdDelete aria-hidden="true" />
            </button>
          </span>
        );
      },
    },
  ];

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-browser-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="modal-box flex max-h-[90vh] w-full max-w-6xl flex-col gap-0 rounded-box border border-base-300 p-0 text-left shadow-float">
        <header className="flex flex-wrap items-center gap-3 border-b border-base-300 px-5 py-4">
          <h2 id="wallet-browser-modal-title" className="m-0 text-title">
            All wallets <span className="font-mono text-ink-muted">({wallets.length})</span>
          </h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCloudSync}
              disabled={!CLOUD_SYNC_ENABLED || isSyncing}
              className="btn btn-secondary btn-sm"
              title={
                CLOUD_SYNC_ENABLED
                  ? 'Sync wallets between this machine and the cloud'
                  : 'Cloud sync is offline until it moves to the QA server'
              }
            >
              {isSyncing ? (
                <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              ) : (
                <MdSync aria-hidden="true" />
              )}
              {isSyncing ? 'Syncing…' : 'Sync wallets'}
            </button>
            {onScanForLostFunds && (
              <button
                type="button"
                onClick={onScanForLostFunds}
                disabled={scanState?.isScanning}
                className="btn btn-primary btn-sm"
              >
                <MdSearch aria-hidden="true" />
                {scanState?.isScanning ? 'Scanning…' : 'Scan for lost funds'}
              </button>
            )}
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-square" aria-label="Close">
              <MdClose aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-3 border-b border-base-300 px-5 py-4">
          {syncResult && (
            <Callout
              tone={syncResult.success ? 'success' : 'error'}
              role={syncResult.success ? 'status' : 'alert'}
              action={
                <button
                  type="button"
                  onClick={() => setSyncResult(null)}
                  className="btn btn-ghost btn-xs btn-square"
                  aria-label="Dismiss"
                >
                  <MdClose aria-hidden="true" />
                </button>
              }
            >
              {syncResult.message}
            </Callout>
          )}

          {scanState?.isScanning && (
            <div className="flex flex-col gap-1.5" role="status">
              <div className="flex flex-wrap items-center justify-between gap-2 text-body">
                <span className="inline-flex items-center gap-2 font-medium">
                  <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                  Scanning {scanState.currentWalletName || '…'}
                </span>
                <span className="text-caption text-ink-muted">
                  {scanState.scannedCount} of {scanState.totalWallets} wallets
                  {scanState.estimatedRemainingMs
                    ? ` (${formatTimeRemaining(scanState.estimatedRemainingMs)} remaining)`
                    : ''}
                </span>
              </div>
              <progress className="progress progress-primary w-full" value={scanState.progress} max={100} />
            </div>
          )}

          <label className="input w-full">
            <MdSearch className="h-4 w-4 flex-none text-ink-muted" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by name, seed words or address"
              aria-label="Search wallets"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-w-0 grow"
              autoFocus
            />
          </label>

          {(hasScanData || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2">
              {hasScanData && onToggleFilterHasBalance && (
                <button
                  type="button"
                  onClick={onToggleFilterHasBalance}
                  aria-pressed={!!filterHasBalance}
                  className={`btn btn-sm ${filterHasBalance ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <MdFilterList aria-hidden="true" />
                  {filterHasBalance ? 'Showing with balance' : 'Show all'}
                </button>
              )}
              {hasScanData && onToggleSortByBalance && (
                <button
                  type="button"
                  onClick={onToggleSortByBalance}
                  aria-pressed={!!sortByBalance}
                  className={`btn btn-sm ${sortByBalance ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <MdSort aria-hidden="true" />
                  {sortByBalance ? 'Sorted by balance' : 'Sort by balance'}
                </button>
              )}
              {searchQuery && (
                <span className="text-caption text-ink-muted">
                  Showing {filteredWallets.length} of {wallets.length} wallets
                </span>
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          <DataTable<WalletInfo>
            caption="Wallets"
            rows={sortedWallets}
            getRowKey={(w) => w.metadata.id}
            columns={columns}
            empty={
              searchQuery
                ? 'No wallets match your search.'
                : filterHasBalance
                  ? 'No wallets with a balance found.'
                  : 'No wallets registered.'
            }
          />
        </div>

        <footer className="flex justify-end border-t border-base-300 px-5 py-3">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Close
          </button>
        </footer>
      </div>
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
    </div>
  );
}
