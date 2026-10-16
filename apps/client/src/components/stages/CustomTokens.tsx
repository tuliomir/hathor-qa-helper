/**
 * Custom Tokens Stage
 * Displays custom tokens for wallets from the global store
 */

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { WalletInfo } from '../../types/walletStore';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { getConfigurationString } from '../../utils/tokenConfigString';
import CopyButton from '../common/CopyButton';
import { refreshWalletBalance, refreshWalletTokens } from '../../store/slices/walletStoreSlice';
import type { Token } from '../../store/slices/tokensSlice';
import { formatBalance } from '../../utils/balanceUtils';
import { useSendTransaction } from '../../hooks/useSendTransaction';
import type { NetworkKey } from '../../constants/network';
import { WALLET_CONFIG } from '../../constants/network';
import { MdRefresh, MdShield } from 'react-icons/md';
import NetworkChip from '../common/NetworkChip';
import { Identifier } from '../common/Identifier';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { EmptyState } from '../ui/EmptyState';
import { SegmentedControl } from '../ui/SegmentedControl';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { useRequireFundingWallet, useRequireTestWallet } from '../../hooks/useRequirements';
import { useToast } from '../../hooks/useToast';
import { ExplorerLink } from '../common/ExplorerLink';
import AllConfigStringsModal from '../common/AllConfigStringsModal';
import { applyNetworkServices } from '../../services/networkServices';
import { useConfirm } from '../../hooks/useConfirm';
import { buildTransferTemplate } from '../../services/tokenTransfer';
import { AddressQr } from '../common/AddressQr';
import { useShieldedTransfer } from '../../hooks/useShieldedTransfer';
import { estimateShieldedFee } from '../../fees';
import type { ShieldedOutputModeName } from '@qa-helper/shared/serverApi';
import { DECIMAL_PLACES } from '@hathor/wallet-lib/lib/constants';
import { formatAmount } from '../../utils/amount';

type TabType = 'fund' | 'test';

