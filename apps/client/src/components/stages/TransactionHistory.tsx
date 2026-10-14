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
import { MdClose, MdQrCode2, MdTerminal } from 'react-icons/md';
import TxStatus from '../common/TxStatus';
import { ExplorerLink } from '../common/ExplorerLink';
import { Identifier } from '../common/Identifier';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Panel } from '../ui/Panel';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { EmptyState } from '../ui/EmptyState';
import { useRequireTestWallet } from '../../hooks/useRequirements';
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
  const testWalletRequirement = useRequireTestWallet();

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
        setAvailableTokens([
          {
            uid: NATIVE_TOKEN_UID,
            symbol: DEFAULT_NATIVE_TOKEN_CONFIG.symbol,
            name: DEFAULT_NATIVE_TOKEN_CONFIG.name,
          },
        ]);
      } finally {
        setIsLoadingTokens(false);
      }
    }

    refreshTokens();
  }, [testWallet?.instance, testWalletId]);

  // Parse a single raw tx into our WalletTransaction shape
  function parseTx(tx: unknown, tokenSymbol?: string): WalletTransaction {
    const txData = tx as {
      tx_id?: string;
      txId?: string;
      timestamp?: number;
      balance?: number;
      first_block?: string | number;
      firstBlock?: string | number;
      voided?: boolean;
      version?: number;
      nc_caller?: string;
      ncCaller?: string;
      nc_id?: string;
      ncId?: string;
      nc_method?: string;
      ncMethod?: string;
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
  const paginatedTxs = walletTxs.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const totalPages = Math.ceil(walletTxs.length / pageSize);

  const network = testWallet?.metadata.network;
  type AppTx = (typeof reduxTransactions)[number];

  const logRawButton = (onClick: () => void) => (
    <button type="button" className="btn btn-ghost btn-xs" onClick={onClick}>
      <MdTerminal aria-hidden="true" />
      Log raw
    </button>
  );

  const appColumns: DataTableColumn<AppTx>[] = [
    {
      key: 'hash',
      header: 'Hash',
      type: 'identifier',
      render: (tx) => <Identifier value={tx.hash} kind="tx" head={6} tail={6} />,
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      className: 'whitespace-nowrap',
      value: (tx) => dateFormatter.parseTimestamp(tx.timestamp),
    },
    {
      key: 'to',
      header: 'To',
      type: 'identifier',
      render: (tx) => (tx.toAddress ? <Identifier value={tx.toAddress} kind="address" /> : null),
    },
    {
      key: 'amount',
      header: 'Amount',
      type: 'amount',
      render: (tx) => (
        <>
          {tx.amount} <span className="font-sans text-ink-muted">{tx.tokenSymbol}</span>
        </>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      type: 'status',
      render: (tx) => <TxStatus hash={tx.hash} walletId={testWalletId ?? undefined} />,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      type: 'actions',
      hideLabelWhenStacked: true,
      render: (tx) => (
        <span className="inline-flex items-center gap-1">
          <ExplorerLink hash={tx.hash} network={network} />
          {logRawButton(() => {
            console.log(`Showing tx ${truncateHash(tx.hash)}`, tx);
            info('Raw tx exported to console');
          })}
        </span>
      ),
    },
  ];

  const walletColumns: DataTableColumn<WalletTransaction>[] = [
    {
      key: 'hash',
      header: 'Hash',
      type: 'identifier',
      render: (tx) => <Identifier value={tx.txId} kind="tx" head={6} tail={6} />,
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      className: 'whitespace-nowrap',
      value: (tx) => dateFormatter.parseTimestamp(tx.timestamp / 1000),
    },
    { key: 'balance', header: 'Balance', type: 'amount', value: (tx) => tx.balance },
    ...(isAllFilter
      ? [
          {
            key: 'token',
            header: 'Token',
            render: (tx: WalletTransaction) => (
              <button
                type="button"
                className="link link-primary font-semibold"
                onClick={() => {
                  const token = availableTokens.find((t) => t.symbol === tx.tokenSymbol);
                  if (token) setSelectedTokenFilter(token.uid);
                }}
                title={`Filter by ${tx.tokenSymbol}`}
              >
                {tx.tokenSymbol}
              </button>
            ),
          },
        ]
      : []),
    {
      key: 'status',
      header: 'Status',
      type: 'status',
      render: (tx) => <TxStatus hash={tx.txId} walletId={testWalletId ?? undefined} />,
    },
    { key: 'type', header: 'Type', className: 'whitespace-nowrap', value: (tx) => getTxType(tx) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      type: 'actions',
      hideLabelWhenStacked: true,
      render: (tx) => (
        <span className="inline-flex items-center gap-1">
          {getTxType(tx) === 'Nano Init' && (
            <button
              type="button"
              onClick={() => setQrModalTxHash(tx.txId)}
              className="btn btn-ghost btn-xs btn-square"
              title="Show QR code"
              aria-label="Show QR code"
            >
              <MdQrCode2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <ExplorerLink hash={tx.txId} network={network} />
          {logRawButton(() => handleTxClick(tx))}
        </span>
      ),
    },
  ];

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="transaction-history"
        description={testWallet ? `View transaction history for ${testWallet.metadata.friendlyName}` : undefined}
      />
      <PreconditionStrip requirements={[testWalletRequirement]} />

      {!testWallet ? (
        <Panel title="Transactions">
          <EmptyState>Transactions appear here once a test wallet is selected.</EmptyState>
        </Panel>
      ) : (
        <>
          <Panel title="App transactions" description="Transactions created by this application (stored in Redux)">
            <DataTable
              caption="App transactions"
              columns={appColumns}
              rows={reduxTransactions}
              getRowKey={(tx) => tx.hash}
              empty="Transactions sent from this app appear here."
            />
          </Panel>

          <Panel
            title="Wallet transaction history"
            description="Full transaction history from wallet-lib (paginated)"
            actions={
              isLoadingTokens ? (
                <span className="flex items-center gap-2 text-body text-ink-muted">
                  <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                  Loading tokens…
                </span>
              ) : (
                <label className="flex items-center gap-2 text-body">
                  <span className="text-ink-muted">Token</span>
                  <select
                    value={selectedTokenFilter}
                    onChange={(e) => setSelectedTokenFilter(e.target.value)}
                    className="select select-sm w-auto max-w-xs"
                  >
                    <option value={ALL_TOKENS_VALUE}>All tokens</option>
                    {availableTokens.map((token) => (
                      <option key={token.uid} value={token.uid}>
                        {token.symbol} — {token.name}
                      </option>
                    ))}
                  </select>
                </label>
              )
            }
            footer={
              !isLoading && !error && totalPages > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="btn btn-secondary btn-sm"
                  >
                    Previous
                  </button>
                  <span className="text-body text-ink-muted">
                    Page {currentPage + 1} of {totalPages} ({walletTxs.length} total)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="btn btn-secondary btn-sm ml-auto"
                  >
                    Next
                  </button>
                </>
              ) : undefined
            }
          >
            <DataTable
              caption="Wallet transaction history"
              columns={walletColumns}
              rows={paginatedTxs}
              getRowKey={(tx, idx) => `${tx.txId}-${tx.tokenSymbol ?? idx}`}
              loading={isLoading}
              error={error ? { message: 'Could not load the transaction history.', detail: error } : null}
              empty="No transactions found for this token."
            />
          </Panel>
        </>
      )}

      {qrModalTxHash && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="tx-qr-title">
          <div className="modal-box max-w-sm rounded-box border border-base-300 p-5 text-left shadow-float">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="tx-qr-title" className="m-0 text-title">
                Transaction QR code
              </h3>
              <button
                type="button"
                onClick={() => setQrModalTxHash(null)}
                className="btn btn-ghost btn-sm btn-square"
                aria-label="Close"
              >
                <MdClose aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-field border border-base-300 bg-base-100 p-4">
                <QRCode value={qrModalTxHash} size={200} />
              </div>
              <Identifier value={qrModalTxHash} kind="tx" truncate="none" />
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setQrModalTxHash(null)} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
