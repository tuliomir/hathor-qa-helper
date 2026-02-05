/**
 * Transaction History Component
 * Displays transaction history from Redux and wallet getTxHistory()
 * Supports filtering by token (HTR, custom tokens, or all)
 */

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import TxStatus from '../common/TxStatus';
import Loading from '../common/Loading';
import Select from '../common/Select';
import { NETWORK_CONFIG } from '../../constants/network';
import { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { refreshWalletTokens } from '../../store/slices/walletStoreSlice';
import type { Token } from '../../store/slices/tokensSlice';
import dateFormatter from '@hathor/wallet-lib/lib/utils/date';

const ALL_TOKENS_VALUE = '__all__';

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
  tokenSymbol?: string;
  // Keep raw data for console export
  raw: unknown;
}

export default function TransactionHistory() {
  const dispatch = useAppDispatch();
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const reduxTransactions = useAppSelector((s) => s.transactionHistory.transactions);
  const allTokens = useAppSelector((s) => s.tokens.tokens);
  const { getWallet } = useWalletStore();
  const { info } = useToast();

  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;

  const [walletTxs, setWalletTxs] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [qrModalTxHash, setQrModalTxHash] = useState<string | null>(null);
  const [selectedTokenFilter, setSelectedTokenFilter] = useState<string>(NATIVE_TOKEN_UID);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const pageSize = 20;

  // Refresh tokens on mount (same pattern as CustomTokens)
  useEffect(() => {
    async function refreshTokens() {
      if (!testWallet?.instance || !testWalletId) return;

      setIsLoadingTokens(true);
      try {
        await dispatch(refreshWalletTokens(testWalletId)).unwrap();

        const tokenUids: string[] = await testWallet.instance.getTokens();
        const htrToken: Token = {
          uid: NATIVE_TOKEN_UID,
          symbol: DEFAULT_NATIVE_TOKEN_CONFIG.symbol,
          name: DEFAULT_NATIVE_TOKEN_CONFIG.name,
        };

        const tokens: Token[] = [htrToken];
        for (const uid of tokenUids) {
          if (uid === NATIVE_TOKEN_UID) continue;
          const found = allTokens.find((t) => t.uid === uid);
          if (found) tokens.push(found);
        }

        setAvailableTokens(tokens);
      } catch (err) {
        console.error('Failed to refresh tokens:', err);
        // Fallback: at least show HTR
        setAvailableTokens([{
          uid: NATIVE_TOKEN_UID,
          symbol: DEFAULT_NATIVE_TOKEN_CONFIG.symbol,
          name: DEFAULT_NATIVE_TOKEN_CONFIG.name,
        }]);
      } finally {
        setIsLoadingTokens(false);
      }
    }

    refreshTokens();
  }, [testWallet?.instance, testWalletId]);

  // Parse a single raw tx into our WalletTransaction shape
  function parseTx(tx: unknown, tokenSymbol?: string): WalletTransaction {
    const txData = tx as {
      tx_id?: string; txId?: string; timestamp?: number; balance?: number;
      first_block?: string | number; firstBlock?: string | number; voided?: boolean; version?: number;
      nc_caller?: string; ncCaller?: string; nc_id?: string; ncId?: string;
      nc_method?: string; ncMethod?: string;
      headers?: { method?: string; [key: string]: unknown };
    };
    const rawFirstBlock = txData.first_block ?? txData.firstBlock;
    return {
      txId: txData.tx_id || txData.txId || 'unknown',
      timestamp: (txData.timestamp || 0) * 1000,
      balance: txData.balance || 0,
      firstBlock: typeof rawFirstBlock === 'string' ? parseInt(rawFirstBlock, 10) || undefined : rawFirstBlock,
      voided: txData.voided || false,
      version: txData.version,
      ncCaller: txData.nc_caller || txData.ncCaller,
      ncId: txData.nc_id || txData.ncId,
      ncMethod: txData.nc_method || txData.ncMethod,
      headers: txData.headers,
      tokenSymbol,
      raw: tx,
    };
  }

  // Fetch transaction history from wallet
  useEffect(() => {
    async function fetchTxHistory() {
      if (!testWallet?.instance) return;

      setIsLoading(true);
      setError(null);
      setCurrentPage(0);

      try {
        const hWallet = testWallet.instance;

        if (selectedTokenFilter === ALL_TOKENS_VALUE) {
          // Fetch for each token in parallel, merge and deduplicate
          const fetchPromises = availableTokens.map(async (token) => {
            const txHistory = await hWallet.getTxHistory({ token_id: token.uid });
            return txHistory.map((tx: unknown) => parseTx(tx, token.symbol));
          });

          const results = await Promise.all(fetchPromises);
          const merged: WalletTransaction[] = results.flat();

          // Deduplicate by txId — a single tx can appear in multiple token histories.
          // Keep the first occurrence per txId (they share the same raw data).
          // But since balance differs per token, we actually want all entries.
          // Sort by timestamp descending (newest first)
          merged.sort((a, b) => b.timestamp - a.timestamp);

          setWalletTxs(merged);
        } else {
          // Fetch for a single token
          const token = availableTokens.find((t) => t.uid === selectedTokenFilter);
          const txHistory = await hWallet.getTxHistory({ token_id: selectedTokenFilter });
          const simplifiedTxs = txHistory.map((tx: unknown) => parseTx(tx, token?.symbol));
          setWalletTxs(simplifiedTxs);
        }
      } catch (err) {
        console.error('Error fetching transaction history:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch transaction history');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTxHistory();
  }, [testWallet?.instance, selectedTokenFilter, availableTokens]);

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

  // Whether the "All" filter is active (shows the Token column)
  const isAllFilter = selectedTokenFilter === ALL_TOKENS_VALUE;

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

        {/* Token Filter Select */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1.5">Filter by Token:</label>
          {isLoadingTokens ? (
            <Loading message="Loading tokens..." />
          ) : (
            <Select
              value={selectedTokenFilter}
              onChange={(e) => setSelectedTokenFilter(e.target.value)}
              className="w-full max-w-xs"
            >
              <option value={ALL_TOKENS_VALUE}>All Tokens</option>
              {availableTokens.map((token) => (
                <option key={token.uid} value={token.uid}>
                  {token.symbol} — {token.name}
                </option>
              ))}
            </Select>
          )}
        </div>

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
                    {isAllFilter && (
                      <th className="text-center py-2 px-3 font-bold">Token</th>
                    )}
                    <th className="text-center py-2 px-3 font-bold">Status</th>
                    <th className="text-center py-2 px-3 font-bold">Type</th>
                    <th className="text-center py-2 px-3 font-bold">Explorer</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTxs.map((tx, idx) => {
                    const txType = getTxType(tx);
                    return (
                      <tr
                        key={`${tx.txId}-${tx.tokenSymbol ?? idx}`}
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
                        {isAllFilter && (
                          <td className="py-2 px-3 text-center">
                            <button
                              className="text-primary hover:underline text-xs font-semibold"
                              onClick={(e) => {
                                e.stopPropagation();
                                const token = availableTokens.find((t) => t.symbol === tx.tokenSymbol);
                                if (token) setSelectedTokenFilter(token.uid);
                              }}
                              title={`Filter by ${tx.tokenSymbol}`}
                            >
                              {tx.tokenSymbol}
                            </button>
                          </td>
                        )}
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