// Hook for lazy-loading token balance
function useTokenBalance(walletInstance: unknown | null, tokenUid: string, refreshKey?: number) {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchBalance = async () => {
      if (!walletInstance) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const bal = await (
          walletInstance as { getBalance: (tokenUid: string) => Promise<Array<{ balance?: { unlocked?: bigint } }>> }
        ).getBalance(tokenUid);
        if (isMounted) {
          setBalance(bal[0]?.balance?.unlocked || 0n);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Failed to load balance for token ${tokenUid}:`, err);
          setError('Failed to load');
          setIsLoading(false);
        }
      }
    };

    fetchBalance();

    return () => {
      isMounted = false;
    };
  }, [walletInstance, tokenUid, refreshKey]);

  return { balance, isLoading, error };
}

// Lazy-loaded balance cell for one token row
function TokenBalanceCell({
  walletInstance,
  tokenUid,
  refreshKey,
}: {
  walletInstance: unknown | null;
  tokenUid: string;
  refreshKey?: number;
}) {
  const { balance, isLoading, error } = useTokenBalance(walletInstance, tokenUid, refreshKey);
  if (isLoading) return <span className="skeleton inline-block h-4 w-16 align-middle" aria-label="Loading" />;
  if (error) return <span className="font-sans text-caption text-error">{error}</span>;
  if (balance === null) return null;
  return <>{formatBalance(balance)}</>;
}

// Component for displaying wallet tokens
function WalletTokensDisplay({
  wallet,
  fundingWalletId,
  testWalletId,
  isTestWallet,
}: {
  wallet: WalletInfo;
  fundingWalletId: string | null;
  testWalletId: string | null;
  isTestWallet: boolean;
}) {
  const dispatch = useAppDispatch();
  const { getAllWallets } = useWalletStore();
  const { sendTransaction, sendShielded, isSending, error: transactionError } = useSendTransaction();
  const otherWalletId = isTestWallet ? fundingWalletId : testWalletId;
  const shieldedTransfer = useShieldedTransfer(wallet.metadata.id, otherWalletId);
  const allTokens = useAppSelector((s) => s.tokens.tokens);
  const [selectedTokenUid, setSelectedTokenUid] = useState<string | null>(null);
  const [configString, setConfigString] = useState<string | null>(null);
  const [addressIndex, setAddressIndex] = useState(0);
  const [amount, setAmount] = useState(1);
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [otherWalletAddress, setOtherWalletAddress] = useState<string | null>(null);
  const [hasMeltAuthority, setHasMeltAuthority] = useState(false);
  const [isMelting, setIsMelting] = useState(false);
  const [meltError, setMeltError] = useState<string | null>(null);
  const [hideZeroBalance, setHideZeroBalance] = useState(true);
  const [tokenBalances, setTokenBalances] = useState<Map<string, bigint>>(new Map());
  const [isFetchingFirstEmpty, setIsFetchingFirstEmpty] = useState(false);
  const [isAllConfigStringsModalOpen, setIsAllConfigStringsModalOpen] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  const { success: toastSuccess } = useToast();
  // Token UIDs fetched directly from wallet instance (more reliable than Redux store)
  const [fetchedTokenUids, setFetchedTokenUids] = useState<string[]>([]);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Refresh the tokens when page is opened
  useEffect(() => {
    handleRefresh().catch((e) => console.error('Failed refresh', e));
  }, []);

  // Fetch tokens directly from wallet instance (more reliable than Redux store)
  // This catches tokens received from other wallets that may not be in wallet.tokenUids
  useEffect(() => {
    const fetchTokensFromInstance = async () => {
      if (!wallet?.instance) {
        setFetchedTokenUids([]);
        return;
      }

      try {
        // Use getTokens() directly on the wallet instance for complete token list
        const tokenUids: string[] = await wallet.instance.getTokens();
        setFetchedTokenUids(tokenUids);
      } catch (err) {
        console.error('Failed to fetch tokens from wallet instance:', err);
        // Fallback to Redux store data if direct fetch fails
        setFetchedTokenUids(wallet.tokenUids || []);
      }
    };

    fetchTokensFromInstance();
  }, [wallet?.instance, wallet?.metadata.id, refreshKey]);

  // Reset selected token when wallet changes
  useEffect(() => {
    setSelectedTokenUid(null);
    setConfigString(null);
  }, [wallet?.metadata.id]);

  // Filter tokens for this wallet (exclude native token)
  // Uses fetchedTokenUids from direct wallet instance call instead of Redux store
  const walletTokens: Token[] = fetchedTokenUids
    .filter((uid) => uid !== NATIVE_TOKEN_UID)
    .map((uid) => allTokens.find((t) => t.uid === uid))
    .filter((t): t is Token => t !== undefined)
    .sort((a, b) => {
      // Sort by timestamp (newer first). Tokens without timestamps are sorted
      // by their position in fetchedTokenUids (reversed — wallet returns oldest first).
      if (a.timestamp && b.timestamp) return b.timestamp - a.timestamp;
      if (a.timestamp && !b.timestamp) return -1;
      if (!a.timestamp && b.timestamp) return 1;
      // Both lack timestamps: use reverse index order (later = newer)
      const idxA = fetchedTokenUids.indexOf(a.uid);
      const idxB = fetchedTokenUids.indexOf(b.uid);
      return idxB - idxA;
    });

  // Load all token balances for filtering
  useEffect(() => {
    const loadAllBalances = async () => {
      if (!wallet.instance || walletTokens.length === 0) {
        setTokenBalances(new Map());
        return;
      }

      const balances = new Map<string, bigint>();

      await Promise.all(
        walletTokens.map(async (token) => {
          try {
            const bal = await wallet.instance!.getBalance(token.uid);
            balances.set(token.uid, bal[0]?.balance?.unlocked || 0n);
          } catch (err) {
            console.error(`Failed to load balance for token ${token.uid}:`, err);
            balances.set(token.uid, 0n);
          }
        })
      );

      setTokenBalances(balances);
    };

    loadAllBalances();
  }, [wallet.instance, walletTokens.length, refreshKey]);

  // Filter tokens based on zero balance checkbox
  const filteredTokens = hideZeroBalance
    ? walletTokens.filter((token) => {
        const balance = tokenBalances.get(token.uid);
        return balance === undefined || balance > 0n;
      })
    : walletTokens;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTokens.length / PAGE_SIZE));
  const paginatedTokens = filteredTokens.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [hideZeroBalance, filteredTokens.length]);

  // Auto-select first token when wallet changes or tokens load
  useEffect(() => {
    if (filteredTokens.length > 0 && !selectedTokenUid) {
      const firstToken = filteredTokens[0];
      setSelectedTokenUid(firstToken.uid);
      const config = getConfigurationString(firstToken.uid, firstToken.name, firstToken.symbol);
      setConfigString(config);
    }
  }, [filteredTokens.length, selectedTokenUid]);

  // Derive address when index changes
  useEffect(() => {
    const deriveAddress = async () => {
      if (!wallet || !wallet.instance) {
        setDerivedAddress(null);
        return;
      }

      try {
        const address = await wallet.instance.getAddressAtIndex(addressIndex);
        setDerivedAddress(address);
      } catch (err) {
        console.error('Failed to derive address:', err);
        setDerivedAddress(null);
      }
    };

    deriveAddress();
  }, [wallet, addressIndex]);

  // Derive other wallet's address (at index 0)
  useEffect(() => {
    const deriveOtherWalletAddress = async () => {
      // Determine which is the "other" wallet
      const wallets = getAllWallets();

      // If viewing test wallet, other is funding. If viewing funding, other is test.
      const otherWalletId = isTestWallet ? fundingWalletId : testWalletId;

      if (!otherWalletId) {
        setOtherWalletAddress(null);
        return;
      }

      const otherWallet = wallets.find((w) => w.metadata.id === otherWalletId && w.status === 'ready');

      if (!otherWallet || !otherWallet.instance) {
        setOtherWalletAddress(null);
        return;
      }

      try {
        const address = await otherWallet.instance.getAddressAtIndex(0);
        setOtherWalletAddress(address);
      } catch (err) {
        console.error('Failed to derive other wallet address:', err);
        setOtherWalletAddress(null);
      }
    };

    deriveOtherWalletAddress();
  }, [wallet, isTestWallet, fundingWalletId, testWalletId, getAllWallets]);

  // Check melt authority when selected token changes
  useEffect(() => {
    const checkMeltAuthority = async () => {
      if (!wallet.instance || !selectedTokenUid || !isTestWallet) {
        setHasMeltAuthority(false);
        return;
      }

      try {
        const meltAuthority = await wallet.instance.getMeltAuthority(selectedTokenUid, {
          many: false,
          only_available_utxos: true,
        });
        setHasMeltAuthority(meltAuthority && meltAuthority.length > 0);
      } catch (err) {
        console.error('Failed to check melt authority:', err);
        setHasMeltAuthority(false);
      }
    };

    checkMeltAuthority();
  }, [wallet.instance, selectedTokenUid, isTestWallet, refreshKey]);

  const handleTokenClick = (uid: string, name: string, symbol: string) => {
    setSelectedTokenUid(uid);
    const config = getConfigurationString(uid, name, symbol);
    setConfigString(config);
  };

  const handleAddressIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setAddressIndex(0);
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setAddressIndex(parsed);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setAmount(value);
    } else if (e.target.value === '') {
      setAmount(1);
    }
  };

  const handleGetFirstEmpty = async () => {
    if (!wallet || !wallet.instance) {
      return;
    }

    setIsFetchingFirstEmpty(true);
    setMeltError(null);

    try {
      const currentAddress = await wallet.instance.getCurrentAddress();
      if (currentAddress.index != null) setAddressIndex(currentAddress.index);
    } catch (err) {
      setMeltError(err instanceof Error ? err.message : 'Failed to get first empty address');
    } finally {
      setIsFetchingFirstEmpty(false);
    }
  };

  const handleGetAddr0 = () => {
    setAddressIndex(0);
    setMeltError(null);
  };

  const handleRefresh = async () => {
    if (!wallet || isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Refresh both tokens and balance
      await Promise.all([
        dispatch(refreshWalletTokens(wallet.metadata.id)).unwrap(),
        dispatch(refreshWalletBalance(wallet.metadata.id)).unwrap(),
      ]);
      // Trigger token balance refresh by incrementing the key
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to refresh wallet data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Send handler for the "Send from Fund Wallet" button
  const handleSendFromFundWallet = async () => {
    if (!fundingWalletId || !derivedAddress || !selectedToken) {
      return;
    }

    try {
      // Get the funding wallet
      const wallets = getAllWallets();
      const fundingWallet = wallets.find((w) => w.metadata.id === fundingWalletId && w.status === 'ready');

      if (!fundingWallet || !fundingWallet.instance) {
        throw new Error('Funding wallet not found or not ready');
      }

      // Get the first address of the funding wallet for change
      const fundWalletFirstAddress = await fundingWallet.instance.getAddressAtIndex(0);

      // Build the transaction template
      const template = buildTransferTemplate(
        [{ address: derivedAddress, amount: BigInt(amount), token: selectedToken.uid }],
        fundWalletFirstAddress
      );

      // Send the transaction using the centralized hook
      await sendTransaction(
        template,
        {
          fromWalletId: fundingWalletId,
          fromWallet: fundingWallet,
          toAddress: derivedAddress,
          amount,
          tokenUid: selectedToken.uid,
          tokenSymbol: selectedToken.symbol,
        },
        WALLET_CONFIG.DEFAULT_PIN_CODE
      );
    } catch (err) {
      // Error is already handled by the hook
      console.error('Transaction error:', err);
    }
  };

  const selectedToken = filteredTokens.find((t) => t.uid === selectedTokenUid);

  // Send handler for sending to the other wallet
  const handleSendToOtherWallet = async () => {
    if (!otherWalletAddress || !selectedToken || !wallet.instance) {
      return;
    }

    try {
      // Get the first address of the current wallet for change
      const currentWalletFirstAddress = await wallet.instance.getAddressAtIndex(0);

      // Build the transaction template
      const template = buildTransferTemplate(
        [{ address: otherWalletAddress, amount: BigInt(amount), token: selectedToken.uid }],
        currentWalletFirstAddress
      );

      // Send the transaction using the centralized hook
      await sendTransaction(
        template,
        {
          fromWalletId: wallet.metadata.id,
          fromWallet: wallet,
          toAddress: otherWalletAddress,
          amount,
          tokenUid: selectedToken.uid,
          tokenSymbol: selectedToken.symbol,
        },
        WALLET_CONFIG.DEFAULT_PIN_CODE
      );
    } catch (err) {
      // Error is already handled by the hook
      console.error('Transaction error:', err);
    }
  };

  // Shielded send to the other wallet's shielded address 0, through this wallet's signer
  const handleSendShieldedToOtherWallet = async (mode: ShieldedOutputModeName) => {
    const { sessionId, recipient } = shieldedTransfer;
    if (!sessionId || !recipient || !selectedToken) return;
    try {
      await sendShielded(
        sessionId,
        { outputs: [{ address: recipient, value: String(amount), token: selectedToken.uid, shielded: mode }] },
        {
          fromWalletId: wallet.metadata.id,
          fromWallet: wallet,
          toAddress: recipient,
          amount,
          tokenUid: selectedToken.uid,
          tokenSymbol: selectedToken.symbol,
        }
      );
    } catch (err) {
      // Error is already handled by the hook
      console.error('Shielded transaction error:', err);
    }
  };

  // Handler for melting tokens
  const handleMeltTokens = async () => {
    if (!selectedToken || !wallet.instance || !isTestWallet) {
      return;
    }

    setMeltError(null);

    try {
      // Get current balance directly from wallet instance
      const balanceData = await wallet.instance.getBalance(selectedToken.uid);
      const balance = balanceData[0]?.balance?.unlocked || 0n;

      if (balance === 0n) {
        setMeltError('No tokens to melt');
        return;
      }

      // Calculate maximum meltable amount (must be multiple of 100)
      const balanceNum = Number(balance);
      const maxMeltable = Math.floor(balanceNum / 100) * 100;

      if (maxMeltable === 0) {
        setMeltError('Balance must be at least 100 to melt tokens');
        return;
      }

      console.log({ balanceNum, maxMeltable, token: selectedToken.symbol });

      // Confirm with user
      const confirmed = await confirm({
        title: `Melt ${maxMeltable} ${selectedToken.symbol}?`,
        body: 'This cannot be undone. The tokens are converted back to HTR.',
        confirmLabel: 'Melt tokens',
        tone: 'danger',
      });

      if (!confirmed) {
        return;
      }

      setIsMelting(true);

      // Get address 0 for change and new melt authority
      const address0 = await wallet.instance.getAddressAtIndex(0);

      // Execute melt transaction
      applyNetworkServices(wallet.metadata.network);
      const sendTx = await wallet.instance.meltTokensSendTransaction(selectedToken.uid, BigInt(maxMeltable), {
        pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
        changeAddress: address0,
        meltAuthorityAddress: address0,
        createAnotherMelt: true,
      });

      // Run the transaction
      await sendTx.runFromMining();

      // Refresh wallet data after successful melt
      await Promise.all([
        dispatch(refreshWalletTokens(wallet.metadata.id)).unwrap(),
        dispatch(refreshWalletBalance(wallet.metadata.id)).unwrap(),
      ]);
      setRefreshKey((prev) => prev + 1);

      setIsMelting(false);
      toastSuccess(`Melted ${maxMeltable} ${selectedToken.symbol}`);
    } catch (err) {
      setIsMelting(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setMeltError(`Failed to melt tokens: ${errorMessage}`);
      console.error('Melt error:', err);
    }
  };

  const spinner = <span className="loading loading-spinner loading-sm" aria-hidden="true" />;
  const otherLabel = isTestWallet ? 'funding' : 'test';
  const shieldedFee = (mode: ShieldedOutputModeName) =>
    `${formatAmount(estimateShieldedFee([{ privacy: mode, value: String(amount) }]).minFee, DECIMAL_PLACES)} HTR`;

  const tokenColumns: DataTableColumn<Token>[] = [
    {
      key: 'symbol',
      header: 'Symbol',
      render: (token) => (
        <button
          type="button"
          className="link font-semibold no-underline hover:underline"
          aria-pressed={selectedTokenUid === token.uid}
          title={`Select ${token.symbol}`}
          onClick={() => handleTokenClick(token.uid, token.name, token.symbol)}
        >
          {token.symbol}
        </button>
      ),
    },
    { key: 'name', header: 'Name', value: (token) => token.name },
    {
      key: 'uid',
      header: 'UID',
      type: 'identifier',
      render: (token) => (
        <span className="inline-flex items-center gap-2">
          <Identifier value={token.uid} kind="token" head={6} tail={6} />
          <ExplorerLink hash={token.uid} specificPage="token_detail" network={wallet.metadata.network as NetworkKey} />
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      type: 'amount',
      render: (token) => (
        <TokenBalanceCell walletInstance={wallet.instance} tokenUid={token.uid} refreshKey={refreshKey} />
      ),
    },
  ];

  const qrBlock = (value: string, label: string, copyLabel: string) => (
    <div className="flex flex-col items-start gap-3 sm:flex-row">
      <div className="flex-none rounded-field border border-base-300 bg-base-100 p-3">
        <QRCode value={value} size={176} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-caption text-ink-muted">{label}</span>
        <span className="flex min-w-0 items-start gap-1">
          <code className="min-w-0 rounded-field bg-base-200 px-2 py-1 font-mono text-data-sm [overflow-wrap:anywhere]">
            {value}
          </code>
          <CopyButton text={value} label={copyLabel} />
        </span>
      </div>
    </div>
  );

  return (
    <>
      {confirmDialog}

      {transactionError && <Callout tone="error">{transactionError}</Callout>}

      <Panel title="Wallet information">
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-caption text-ink-muted">Name</dt>
            <dd className="m-0 font-semibold">{wallet.metadata.friendlyName}</dd>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-0.5">
            <dt className="text-caption text-ink-muted">Network</dt>
            <dd className="m-0">
              <NetworkChip network={wallet.metadata.network} size="sm" />
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel
        title={
          <>
            Custom tokens{' '}
            {walletTokens.length > 0 && (
              <span className="text-body font-normal text-ink-muted">({filteredTokens.length})</span>
            )}
          </>
        }
        actions={
          <>
            {walletTokens.length > 0 && (
              <>
                <label className="flex cursor-pointer items-center gap-2 text-body">
                  <input
                    type="checkbox"
                    checked={hideZeroBalance}
                    onChange={(e) => setHideZeroBalance(e.target.checked)}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  Hide zero balance
                </label>
                <button
                  type="button"
                  onClick={() => setIsAllConfigStringsModalOpen(true)}
                  className="btn btn-secondary btn-sm"
                  title="Export all token configuration strings for Desktop Wallet"
                >
                  Export all
                </button>
              </>
            )}
            <button type="button" onClick={handleRefresh} disabled={isRefreshing} className="btn btn-secondary btn-sm">
              {isRefreshing ? spinner : <MdRefresh aria-hidden="true" />}
              Refresh
            </button>
          </>
        }
        footer={
          totalPages > 1 ? (
            <>
              <span className="text-body text-ink-muted">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTokens.length)}{' '}
                of {filteredTokens.length} tokens
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="btn btn-ghost btn-sm"
                >
                  First
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  Previous
                </button>
                <span className="px-2 text-body font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="btn btn-ghost btn-sm"
                >
                  Last
                </button>
              </div>
            </>
          ) : undefined
        }
      >
        {walletTokens.length === 0 ? (
          <EmptyState>No custom tokens found for this wallet. Refresh after creating or receiving one.</EmptyState>
        ) : (
          <DataTable
            caption="Custom tokens"
            columns={tokenColumns}
            rows={paginatedTokens}
            getRowKey={(token) => token.uid}
            rowClassName={(token) => (selectedTokenUid === token.uid ? 'bg-tint-info' : '')}
            empty="All tokens have a zero balance. Clear “Hide zero balance” to see them."
          />
        )}
      </Panel>

      {selectedTokenUid && (
        <Panel title={selectedToken ? `Selected token: ${selectedToken.symbol}` : 'Selected token'}>
          <div className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Token UID</span>
            <Identifier value={selectedTokenUid} kind="token" truncate="none" />
          </div>
          {configString && selectedToken && qrBlock(configString, 'Configuration string', 'Copy configuration string')}
        </Panel>
      )}

      {selectedToken && (
        <>
          <Panel title="Address" description={`An address of this wallet to receive ${selectedToken.symbol} at.`}>
            <div className="flex flex-wrap gap-4">
              <Field
                label="Address index"
                htmlFor="address-index"
                hint="Index used to derive the address (default 0)"
                wireControl={false}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <input
                    id="address-index"
                    aria-describedby="address-index-hint"
                    type="number"
                    min={0}
                    step={1}
                    value={addressIndex}
                    onChange={handleAddressIndexChange}
                    className="input w-28 font-mono text-data"
                  />
                  <button
                    type="button"
                    onClick={handleGetAddr0}
                    disabled={!wallet || !wallet.instance}
                    className="btn btn-secondary"
                  >
                    Get addr0
                  </button>
                  <button
                    type="button"
                    onClick={handleGetFirstEmpty}
                    disabled={isFetchingFirstEmpty || !wallet || !wallet.instance}
                    className="btn btn-secondary"
                  >
                    {isFetchingFirstEmpty && spinner}
                    Get first empty
                  </button>
                </div>
              </Field>

              <Field
                label="Payment amount"
                htmlFor="amount-input"
                hint={`A positive integer amount of ${selectedToken.symbol}`}
                wireControl={false}
              >
                <div className="flex gap-2">
                  <input
                    id="amount-input"
                    aria-describedby="amount-input-hint"
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={handleAmountChange}
                    className="input w-36 font-mono text-data"
                    placeholder="Amount"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const balance = tokenBalances.get(selectedToken.uid);
                      if (balance != null && balance > 0n) {
                        setAmount(Number(balance));
                      }
                    }}
                    className="btn btn-secondary"
                    title="Fill with full token balance"
                  >
                    Max
                  </button>
                </div>
              </Field>
            </div>

            {derivedAddress && (
              <>
                <AddressQr walletId={wallet.metadata.id} index={addressIndex} />
                {isTestWallet && (
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {!fundingWalletId && (
                      <span className="text-caption text-ink-muted">Select a funding wallet to send</span>
                    )}
                    <button
                      type="button"
                      onClick={handleSendFromFundWallet}
                      className="btn btn-primary"
                      disabled={isSending || !fundingWalletId}
                    >
                      {isSending && spinner}
                      {isSending ? 'Sending' : 'Send from funding wallet'}
                    </button>
                  </div>
                )}
              </>
            )}
          </Panel>

          {otherWalletAddress && (
            <Panel title={`Send to ${otherLabel} wallet`} description={`The ${otherLabel} wallet's address at index 0`}>
              {otherWalletId && <AddressQr walletId={otherWalletId} index={0} />}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSendToOtherWallet}
                  className="btn btn-primary"
                  disabled={isSending || !otherWalletAddress}
                >
                  {isSending && spinner}
                  {isSending ? 'Sending' : `Send to ${otherLabel} wallet`}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSendShieldedToOtherWallet('AMOUNT_SHIELDED')}
                  className="btn btn-secondary"
                  disabled={isSending || shieldedTransfer.unavailable !== null}
                  title={shieldedTransfer.unavailable ?? undefined}
                >
                  {`Send to ${otherLabel} wallet - Amount shielded`}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSendShieldedToOtherWallet('FULLY_SHIELDED')}
                  className="btn btn-secondary"
                  disabled={isSending || shieldedTransfer.unavailable !== null}
                  title={shieldedTransfer.unavailable ?? undefined}
                >
                  {`Send to ${otherLabel} wallet - Fully shielded`}
                  <MdShield aria-hidden="true" className="text-accent" />
                </button>
              </div>
              <p className="m-0 text-right text-caption text-ink-muted">
                {shieldedTransfer.unavailable
                  ? `Shielded sends unavailable: ${shieldedTransfer.unavailable}.`
                  : `Shielded sends go to the ${otherLabel} wallet's shielded address 0 and pay at least ${shieldedFee('AMOUNT_SHIELDED')} (amount shielded) or ${shieldedFee('FULLY_SHIELDED')} (fully shielded) in fees.`}
              </p>
            </Panel>
          )}

          {isTestWallet && selectedToken && (
            <Panel title="Melt tokens" description="Destroy tokens and convert them back to HTR. This is irreversible.">
              {isMelting && (
                <p className="m-0 flex items-center gap-2 text-body text-ink-muted" role="status">
                  <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                  Melting tokens…
                </p>
              )}

              {meltError && <Callout tone="error">{meltError}</Callout>}

              {!hasMeltAuthority ? (
                <Callout tone="info" title="No melt authority">
                  This wallet does not have melt authority for this token. Only wallets with melt authority can destroy
                  tokens.
                </Callout>
              ) : (
                <>
                  <Callout tone="warning" title="Melting is irreversible">
                    <ul>
                      <li>Tokens can only be melted in multiples of 100</li>
                      <li>Melted tokens are converted back to HTR at a rate of 100 tokens = 1 HTR</li>
                      <li>Any melting below 100 tokens burns the tokens without HTR return</li>
                    </ul>
                  </Callout>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleMeltTokens}
                      className="btn btn-error btn-outline"
                      disabled={isMelting || isSending}
                    >
                      {isMelting && spinner}
                      {isMelting ? 'Melting' : `Melt ${selectedToken.symbol} tokens`}
                    </button>
                  </div>
                </>
              )}
            </Panel>
          )}
        </>
      )}

      <AllConfigStringsModal
        isOpen={isAllConfigStringsModalOpen}
        onClose={() => setIsAllConfigStringsModalOpen(false)}
        tokens={walletTokens}
        walletName={wallet.metadata.friendlyName}
      />
    </>
  );
}

