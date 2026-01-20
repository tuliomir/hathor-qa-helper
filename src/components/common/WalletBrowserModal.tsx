/**
 * Wallet Browser Modal
 * Modal for browsing, searching, and managing all registered wallets
 * Used when there are many wallets to avoid cluttering the main view
 */

import { useMemo, useState } from 'react';
import { MdDelete, MdEdit, MdPlayArrow, MdQrCode, MdSearch, MdStop } from 'react-icons/md';
import type { WalletInfo } from '../../types/walletStore';
import type { NetworkType } from '../../constants/network';
import { formatBalance } from '../../utils/balanceUtils';
import CopyButton from './CopyButton';
import NetworkSwapButton from './NetworkSwapButton';

interface WalletBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletInfo[];
  onStartWallet: (walletId: string) => Promise<void>;
  onStopWallet: (walletId: string) => Promise<void>;
  onRemoveWallet: (walletId: string) => void;
  onEditWallet: (walletId: string, currentName: string) => void;
  onShowSeedModal: (walletId: string) => void;
  onSwapNetwork: (walletId: string, currentNetwork: NetworkType, status: string) => Promise<void>;
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
}: WalletBrowserModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter wallets based on search query
  const filteredWallets = useMemo(() => {
    if (!searchQuery.trim()) return wallets;
    const query = searchQuery.toLowerCase();
    return wallets.filter(
      (w) =>
        w.metadata.friendlyName.toLowerCase().includes(query) ||
        w.metadata.seedWords.toLowerCase().includes(query) ||
        w.firstAddress?.toLowerCase().includes(query)
    );
  }, [wallets, searchQuery]);

  // Sort by lastUsedAt (most recent first), then by createdAt
  const sortedWallets = useMemo(() => {
    return [...filteredWallets].sort((a, b) => {
      const aLastUsed = a.metadata.lastUsedAt || a.metadata.createdAt;
      const bLastUsed = b.metadata.lastUsedAt || b.metadata.createdAt;
      return bLastUsed - aLastUsed;
    });
  }, [filteredWallets]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-success';
      case 'error':
        return 'text-danger';
      case 'connecting':
      case 'syncing':
        return 'text-warning';
      default:
        return 'text-muted';
    }
  };

  const getRowBackgroundColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      case 'connecting':
      case 'syncing':
        return 'bg-yellow-50';
      default:
        return '';
    }
  };

  const truncateAddress = (addr: string, start = 3, end = 8) => {
    if (!addr) return '';
    if (addr.length <= start + end + 3) return addr;
    return addr.slice(0, start) + '...' + addr.slice(-end);
  };

  const firstNWords = (seed: string, n: number = 3) => {
    if (!seed) return '';
    const words = seed.trim().split(/\s+/);
    if (words.length <= n) return words.join(' ');
    return words.slice(0, n).join(' ') + '...';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold m-0">All Wallets ({wallets.length})</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, seed words, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
                autoFocus
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-muted mt-2 mb-0">
                Showing {filteredWallets.length} of {wallets.length} wallets
              </p>
            )}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto p-4">
            {sortedWallets.length === 0 ? (
              <div className="p-10 text-center text-muted">
                <p className="text-lg m-0">
                  {searchQuery ? 'No wallets match your search' : 'No wallets registered'}
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse bg-white">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="table-header">
                    <th className="p-3 text-left font-bold">Name</th>
                    <th className="p-3 text-left font-bold">Seed</th>
                    <th className="p-3 text-left font-bold">Network</th>
                    <th className="p-3 text-left font-bold">Status</th>
                    <th className="p-3 text-left font-bold">Address</th>
                    <th className="p-3 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWallets.map((wallet) => (
                    <tr
                      key={wallet.metadata.id}
                      className={`table-row ${getRowBackgroundColor(wallet.status)}`}
                    >
                      <td className="p-3">
                        <strong>{wallet.metadata.friendlyName}</strong>
                        {wallet.metadata.lastUsedAt && (
                          <div className="text-xs text-muted mt-1">
                            Last used: {new Date(wallet.metadata.lastUsedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted">
                        <div className="flex items-center gap-2">
                          <span className="break-words max-w-[12rem] block font-mono">
                            {firstNWords(wallet.metadata.seedWords, 3)}
                          </span>
                          <CopyButton
                            text={wallet.metadata.seedWords}
                            label={`Copy seed for ${wallet.metadata.friendlyName}`}
                            className="text-muted"
                          />
                          <button
                            onClick={() => onShowSeedModal(wallet.metadata.id)}
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
                            onSwap={onSwapNetwork}
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
                      <td
                        className={`p-3 font-mono text-xs ${wallet.firstAddress ? 'text-success' : 'text-muted'}`}
                      >
                        {wallet.firstAddress ? (
                          <div className="flex items-center gap-2">
                            <span className="break-all">{truncateAddress(wallet.firstAddress)}</span>
                            <CopyButton
                              text={wallet.firstAddress}
                              label={`Copy address for ${wallet.metadata.friendlyName}`}
                              className="text-muted"
                            />
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1.5 justify-center flex-wrap">
                          {wallet.status === 'idle' || wallet.status === 'error' ? (
                            <button
                              onClick={() => onStartWallet(wallet.metadata.id)}
                              title="Start"
                              aria-label={`Start ${wallet.metadata.friendlyName}`}
                              className="btn-primary btn-square text-xs p-2"
                            >
                              <MdPlayArrow />
                            </button>
                          ) : wallet.status === 'ready' ? (
                            <button
                              onClick={() => onStopWallet(wallet.metadata.id)}
                              title="Stop"
                              aria-label={`Stop ${wallet.metadata.friendlyName}`}
                              className="btn btn-square text-xs p-2 bg-black text-white hover:bg-gray-800"
                            >
                              <MdStop />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="btn-secondary btn-square text-xs cursor-not-allowed opacity-60 p-2"
                            >
                              ⏳
                            </button>
                          )}

                          <button
                            onClick={() =>
                              onEditWallet(wallet.metadata.id, wallet.metadata.friendlyName)
                            }
                            title="Rename"
                            aria-label={`Rename ${wallet.metadata.friendlyName}`}
                            className="btn-warning btn-square text-xs p-2"
                          >
                            <MdEdit />
                          </button>

                          <button
                            onClick={() => onRemoveWallet(wallet.metadata.id)}
                            title="Remove"
                            aria-label={`Remove ${wallet.metadata.friendlyName}`}
                            className="btn-danger btn-square text-xs p-2"
                          >
                            <MdDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-4 border-t border-gray-200">
            <button onClick={onClose} className="btn btn-ghost px-6 py-2">
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
