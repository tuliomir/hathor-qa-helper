/**
 * Transaction History Component
 * Displays transaction history from Redux and wallet getTxHistory()
 */

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
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
  headers?: {
    method?: string;
    [key: string]: unknown;
  };
  // Keep raw data for console export
  raw: unknown;
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
  const [qrModalTxHash, setQrModalTxHash] = useState<string | null>(null);
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
        const simplifiedTxs: WalletTransaction[] = txHistory.map((tx: unknown) => {
          const txData = tx as { tx_id?: string; txId?: string; timestamp?: number; balance?: number; first_block?: string; firstBlock?: string; voided?: boolean; version?: number; nc_caller?: string; ncCaller?: string; nc_id?: string; ncId?: string; nc_method?: string; ncMethod?: string; headers?: unknown };
          return {
            txId: txData.tx_id || txData.txId || 'unknown',
            timestamp: (txData.timestamp || 0) * 1000, // Convert to milliseconds
            balance: txData.balance || 0,
            firstBlock: txData.first_block || txData.firstBlock,
            voided: txData.voided || false,
            version: txData.version,
            ncCaller: txData.nc_caller || txData.ncCaller,
            ncId: txData.nc_id || txData.ncId,
            ncMethod: txData.nc_method || txData.ncMethod,
            headers: txData.headers,
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
    if (tx.ncCaller || tx.ncId || tx.ncMethod) {
      // Check if it's a Nano Init transaction
      if (tx.headers?.method === 'initialize') {
        return 'Nano Init';
      }
      return 'Nano';
    }
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
                          <div className="flex items-center justify-center gap-2">
                            {txType === 'Nano Init' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQrModalTxHash(tx.txId);
                                }}
                                className="text-primary hover:text-primary-dark"
                                title="Show QR Code"
                                aria-label="Show QR Code"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-4 h-4"
                                >
                                  <rect x="3" y="3" width="7" height="7" />
                                  <rect x="14" y="3" width="7" height="7" />
                                  <rect x="3" y="14" width="7" height="7" />
                                  <path d="M14 14h1" />
                                  <path d="M15 14v1" />
                                  <path d="M14 15h1" />
                                  <path d="M19 14h1" />
                                  <path d="M20 14v1" />
                                  <path d="M19 15h1" />
                                  <path d="M14 19h1" />
                                  <path d="M15 19v1" />
                                  <path d="M14 20h1" />
                                  <path d="M19 19h1" />
                                  <path d="M20 19v1" />
                                  <path d="M19 20h1" />
                                </svg>
                              </button>
                            )}
                            <a
                              href={getExplorerUrl(tx.txId)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View
                            </a>
                          </div>
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

      {/* QR Code Modal */}
      {qrModalTxHash && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setQrModalTxHash(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold m-0">Transaction QR Code</h3>
              <button
                onClick={() => setQrModalTxHash(null)}
                className="text-2xl leading-none text-muted hover:text-gray-900"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white border-2 border-gray-300 rounded">
                <QRCode value={qrModalTxHash} size={200} />
              </div>
              <p className="font-mono text-2xs break-all m-0 p-2 bg-gray-100 rounded text-center w-full">
                {qrModalTxHash}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