export default function CustomTokens() {
  const { getAllWallets } = useWalletStore();
  const wallets = getAllWallets();

  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);

  const [activeTab, setActiveTab] = useState<TabType>('test');
  const testWalletRequirement = useRequireTestWallet();
  const fundingWalletRequirement = useRequireFundingWallet();

  const fundingWallet = wallets.find((w) => w.metadata.id === fundingWalletId && w.status === 'ready');
  const testWallet = wallets.find((w) => w.metadata.id === testWalletId && w.status === 'ready');

  const noWalletsSelected = !fundingWallet && !testWallet;

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="custom-tokens" description="View custom tokens for the funding and test wallets." />
      <PreconditionStrip requirements={[testWalletRequirement, fundingWalletRequirement]} />

      {noWalletsSelected ? (
        <Panel title="Custom tokens">
          <EmptyState>
            Start wallets and choose a funding wallet and a test wallet; their tokens appear here.
          </EmptyState>
        </Panel>
      ) : (
        <>
          <SegmentedControl<TabType>
            aria-label="Wallet"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              {
                value: 'fund',
                label: 'Funding wallet',
                disabled: !fundingWallet,
                reason: 'No funding wallet selected',
              },
              { value: 'test', label: 'Test wallet', disabled: !testWallet, reason: 'No test wallet selected' },
            ]}
            className="self-start"
          />

          {activeTab === 'fund' && fundingWallet && (
            <WalletTokensDisplay
              wallet={fundingWallet}
              fundingWalletId={fundingWalletId}
              testWalletId={testWalletId}
              isTestWallet={false}
            />
          )}

          {activeTab === 'test' && testWallet && (
            <WalletTokensDisplay
              wallet={testWallet}
              fundingWalletId={fundingWalletId}
              testWalletId={testWalletId}
              isTestWallet={true}
            />
          )}
        </>
      )}
    </div>
  );
}
