/**
 * Transaction History Component
 * Displays transaction history from Redux and wallet getTxHistory()
 */

import { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import TxStatus from '../common/TxStatus';
import Loading from '../common/Loading';
import { NETWORK_CONFIG } from '../../constants/network';
import dateFormatter from '@hathor/wallet-lib/lib/utils/date';

interface WalletTransaction {
  txId: string;
  timestamp: number;
  balance: number;
  firstBlock?: number;
  voided: boolean;
  version?: number;
  ncCaller?: string;
  ncId?: string;
  ncMethod?: string;
  // Keep raw data for console export
  raw: any;
}

export default function TransactionHistory() {
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const reduxTransactions = useAppSelector((s) => s.transactionHistory.transactions);
  const { getWallet } = useWalletStore();
  const { info } = useToast();

  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;

  const [walletTxs, setWalletTxs] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Fetch transaction history from wallet
  useEffect(() => {
    async function fetchTxHistory() {
      if (!testWallet?.instance) return;

      setIsLoading(true);
      setError(null);

      try {
        const hWallet = testWallet.instance;
        const txHistory = await hWallet.getTxHistory();

        console.log('Raw getTxHistory() response:', txHistory);
        console.log('First transaction sample:', txHistory[0]);

        // Extract the fields we need
        const simplifiedTxs: WalletTransaction[] = txHistory.map((tx: any) => {
          return {
            txId: tx.tx_id || tx.txId || 'unknown',
            timestamp: (tx.timestamp || 0) * 1000, // Convert to milliseconds
            balance: tx.balance || 0,
            firstBlock: tx.first_block || tx.firstBlock,
            voided: tx.voided || false,
            version: tx.version,
            ncCaller: tx.nc_caller || tx.ncCaller,
            ncId: tx.nc_id || tx.ncId,
            ncMethod: tx.nc_method || tx.ncMethod,
            raw: tx, // Keep raw data for console export
          };
        });

        setWalletTxs(simplifiedTxs);
      } catch (err) {
        console.error('Error fetching transaction history:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch transaction history');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTxHistory();
  }, [testWallet]);

  // Truncate hash for display
  function truncateHash(hash: string | undefined): string {
    if (!hash) return 'N/A';
    if (hash.length <= 12) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
  }

  // Get explorer URL based on network
  function getExplorerUrl(hash: string): string {
    const network = testWallet?.metadata.network || 'testnet';
    const baseUrl = network === 'MAINNET'
      ? NETWORK_CONFIG.MAINNET.explorerUrl
      : NETWORK_CONFIG.TESTNET.explorerUrl;
    return `${baseUrl}transaction/${hash}`;
  }

  // Determine transaction type
  function getTxType(tx: WalletTransaction): string {
    if (tx.ncCaller || tx.ncId || tx.ncMethod) return 'Nano';
    if (tx.version === 2) return 'Token Creation';
    return 'Common';
  }

  // Handle transaction row click
  function handleTxClick(tx: WalletTransaction) {
    const truncated = truncateHash(tx.txId);
    console.log(`Showing tx ${truncated}`, tx.raw);
    info('Raw tx exported to console');
  }

  // Paginate wallet transactions
  const paginatedTxs = walletTxs.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );
  const totalPages = Math.ceil(walletTxs.length / pageSize);

  if (!testWallet) {
    return (
      <div className="max-w-300 mx-auto">
        <h1 className="mt-0 text-3xl font-bold">Transaction History</h1>
        <p className="text-danger">No test wallet selected. Please select a test wallet first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Transaction History</h1>
      <p className="text-muted mb-7.5">
        View transaction history for {testWallet.metadata.friendlyName}
      </p>

      {/* Section 1: Redux Transactions */}
      <div className="card-primary mb-6">
        <h2 className="text-xl font-bold mb-4">App Transactions</h2>
        <p className="text-sm text-muted mb-4">
          Transactions created by this application (stored in Redux)
        </p>

        {reduxTransactions.length === 0 ? (
          <p className="text-muted text-sm">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-300">
                <tr>
                  <th className="text-left py-2 px-3 font-bold">Hash</th>
                  <th className="text-left py-2 px-3 font-bold">Timestamp</th>
                  <th className="text-left py-2 px-3 font-bold">To</th>
                  <th className="text-right py-2 px-3 font-bold">Amount</th>
                  <th className="text-center py-2 px-3 font-bold">Status</th>
                  <th className="text-center py-2 px-3 font-bold">Explorer</th>
                </tr>
              </thead>
              <tbody>
                {reduxTransactions.map((tx) => (
                  <tr
                    key={tx.hash}
                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      console.log(`Showing tx ${truncateHash(tx.hash)}`, tx);
                      info('Raw tx exported to console');
                    }}
                  >
                    <td className="py-2 px-3 font-mono text-xs" title={tx.hash}>
                      <div className="flex items-center gap-2">
                        {truncateHash(tx.hash)}
                        <CopyButton text={tx.hash} label="" />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {dateFormatter.parseTimestamp(tx.timestamp)}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs" title={tx.toAddress}>
                      {truncateHash(tx.toAddress)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {tx.amount} {tx.tokenSymbol}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <TxStatus hash={tx.hash} walletId={testWalletId ?? undefined} />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <a
                        href={getExplorerUrl(tx.hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Wallet getTxHistory */}
      <div className="card-primary">
        <h2 className="text-xl font-bold mb-4">Wallet Transaction History</h2>
        <p className="text-sm text-muted mb-4">
          Full transaction history from wallet-lib (paginated)
        </p>

        {isLoading && <Loading message="Loading transaction history..." />}

        {error && (
          <p className="text-danger text-sm">
            Error: {error}
          </p>
        )}

        {!isLoading && !error && walletTxs.length === 0 && (
          <p className="text-muted text-sm">No transactions found</p>
        )}

        {!isLoading && !error && walletTxs.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-300">
                  <tr>
                    <th className="text-left py-2 px-3 font-bold">Hash</th>
                    <th className="text-left py-2 px-3 font-bold">Timestamp</th>
                    <th className="text-right py-2 px-3 font-bold">Balance</th>
                    <th className="text-center py-2 px-3 font-bold">Status</th>
                    <th className="text-center py-2 px-3 font-bold">Type</th>
                    <th className="text-center py-2 px-3 font-bold">Explorer</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTxs.map((tx) => {
                    const txType = getTxType(tx);
                    return (
                      <tr
                        key={tx.txId}
                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleTxClick(tx)}
                      >
                        <td className="py-2 px-3 font-mono text-xs" title={tx.txId}>
                          <div className="flex items-center gap-2">
                            {truncateHash(tx.txId)}
                            <CopyButton text={tx.txId} label="" />
                          </div>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {dateFormatter.parseTimestamp(tx.timestamp/1000)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {tx.balance}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <TxStatus hash={tx.txId} walletId={testWalletId ?? undefined} />
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {txType}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <a
                            href={getExplorerUrl(tx.txId)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="text-sm text-muted">
                  Page {currentPage + 1} of {totalPages} ({walletTxs.length} total)
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
