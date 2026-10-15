/**
 * Push Notifications Stage
 * Tests push notification functionality by sending tokens to test wallet
 */

import { useEffect, useState } from 'react';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { startWallet, stopWallet, updateNetwork } from '../../store/slices/walletStoreSlice';
import { formatBalance } from '../../utils/balanceUtils';
import WalletNetworkControl from '../common/WalletNetworkControl';
import type { NetworkKey } from '../../constants/network';
import { WALLET_CONFIG } from '../../constants/network';
import type { WalletInfo } from '../../types/walletStore';
import { MdQrCode } from 'react-icons/md';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { addSentToken, clearSentTokens } from '../../store/slices/pushNotificationsSlice';
import { useSendTransaction } from '../../hooks/useSendTransaction';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { EmptyState } from '../ui/EmptyState';
import { StatusChip } from '../ui/StatusChip';
import { DataTable } from '../ui/DataTable';
import { useRequireFundingWallet, useRequireTestWallet } from '../../hooks/useRequirements';
import type { Requirement } from '../../utils/requirements';
import ConfigurationStringModal from '../common/ConfigurationStringModal';
import { buildTransferTemplate } from '../../services/tokenTransfer';

interface Token {
  uid: string;
  name: string;
  symbol: string;
  balance: bigint;
}

export default function PushNotifications() {
  const dispatch = useAppDispatch();
  const { getWallet } = useWalletStore();
  const { sendTransaction, isSending } = useSendTransaction();

  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const sentTokens = useAppSelector((s) => s.pushNotifications.sentTokens);
  const allTokens = useAppSelector((s) => s.tokens.tokens);

  const fundingWallet = fundingWalletId ? getWallet(fundingWalletId) : undefined;
  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;

  const [fundTokens, setFundTokens] = useState<Token[]>([]);
  const [selectedToken1, setSelectedToken1] = useState<string>('');
  const [selectedToken2, setSelectedToken2] = useState<string>('');
  const [selectedToken3, setSelectedToken3] = useState<string>('');
  const [token1Amount, setToken1Amount] = useState<string>('');
  const [token2Amount, setToken2Amount] = useState<string>('');
  const [token3Amount, setToken3Amount] = useState<string>('');
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configModalToken, setConfigModalToken] = useState<Token | null>(null);

  // Check if both wallets are ready and on mainnet
  const fundingReady = fundingWallet?.status === 'ready';
  const testReady = testWallet?.status === 'ready';
  const bothReady = fundingReady && testReady;

  const fundingOnMainnet = fundingWallet?.metadata.network === 'MAINNET';
  const testOnMainnet = testWallet?.metadata.network === 'MAINNET';
  const bothOnMainnet = fundingOnMainnet && testOnMainnet;

  const canSendTokens = bothReady && bothOnMainnet;

  const fundingRequirement = useRequireFundingWallet();
  const testRequirement = useRequireTestWallet();
  const mainnetRequirement: Requirement = bothOnMainnet
    ? { id: 'mainnet', short: 'Mainnet', met: true, label: 'Both wallets on Mainnet' }
    : {
        id: 'mainnet',
        short: 'Mainnet',
        met: false,
        label: 'Both wallets must be on Mainnet',
        action: 'Switch both wallets to Mainnet',
      };

  // Load tokens with balances from funding wallet
  useEffect(() => {
    const loadFundingWalletTokens = async () => {
      if (!fundingWallet?.instance || !fundingReady) {
        setFundTokens([]);
        return;
      }

      setIsLoadingTokens(true);
      try {
        // Get custom tokens (exclude native HTR)
        const customTokenUids = fundingWallet.tokenUids?.filter((uid) => uid !== NATIVE_TOKEN_UID) || [];

        const tokensWithBalances = await Promise.all(
          customTokenUids.map(async (uid) => {
            const tokenInfo = allTokens.find((t) => t.uid === uid);
            if (!tokenInfo) return null;

            try {
              const balanceData = await fundingWallet.instance!.getBalance(uid);
              const balance = balanceData[0]?.balance?.unlocked || 0n;

              return {
                uid,
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                balance,
              };
            } catch (err) {
              console.error(`Failed to load balance for token ${uid}:`, err);
              return null;
            }
          })
        );

        // Filter out nulls and tokens with zero balance
        const validTokens = tokensWithBalances.filter((t): t is Token => t !== null && t.balance > 0n);

        // Sort tokens by balance ascending (lowest first)
        validTokens.sort((a, b) => {
          if (a.balance < b.balance) return -1;
          if (a.balance > b.balance) return 1;
          return 0;
        });

        setFundTokens(validTokens);
      } catch (err) {
        console.error('Failed to load funding wallet tokens:', err);
        setFundTokens([]);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    loadFundingWalletTokens();
  }, [fundingWallet, fundingReady, allTokens]);

  // Helper function to generate random amount for a token
  const generateRandomAmount = (tokenUid: string): string => {
    const token = fundTokens.find((t) => t.uid === tokenUid);
    if (!token) return '1';

    // Calculate max as min(10, token balance)
    const maxAmount = token.balance < 10n ? Number(token.balance) : 10;

    // Generate random value between 1 and maxAmount (inclusive)
    const randomAmount = Math.floor(Math.random() * maxAmount) + 1;

    return randomAmount.toString();
  };

  // Helper function to open configuration modal for a token
  const handleOpenConfigModal = (tokenUid: string) => {
    const token = fundTokens.find((t) => t.uid === tokenUid);
    if (token) {
      setConfigModalToken(token);
      setIsConfigModalOpen(true);
    }
  };

  // Helper function to close configuration modal
  const handleCloseConfigModal = () => {
    setIsConfigModalOpen(false);
    setConfigModalToken(null);
  };

  // Auto-select tokens and generate amounts when fundTokens changes
  useEffect(() => {
    if (fundTokens.length > 0) {
      // Auto-select first token
      const token1 = fundTokens[0]?.uid || '';
      setSelectedToken1(token1);
      if (token1) setToken1Amount(generateRandomAmount(token1));
    }

    if (fundTokens.length > 1) {
      // Auto-select second token
      const token2 = fundTokens[1]?.uid || '';
      setSelectedToken2(token2);
      if (token2) setToken2Amount(generateRandomAmount(token2));
    }

    if (fundTokens.length > 2) {
      // Auto-select third token
      const token3 = fundTokens[2]?.uid || '';
      setSelectedToken3(token3);
      if (token3) setToken3Amount(generateRandomAmount(token3));
    }
  }, [fundTokens]);

  const handleSwapNetwork = async (
    walletId: string,
    _currentNetwork: NetworkKey,
    status: string,
    newNetwork: NetworkKey
  ) => {
    // Stop the wallet if it's running (ready, connecting, or syncing)
    if (status === 'ready' || status === 'connecting' || status === 'syncing') {
      try {
        await dispatch(stopWallet(walletId)).unwrap();
      } catch (err) {
        console.error('Failed to stop wallet before network swap:', err);
      }
    }

    // Update the network
    dispatch(updateNetwork({ id: walletId, network: newNetwork }));

    // Start the wallet on the new network
    try {
      await dispatch(startWallet(walletId)).unwrap();
    } catch (err) {
      console.error('Failed to start wallet after network swap:', err);
    }
  };

  const handleForceStop = async (walletId: string) => {
    try {
      await dispatch(stopWallet(walletId)).unwrap();
    } catch (err) {
      console.error('Failed to force stop wallet:', err);
    }
  };

  const renderWalletCard = (wallet: WalletInfo | undefined, label: string) => {
    if (!wallet) {
      return (
        <Panel title={`${label} wallet`}>
          <EmptyState>Select a {label.toLowerCase()} wallet in Wallet initialization.</EmptyState>
        </Panel>
      );
    }

    return (
      <Panel title={`${label} wallet`}>
        <dl className="m-0 flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-caption text-ink-muted">Name</dt>
            <dd className="m-0 font-semibold">{wallet.metadata.friendlyName}</dd>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <dt className="text-caption text-ink-muted">Network</dt>
            <dd className="m-0">
              <WalletNetworkControl
                walletId={wallet.metadata.id}
                walletName={wallet.metadata.friendlyName}
                network={wallet.metadata.network}
                status={wallet.status}
                error={wallet.error}
                onSwapNetwork={handleSwapNetwork}
                onForceStop={handleForceStop}
              />
            </dd>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <dt className="text-caption text-ink-muted">Status</dt>
            <dd className="m-0 flex flex-wrap items-center gap-2">
              <StatusChip status={wallet.status} />
              {wallet.status === 'ready' && (
                <span className="font-mono text-data">
                  {formatBalance(wallet.balance ?? 0n)} <span className="font-sans text-ink-muted">HTR</span>
                </span>
              )}
            </dd>
          </div>
        </dl>
      </Panel>
    );
  };

  const handleSend1HTR = async () => {
    if (!fundingWallet?.instance || !testWallet?.instance) return;

    try {
      const testWalletAddress = await testWallet.instance.getAddressAtIndex(0);
      const fundWalletAddress = await fundingWallet.instance.getAddressAtIndex(0);

      const template = buildTransferTemplate([{ address: testWalletAddress, amount: 1n }], fundWalletAddress);

      await sendTransaction(
        template,
        {
          fromWalletId: fundingWallet.metadata.id,
          fromWallet: fundingWallet,
          toAddress: testWalletAddress,
          amount: 1,
          tokenUid: NATIVE_TOKEN_UID,
          tokenSymbol: 'HTR',
        },
        WALLET_CONFIG.DEFAULT_PIN_CODE
      );

      // Track sent token
      dispatch(
        addSentToken({
          tokenId: NATIVE_TOKEN_UID,
          tokenSymbol: 'HTR',
          amount: '1',
          timestamp: Date.now(),
        })
      );
    } catch (err) {
      console.error('Failed to send 1 HTR:', err);
    }
  };

  const handleSend1HTRPlus1Token = async () => {
    if (!fundingWallet?.instance || !testWallet?.instance || !selectedToken1) return;

    try {
      const testWalletAddress = await testWallet.instance.getAddressAtIndex(0);
      const fundWalletAddress = await fundingWallet.instance.getAddressAtIndex(0);

      // Parse amount from state
      const amount1 = BigInt(parseFloat(token1Amount) || 1);

      const template = buildTransferTemplate(
        [
          { address: testWalletAddress, amount: 1n },
          { address: testWalletAddress, amount: amount1, token: selectedToken1 },
        ],
        fundWalletAddress
      );

      await sendTransaction(
        template,
        {
          fromWalletId: fundingWallet.metadata.id,
          fromWallet: fundingWallet,
          toAddress: testWalletAddress,
          amount: 1,
          tokenUid: selectedToken1,
          tokenSymbol: fundTokens.find((t) => t.uid === selectedToken1)?.symbol || 'Token',
        },
        WALLET_CONFIG.DEFAULT_PIN_CODE
      );

      // Track sent tokens
      dispatch(
        addSentToken({
          tokenId: NATIVE_TOKEN_UID,
          tokenSymbol: 'HTR',
          amount: '1',
          timestamp: Date.now(),
        })
      );
      dispatch(
        addSentToken({
          tokenId: selectedToken1,
          tokenSymbol: fundTokens.find((t) => t.uid === selectedToken1)?.symbol || 'Token',
          amount: token1Amount,
          timestamp: Date.now(),
        })
      );
    } catch (err) {
      console.error('Failed to send 1 HTR + 1 Token:', err);
    }
  };

  const handleSend1HTRPlus2Tokens = async () => {
    if (!fundingWallet?.instance || !testWallet?.instance || !selectedToken1 || !selectedToken2) return;

    try {
      const testWalletAddress = await testWallet.instance.getAddressAtIndex(0);
      const fundWalletAddress = await fundingWallet.instance.getAddressAtIndex(0);

      // Parse amounts from state
      const amount1 = BigInt(parseFloat(token1Amount) || 1);
      const amount2 = BigInt(parseFloat(token2Amount) || 1);

      const template = buildTransferTemplate(
        [
          { address: testWalletAddress, amount: 1n },
          { address: testWalletAddress, amount: amount1, token: selectedToken1 },
          { address: testWalletAddress, amount: amount2, token: selectedToken2 },
        ],
        fundWalletAddress
      );

      await sendTransaction(
        template,
        {
          fromWalletId: fundingWallet.metadata.id,
          fromWallet: fundingWallet,
          toAddress: testWalletAddress,
          amount: 1,
          tokenUid: selectedToken1,
          tokenSymbol: fundTokens.find((t) => t.uid === selectedToken1)?.symbol || 'Token',
        },
        WALLET_CONFIG.DEFAULT_PIN_CODE
      );

      // Track sent tokens
      dispatch(
        addSentToken({
          tokenId: NATIVE_TOKEN_UID,
          tokenSymbol: 'HTR',
          amount: '1',
          timestamp: Date.now(),
        })
      );
      dispatch(
        addSentToken({
          tokenId: selectedToken1,
          tokenSymbol: fundTokens.find((t) => t.uid === selectedToken1)?.symbol || 'Token',
          amount: token1Amount,
          timestamp: Date.now(),
        })
      );
      dispatch(
        addSentToken({
          tokenId: selectedToken2,
          tokenSymbol: fundTokens.find((t) => t.uid === selectedToken2)?.symbol || 'Token',
          amount: token2Amount,
          timestamp: Date.now(),
        })
      );
    } catch (err) {
      console.error('Failed to send 1 HTR + 2 Tokens:', err);
    }
  };

  const handleSend1HTRPlus3Tokens = async () => {
    if (!fundingWallet?.instance || !testWallet?.instance || !selectedToken1 || !selectedToken2 || !selectedToken3)
      return;

    try {
      const testWalletAddress = await testWallet.instance.getAddressAtIndex(0);
      const fundWalletAddress = await fundingWallet.instance.getAddressAtIndex(0);

      // Parse amounts from state
      const amount1 = BigInt(parseFloat(token1Amount) || 1);
      const amount2 = BigInt(parseFloat(token2Amount) || 1);
      const amount3 = BigInt(parseFloat(token3Amount) || 1);

      const template = buildTransferTemplate(
        [
          { address: testWalletAddress, amount: 1n },
          { address: testWalletAddress, amount: amount1, token: selectedToken1 },
          { address: testWalletAddress, amount: amount2, token: selectedToken2 },
          { address: testWalletAddress, amount: amount3, token: selectedToken3 },
        ],
        fundWalletAddress
      );

      await sendTransaction(
        template,
        {
          fromWalletId: fundingWallet.metadata.id,
          fromWallet: fundingWallet,
          toAddress: testWalletAddress,
          amount: 1,
          tokenUid: selectedToken1,
          tokenSymbol: fundTokens.find((t) => t.uid === selectedToken1)?.symbol || 'Token',
        },
        WALLET_CONFIG.DEFAULT_PIN_CODE
      );

      // Track sent tokens
      dispatch(
        addSentToken({
          tokenId: NATIVE_TOKEN_UID,
          tokenSymbol: 'HTR',
          amount: '1',
          timestamp: Date.now(),
        })
      );
      dispatch(
        addSentToken({
          tokenId: selectedToken1,
          tokenSymbol: fundTokens.find((t) => t.uid === selectedToken1)?.symbol || 'Token',
          amount: token1Amount,
          timestamp: Date.now(),
        })
      );
      dispatch(
        addSentToken({
          tokenId: selectedToken2,
          tokenSymbol: fundTokens.find((t) => t.uid === selectedToken2)?.symbol || 'Token',
          amount: token2Amount,
          timestamp: Date.now(),
        })
      );
      dispatch(
        addSentToken({
          tokenId: selectedToken3,
          tokenSymbol: fundTokens.find((t) => t.uid === selectedToken3)?.symbol || 'Token',
          amount: token3Amount,
          timestamp: Date.now(),
        })
      );
    } catch (err) {
      console.error('Failed to send 1 HTR + 3 Tokens:', err);
    }
  };

  const handleReturnAllTokens = async () => {
    if (!fundingWallet?.instance || !testWallet?.instance || sentTokens.length === 0) return;

    try {
      const fundWalletAddress = await fundingWallet.instance.getAddressAtIndex(0);
      const testWalletAddress = await testWallet.instance.getAddressAtIndex(0);

      // Group tokens by token ID and sum amounts
      const tokenGroups = sentTokens.reduce((acc, token) => {
        const existing = acc.get(token.tokenId);
        if (existing) {
          existing.amount = (BigInt(existing.amount) + BigInt(token.amount)).toString();
        } else {
          acc.set(token.tokenId, { ...token });
        }
        return acc;
      }, new Map<string, (typeof sentTokens)[0]>());

      // Build transaction with all tokens
      const template = buildTransferTemplate(
        Array.from(tokenGroups.values(), (token) => ({
          address: fundWalletAddress,
          amount: BigInt(token.amount),
          token: token.tokenId,
        })),
        testWalletAddress
      );

      await sendTransaction(
        template,
        {
          fromWalletId: testWallet.metadata.id,
          fromWallet: testWallet,
          toAddress: fundWalletAddress,
          amount: 0, // Multiple tokens
          tokenUid: NATIVE_TOKEN_UID,
          tokenSymbol: 'Multiple Tokens',
        },
        WALLET_CONFIG.DEFAULT_PIN_CODE
      );

      // Clear sent tokens after successful return
      dispatch(clearSentTokens());
    } catch (err) {
      console.error('Failed to return tokens:', err);
    }
  };

  const ordinal = ['first', 'second', 'third'];

  /** Token select + amount for one slot (shared between the send cards). */
  const tokenSlot = (
    slot: 0 | 1 | 2,
    multi: boolean,
    value: string,
    setValue: (v: string) => void,
    amount: string,
    setAmountValue: (v: string) => void,
    exclude: string[],
    idPrefix: string
  ) => {
    const word = ordinal[slot];
    const available = fundTokens.find((t) => t.uid === value)?.balance || 0n;
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem]" key={`${idPrefix}-${slot}`}>
        <Field
          label={multi ? `${word[0].toUpperCase()}${word.slice(1)} token` : 'Token'}
          htmlFor={`${idPrefix}-token-${slot}`}
          wireControl={false}
        >
          <div className="flex gap-2">
            <select
              id={`${idPrefix}-token-${slot}`}
              value={value}
              onChange={(e) => {
                const newToken = e.target.value;
                setValue(newToken);
                if (newToken) setAmountValue(generateRandomAmount(newToken));
              }}
              className="select min-w-0 flex-1"
            >
              <option value="">{multi ? `Select ${word} token` : 'Select a token'}</option>
              {fundTokens
                .filter((token) => !exclude.includes(token.uid))
                .map((token) => (
                  <option key={token.uid} value={token.uid}>
                    {token.symbol} ({token.name}) - Balance: {formatBalance(token.balance)}
                  </option>
                ))}
            </select>
            {value && (
              <button
                type="button"
                onClick={() => handleOpenConfigModal(value)}
                className="btn btn-ghost btn-square"
                title="View configuration string QR code"
                aria-label="View configuration string QR code"
              >
                <MdQrCode aria-hidden="true" />
              </button>
            )}
          </div>
        </Field>
        {value && (
          <Field
            label="Amount"
            htmlFor={`${idPrefix}-amount-${slot}`}
            trailing={<span className="text-caption text-ink-muted">Available {formatBalance(available)}</span>}
          >
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmountValue(e.target.value)}
              placeholder="Amount"
              className="input w-full font-mono text-data"
              min="1"
            />
          </Field>
        )}
      </div>
    );
  };

  const spinner = <span className="loading loading-spinner loading-sm" aria-hidden="true" />;
  const loadingTokens = (
    <p className="m-0 flex items-center gap-2 text-body text-ink-muted">
      <span className="loading loading-spinner loading-xs" aria-hidden="true" />
      Loading tokens…
    </p>
  );
  const sendButton = (label: string, onClick: () => void, disabled: boolean) => (
    <div className="flex justify-end">
      <button type="button" onClick={onClick} disabled={disabled} className="btn btn-primary">
        {isSending && spinner}
        {isSending ? 'Sending' : label}
      </button>
    </div>
  );

  const slot1 = (multi: boolean, id: string) =>
    tokenSlot(0, multi, selectedToken1, setSelectedToken1, token1Amount, setToken1Amount, [], id);
  const slot2 = (id: string) =>
    tokenSlot(1, true, selectedToken2, setSelectedToken2, token2Amount, setToken2Amount, [selectedToken1], id);
  const slot3 = (id: string) =>
    tokenSlot(
      2,
      true,
      selectedToken3,
      setSelectedToken3,
      token3Amount,
      setToken3Amount,
      [selectedToken1, selectedToken2],
      id
    );

  const groupedSentTokens = Array.from(
    sentTokens
      .reduce((acc, token) => {
        const existing = acc.get(token.tokenId);
        if (existing) {
          existing.amount = (BigInt(existing.amount) + BigInt(token.amount)).toString();
        } else {
          acc.set(token.tokenId, { ...token });
        }
        return acc;
      }, new Map<string, (typeof sentTokens)[0]>())
      .values()
  );

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="push-notifications"
        description="Test push notifications by sending tokens to the test wallet."
      />
      <PreconditionStrip requirements={[fundingRequirement, testRequirement, mainnetRequirement]} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {renderWalletCard(fundingWallet, 'Funding')}
        {renderWalletCard(testWallet, 'Test')}
      </div>

      {bothReady && !bothOnMainnet && (
        <Callout tone="warning" title="Both wallets must be on Mainnet">
          Push notification tests need both wallets on <strong>Mainnet</strong>. Use the network controls above to
          switch them.
        </Callout>
      )}

      {canSendTokens && (
        <>
          <Panel title="Send 1 HTR" description="Send 1 HTR from the funding wallet to the test wallet.">
            {sendButton('Send 1 HTR', handleSend1HTR, isSending)}
          </Panel>

          <Panel
            title="Send 1 HTR + 1 custom token"
            description="Send 1 HTR and 1 custom token in a single transaction."
          >
            {isLoadingTokens ? (
              loadingTokens
            ) : fundTokens.length === 0 ? (
              <Callout tone="info">No custom tokens with balance found in the funding wallet.</Callout>
            ) : (
              <>
                {slot1(false, 'push1')}
                {sendButton(
                  'Send 1 HTR + 1 token',
                  handleSend1HTRPlus1Token,
                  isSending || !selectedToken1 || !token1Amount || parseFloat(token1Amount) <= 0
                )}
              </>
            )}
          </Panel>

          <Panel
            title="Send 1 HTR + 2 custom tokens"
            description="Send 1 HTR and 2 different custom tokens in a single transaction."
          >
            {isLoadingTokens ? (
              loadingTokens
            ) : fundTokens.length < 2 ? (
              <Callout tone="info">At least 2 custom tokens with balance are required in the funding wallet.</Callout>
            ) : (
              <>
                {slot1(true, 'push2')}
                {slot2('push2')}
                {sendButton(
                  'Send 1 HTR + 2 tokens',
                  handleSend1HTRPlus2Tokens,
                  isSending ||
                    !selectedToken1 ||
                    !selectedToken2 ||
                    !token1Amount ||
                    !token2Amount ||
                    parseFloat(token1Amount) <= 0 ||
                    parseFloat(token2Amount) <= 0
                )}
              </>
            )}
          </Panel>

          <Panel
            title="Send 1 HTR + 3 custom tokens"
            description="Send 1 HTR and 3 different custom tokens in a single transaction."
          >
            {isLoadingTokens ? (
              loadingTokens
            ) : fundTokens.length < 3 ? (
              <Callout tone="info">At least 3 custom tokens with balance are required in the funding wallet.</Callout>
            ) : (
              <>
                {slot1(true, 'push3')}
                {slot2('push3')}
                {slot3('push3')}
                {sendButton(
                  'Send 1 HTR + 3 tokens',
                  handleSend1HTRPlus3Tokens,
                  isSending ||
                    !selectedToken1 ||
                    !selectedToken2 ||
                    !selectedToken3 ||
                    !token1Amount ||
                    !token2Amount ||
                    !token3Amount ||
                    parseFloat(token1Amount) <= 0 ||
                    parseFloat(token2Amount) <= 0 ||
                    parseFloat(token3Amount) <= 0
                )}
              </>
            )}
          </Panel>

          {sentTokens.length > 0 && (
            <Panel title="Return tokens" description="Tokens sent to the test wallet in this session.">
              <DataTable
                caption="Tokens sent this session"
                columns={[
                  { key: 'token', header: 'Token', className: 'font-semibold', value: (t) => t.tokenSymbol },
                  { key: 'amount', header: 'Total amount', type: 'amount', value: (t) => t.amount },
                ]}
                rows={groupedSentTokens}
                getRowKey={(t) => t.tokenId}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleReturnAllTokens}
                  disabled={isSending}
                  className="btn btn-secondary"
                >
                  {isSending && spinner}
                  {isSending ? 'Returning' : 'Return all tokens to funding wallet'}
                </button>
              </div>
            </Panel>
          )}
        </>
      )}

      {configModalToken && (
        <ConfigurationStringModal
          isOpen={isConfigModalOpen}
          onClose={handleCloseConfigModal}
          tokenUid={configModalToken.uid}
          tokenName={configModalToken.name}
          tokenSymbol={configModalToken.symbol}
        />
      )}
    </div>
  );
}
