/**
 * Push Notifications Stage
 * Tests push notification functionality by sending tokens to test wallet
 */

import { useEffect, useState } from 'react';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { startWallet, stopWallet, updateNetwork } from '../../store/slices/walletStoreSlice';
import { formatBalance } from '../../utils/balanceUtils';
import NetworkSwapButton from '../common/NetworkSwapButton';
import type { NetworkType } from '../../constants/network';
import { WALLET_CONFIG } from '../../constants/network';
import type { WalletInfo } from '../../types/walletStore';
import { MdQrCode, MdWarning } from 'react-icons/md';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { addSentToken, clearSentTokens } from '../../store/slices/pushNotificationsSlice';
import Loading from '../common/Loading';
import { TransactionTemplateBuilder } from '@hathor/wallet-lib';
import { useSendTransaction } from '../../hooks/useSendTransaction';
import Select from '../common/Select';
import ConfigurationStringModal from '../common/ConfigurationStringModal';

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
              const balanceData = await fundingWallet.instance.getBalance(uid);
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
        const validTokens = tokensWithBalances.filter(
          (t): t is Token => t !== null && t.balance > 0n
        );

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

  const handleSwapNetwork = async (walletId: string, currentNetwork: NetworkType, status: string) => {
    const newNetwork: NetworkType = currentNetwork === 'TESTNET' ? 'MAINNET' : 'TESTNET';

    if (status === 'ready') {
      // Stop the wallet first
      await dispatch(stopWallet(walletId)).unwrap();
    }

    // Update the network
    dispatch(updateNetwork({ id: walletId, network: newNetwork }));

    // Start the wallet again
    await dispatch(startWallet(walletId)).unwrap();
  };

  const renderWalletCard = (wallet: WalletInfo | undefined, label: string, isOnMainnet: boolean) => {
    if (!wallet) {
      return (
        <div className="card bg-white shadow-md border-2 border-warning">
          <div className="card-body">
            <h3 className="card-title text-warning">No {label} Wallet Selected</h3>
            <p className="text-sm text-muted">
              Please select a {label.toLowerCase()} wallet in the Wallet Initialization stage.
            </p>
          </div>
        </div>
      );
    }

    const isReady = wallet.status === 'ready';
    const isLoading = wallet.status === 'connecting' || wallet.status === 'syncing';

    return (
      <div className={`card bg-white shadow-md border-2 ${isReady && isOnMainnet ? 'border-success' : 'border-gray-300'}`}>
        <div className="card-body">
          <h3 className="card-title">{label} Wallet</h3>

          <div className="space-y-2">
            <div>
              <span className="text-sm font-bold text-muted">Name:</span>
              <p className="text-base m-0">{wallet.metadata.friendlyName}</p>
            </div>

            <div>
              <span className="text-sm font-bold text-muted">Network:</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge badge-lg">{wallet.metadata.network}</span>
                <NetworkSwapButton
                  walletId={wallet.metadata.id}
                  currentNetwork={wallet.metadata.network}
                  walletStatus={wallet.status}
                  onSwap={handleSwapNetwork}
                />
              </div>
            </div>

            <div>
              <span className="text-sm font-bold text-muted">Status:</span>
              <div className="flex items-center gap-2 mt-1">
                {isLoading && (
                  <span className="badge badge-warning">
                    {wallet.status === 'connecting' ? 'Connecting...' : 'Syncing...'}
                  </span>
                )}
                {isReady && (
                  <>
                    <span className="badge badge-success">Ready</span>
                    <span className="text-sm">
                      Balance: <strong>{formatBalance(wallet.balance ?? 0n)} HTR</strong>
                    </span>
                  </>
                )}
                {wallet.status === 'idle' && <span className="badge badge-ghost">Idle</span>}
                {wallet.status === 'error' && <span className="badge badge-error">Error</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSend1HTR = async () => {
    if (!fundingWallet?.instance || !testWallet?.instance) return;

    try {
      const testWalletAddress = await testWallet.instance.getAddressAtIndex(0);
      const fundWalletAddress = await fundingWallet.instance.getAddressAtIndex(0);

      const template = TransactionTemplateBuilder.new()
        .addSetVarAction({ name: 'recipientAddr', value: testWalletAddress })
        .addSetVarAction({ name: 'changeAddr', value: fundWalletAddress })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: 1n,
          token: NATIVE_TOKEN_UID,
        })
        .addCompleteAction({
          changeAddress: '{changeAddr}',
        })
        .build();

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

      const template = TransactionTemplateBuilder.new()
        .addSetVarAction({ name: 'recipientAddr', value: testWalletAddress })
        .addSetVarAction({ name: 'changeAddr', value: fundWalletAddress })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: 1n,
          token: NATIVE_TOKEN_UID,
        })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: amount1,
          token: selectedToken1,
        })
        .addCompleteAction({
          changeAddress: '{changeAddr}',
        })
        .build();

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

      const template = TransactionTemplateBuilder.new()
        .addSetVarAction({ name: 'recipientAddr', value: testWalletAddress })
        .addSetVarAction({ name: 'changeAddr', value: fundWalletAddress })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: 1n,
          token: NATIVE_TOKEN_UID,
        })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: amount1,
          token: selectedToken1,
        })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: amount2,
          token: selectedToken2,
        })
        .addCompleteAction({
          changeAddress: '{changeAddr}',
        })
        .build();

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
    if (!fundingWallet?.instance || !testWallet?.instance || !selectedToken1 || !selectedToken2 || !selectedToken3) return;

    try {
      const testWalletAddress = await testWallet.instance.getAddressAtIndex(0);
      const fundWalletAddress = await fundingWallet.instance.getAddressAtIndex(0);

      // Parse amounts from state
      const amount1 = BigInt(parseFloat(token1Amount) || 1);
      const amount2 = BigInt(parseFloat(token2Amount) || 1);
      const amount3 = BigInt(parseFloat(token3Amount) || 1);

      const template = TransactionTemplateBuilder.new()
        .addSetVarAction({ name: 'recipientAddr', value: testWalletAddress })
        .addSetVarAction({ name: 'changeAddr', value: fundWalletAddress })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: 1n,
          token: NATIVE_TOKEN_UID,
        })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: amount1,
          token: selectedToken1,
        })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: amount2,
          token: selectedToken2,
        })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: amount3,
          token: selectedToken3,
        })
        .addCompleteAction({
          changeAddress: '{changeAddr}',
        })
        .build();

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
      }, new Map<string, typeof sentTokens[0]>());

      // Build transaction with all tokens
      let builder = TransactionTemplateBuilder.new()
        .addSetVarAction({ name: 'recipientAddr', value: fundWalletAddress })
        .addSetVarAction({ name: 'changeAddr', value: testWalletAddress });

      tokenGroups.forEach((token) => {
        builder = builder.addTokenOutput({
          address: '{recipientAddr}',
          amount: BigInt(token.amount),
          token: token.tokenId,
        });
      });

      const template = builder
        .addCompleteAction({
          changeAddress: '{changeAddr}',
        })
        .build();

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

  return (
    <div className="max-w-300 mx-auto">
      {isSending && <Loading overlay message="Sending transaction..." />}

      <h1 className="mt-0 text-3xl font-bold">Push Notifications</h1>
      <p className="text-muted mb-7.5">
        Test push notification functionality by sending tokens to the test wallet.
      </p>

      {/* Wallets Status */}
      <div className="mb-7.5">
        <h2 className="text-2xl font-bold mb-4">Wallet Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderWalletCard(fundingWallet, 'Funding', fundingOnMainnet)}
          {renderWalletCard(testWallet, 'Test', testOnMainnet)}
        </div>
      </div>

      {/* Network Warning */}
      {bothReady && !bothOnMainnet && (
        <div className="alert alert-warning mb-7.5 flex items-start gap-3">
          <MdWarning className="text-2xl flex-shrink-0" />
          <div>
            <h3 className="font-bold text-lg mt-0 mb-2">Network Check Required</h3>
            <p className="m-0">
              Both wallets must be on <strong>MAINNET</strong> before continuing with push notification tests.
              Please use the swap buttons above to change the network.
            </p>
          </div>
        </div>
      )}

      {/* Send Buttons */}
      {canSendTokens && (
        <>
          <div className="mb-7.5">
            <h2 className="text-2xl font-bold mb-4">Send Test Transactions</h2>

            {/* Send 1 HTR */}
            <div className="card bg-white shadow-md mb-4">
              <div className="card-body">
                <h3 className="card-title">Send 1 HTR</h3>
                <p className="text-sm text-muted mb-4">
                  Send 1 HTR from the funding wallet to the test wallet.
                </p>
                <button
                  onClick={handleSend1HTR}
                  disabled={isSending}
                  className="btn btn-primary w-full"
                >
                  {isSending ? 'Sending...' : 'Send 1 HTR'}
                </button>
              </div>
            </div>

            {/* Send 1 HTR + 1 Custom Token */}
            <div className="card bg-white shadow-md mb-4">
              <div className="card-body">
                <h3 className="card-title">Send 1 HTR + 1 Custom Token</h3>
                <p className="text-sm text-muted mb-4">
                  Send 1 HTR and 1 custom token in a single transaction.
                </p>

                {isLoadingTokens ? (
                  <div className="text-sm text-muted mb-4">Loading tokens...</div>
                ) : fundTokens.length === 0 ? (
                  <div className="alert alert-info mb-4">
                    <p className="m-0 text-sm">No custom tokens with balance found in funding wallet.</p>
                  </div>
                ) : (
                  <>
                    <div className="form-control mb-3">
                      <label className="label">
                        <span className="label-text font-bold">Select Token:</span>
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedToken1}
                          onChange={(e) => {
                            const newToken = e.target.value;
                            setSelectedToken1(newToken);
                            if (newToken) setToken1Amount(generateRandomAmount(newToken));
                          }}
                          className="flex-1"
                        >
                          <option value="">-- Select a token --</option>
                          {fundTokens.map((token) => (
                            <option key={token.uid} value={token.uid}>
                              {token.symbol} ({token.name}) - Balance: {formatBalance(token.balance)}
                            </option>
                          ))}
                        </Select>
                        {selectedToken1 && (
                          <button
                            onClick={() => handleOpenConfigModal(selectedToken1)}
                            className="btn btn-ghost btn-sm px-3"
                            title="View Configuration String QR Code"
                          >
                            <MdQrCode size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedToken1 && (
                      <div className="form-control mb-4">
                        <label className="label">
                          <span className="label-text font-bold">Amount:</span>
                          <span className="label-text-alt text-muted">
                            Available: {formatBalance(fundTokens.find((t) => t.uid === selectedToken1)?.balance || 0n)}
                          </span>
                        </label>
                        <input
                          type="number"
                          value={token1Amount}
                          onChange={(e) => setToken1Amount(e.target.value)}
                          placeholder="Amount"
                          className="input"
                          min="1"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleSend1HTRPlus1Token}
                      disabled={isSending || !selectedToken1 || !token1Amount || parseFloat(token1Amount) <= 0}
                      className="btn btn-primary w-full"
                    >
                      {isSending ? 'Sending...' : 'Send 1 HTR + 1 Token'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Send 1 HTR + 2 Custom Tokens */}
            <div className="card bg-white shadow-md mb-4">
              <div className="card-body">
                <h3 className="card-title">Send 1 HTR + 2 Custom Tokens</h3>
                <p className="text-sm text-muted mb-4">
                  Send 1 HTR and 2 different custom tokens in a single transaction.
                </p>

                {isLoadingTokens ? (
                  <div className="text-sm text-muted mb-4">Loading tokens...</div>
                ) : fundTokens.length < 2 ? (
                  <div className="alert alert-info mb-4">
                    <p className="m-0 text-sm">At least 2 custom tokens with balance required in funding wallet.</p>
                  </div>
                ) : (
                  <>
                    <div className="form-control mb-3">
                      <label className="label">
                        <span className="label-text font-bold">Select First Token:</span>
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedToken1}
                          onChange={(e) => {
                            const newToken = e.target.value;
                            setSelectedToken1(newToken);
                            if (newToken) setToken1Amount(generateRandomAmount(newToken));
                          }}
                          className="flex-1"
                        >
                          <option value="">-- Select first token --</option>
                          {fundTokens.map((token) => (
                            <option key={token.uid} value={token.uid}>
                              {token.symbol} ({token.name}) - Balance: {formatBalance(token.balance)}
                            </option>
                          ))}
                        </Select>
                        {selectedToken1 && (
                          <button
                            onClick={() => handleOpenConfigModal(selectedToken1)}
                            className="btn btn-ghost btn-sm px-3"
                            title="View Configuration String QR Code"
                          >
                            <MdQrCode size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedToken1 && (
                      <div className="form-control mb-3">
                        <label className="label">
                          <span className="label-text font-bold">Amount for First Token:</span>
                          <span className="label-text-alt text-muted">
                            Available: {formatBalance(fundTokens.find((t) => t.uid === selectedToken1)?.balance || 0n)}
                          </span>
                        </label>
                        <input
                          type="number"
                          value={token1Amount}
                          onChange={(e) => setToken1Amount(e.target.value)}
                          placeholder="Amount"
                          className="input"
                          min="1"
                        />
                      </div>
                    )}

                    <div className="form-control mb-3">
                      <label className="label">
                        <span className="label-text font-bold">Select Second Token:</span>
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedToken2}
                          onChange={(e) => {
                            const newToken = e.target.value;
                            setSelectedToken2(newToken);
                            if (newToken) setToken2Amount(generateRandomAmount(newToken));
                          }}
                          className="flex-1"
                        >
                          <option value="">-- Select second token --</option>
                          {fundTokens
                            .filter((token) => token.uid !== selectedToken1)
                            .map((token) => (
                              <option key={token.uid} value={token.uid}>
                                {token.symbol} ({token.name}) - Balance: {formatBalance(token.balance)}
                              </option>
                            ))}
                        </Select>
                        {selectedToken2 && (
                          <button
                            onClick={() => handleOpenConfigModal(selectedToken2)}
                            className="btn btn-ghost btn-sm px-3"
                            title="View Configuration String QR Code"
                          >
                            <MdQrCode size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedToken2 && (
                      <div className="form-control mb-4">
                        <label className="label">
                          <span className="label-text font-bold">Amount for Second Token:</span>
                          <span className="label-text-alt text-muted">
                            Available: {formatBalance(fundTokens.find((t) => t.uid === selectedToken2)?.balance || 0n)}
                          </span>
                        </label>
                        <input
                          type="number"
                          value={token2Amount}
                          onChange={(e) => setToken2Amount(e.target.value)}
                          placeholder="Amount"
                          className="input"
                          min="1"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleSend1HTRPlus2Tokens}
                      disabled={isSending || !selectedToken1 || !selectedToken2 || !token1Amount || !token2Amount || parseFloat(token1Amount) <= 0 || parseFloat(token2Amount) <= 0}
                      className="btn btn-primary w-full"
                    >
                      {isSending ? 'Sending...' : 'Send 1 HTR + 2 Tokens'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Send 1 HTR + 3 Custom Tokens */}
            <div className="card bg-white shadow-md mb-4">
              <div className="card-body">
                <h3 className="card-title">Send 1 HTR + 3 Custom Tokens</h3>
                <p className="text-sm text-muted mb-4">
                  Send 1 HTR and 3 different custom tokens in a single transaction.
                </p>

                {isLoadingTokens ? (
                  <div className="text-sm text-muted mb-4">Loading tokens...</div>
                ) : fundTokens.length < 3 ? (
                  <div className="alert alert-info mb-4">
                    <p className="m-0 text-sm">At least 3 custom tokens with balance required in funding wallet.</p>
                  </div>
                ) : (
                  <>
                    <div className="form-control mb-3">
                      <label className="label">
                        <span className="label-text font-bold">Select First Token:</span>
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedToken1}
                          onChange={(e) => {
                            const newToken = e.target.value;
                            setSelectedToken1(newToken);
                            if (newToken) setToken1Amount(generateRandomAmount(newToken));
                          }}
                          className="flex-1"
                        >
                          <option value="">-- Select first token --</option>
                          {fundTokens.map((token) => (
                            <option key={token.uid} value={token.uid}>
                              {token.symbol} ({token.name}) - Balance: {formatBalance(token.balance)}
                            </option>
                          ))}
                        </Select>
                        {selectedToken1 && (
                          <button
                            onClick={() => handleOpenConfigModal(selectedToken1)}
                            className="btn btn-ghost btn-sm px-3"
                            title="View Configuration String QR Code"
                          >
                            <MdQrCode size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedToken1 && (
                      <div className="form-control mb-3">
                        <label className="label">
                          <span className="label-text font-bold">Amount for First Token:</span>
                          <span className="label-text-alt text-muted">
                            Available: {formatBalance(fundTokens.find((t) => t.uid === selectedToken1)?.balance || 0n)}
                          </span>
                        </label>
                        <input
                          type="number"
                          value={token1Amount}
                          onChange={(e) => setToken1Amount(e.target.value)}
                          placeholder="Amount"
                          className="input"
                          min="1"
                        />
                      </div>
                    )}

                    <div className="form-control mb-3">
                      <label className="label">
                        <span className="label-text font-bold">Select Second Token:</span>
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedToken2}
                          onChange={(e) => {
                            const newToken = e.target.value;
                            setSelectedToken2(newToken);
                            if (newToken) setToken2Amount(generateRandomAmount(newToken));
                          }}
                          className="flex-1"
                        >
                          <option value="">-- Select second token --</option>
                          {fundTokens
                            .filter((token) => token.uid !== selectedToken1)
                            .map((token) => (
                              <option key={token.uid} value={token.uid}>
                                {token.symbol} ({token.name}) - Balance: {formatBalance(token.balance)}
                              </option>
                            ))}
                        </Select>
                        {selectedToken2 && (
                          <button
                            onClick={() => handleOpenConfigModal(selectedToken2)}
                            className="btn btn-ghost btn-sm px-3"
                            title="View Configuration String QR Code"
                          >
                            <MdQrCode size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedToken2 && (
                      <div className="form-control mb-3">
                        <label className="label">
                          <span className="label-text font-bold">Amount for Second Token:</span>
                          <span className="label-text-alt text-muted">
                            Available: {formatBalance(fundTokens.find((t) => t.uid === selectedToken2)?.balance || 0n)}
                          </span>
                        </label>
                        <input
                          type="number"
                          value={token2Amount}
                          onChange={(e) => setToken2Amount(e.target.value)}
                          placeholder="Amount"
                          className="input"
                          min="1"
                        />
                      </div>
                    )}

                    <div className="form-control mb-3">
                      <label className="label">
                        <span className="label-text font-bold">Select Third Token:</span>
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedToken3}
                          onChange={(e) => {
                            const newToken = e.target.value;
                            setSelectedToken3(newToken);
                            if (newToken) setToken3Amount(generateRandomAmount(newToken));
                          }}
                          className="flex-1"
                        >
                          <option value="">-- Select third token --</option>
                          {fundTokens
                            .filter((token) => token.uid !== selectedToken1 && token.uid !== selectedToken2)
                            .map((token) => (
                              <option key={token.uid} value={token.uid}>
                                {token.symbol} ({token.name}) - Balance: {formatBalance(token.balance)}
                              </option>
                            ))}
                        </Select>
                        {selectedToken3 && (
                          <button
                            onClick={() => handleOpenConfigModal(selectedToken3)}
                            className="btn btn-ghost btn-sm px-3"
                            title="View Configuration String QR Code"
                          >
                            <MdQrCode size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedToken3 && (
                      <div className="form-control mb-4">
                        <label className="label">
                          <span className="label-text font-bold">Amount for Third Token:</span>
                          <span className="label-text-alt text-muted">
                            Available: {formatBalance(fundTokens.find((t) => t.uid === selectedToken3)?.balance || 0n)}
                          </span>
                        </label>
                        <input
                          type="number"
                          value={token3Amount}
                          onChange={(e) => setToken3Amount(e.target.value)}
                          placeholder="Amount"
                          className="input"
                          min="1"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleSend1HTRPlus3Tokens}
                      disabled={isSending || !selectedToken1 || !selectedToken2 || !selectedToken3 || !token1Amount || !token2Amount || !token3Amount || parseFloat(token1Amount) <= 0 || parseFloat(token2Amount) <= 0 || parseFloat(token3Amount) <= 0}
                      className="btn btn-primary w-full"
                    >
                      {isSending ? 'Sending...' : 'Send 1 HTR + 3 Tokens'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Return Tokens Section */}
          {sentTokens.length > 0 && (() => {
            // Group tokens by token ID and sum amounts
            const tokenGroups = sentTokens.reduce((acc, token) => {
              const existing = acc.get(token.tokenId);
              if (existing) {
                existing.amount = (BigInt(existing.amount) + BigInt(token.amount)).toString();
              } else {
                acc.set(token.tokenId, { ...token });
              }
              return acc;
            }, new Map<string, typeof sentTokens[0]>());

            const groupedTokens = Array.from(tokenGroups.values());

            return (
              <div className="mb-7.5">
                <h2 className="text-2xl font-bold mb-4">Return Tokens</h2>
                <div className="card bg-blue-50 border-2 border-blue-400">
                  <div className="card-body">
                    <h3 className="card-title text-blue-900">Tokens Sent This Session</h3>
                    <div className="overflow-x-auto mb-4">
                      <table className="table table-sm w-full">
                        <thead>
                          <tr>
                            <th>Token</th>
                            <th>Total Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedTokens.map((token, idx) => (
                            <tr key={idx}>
                              <td className="font-bold">{token.tokenSymbol}</td>
                              <td>{token.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  <button
                    onClick={handleReturnAllTokens}
                    disabled={isSending}
                    className="btn btn-warning w-full"
                  >
                    {isSending ? 'Returning...' : 'Return All Tokens to Funding Wallet'}
                  </button>
                </div>
              </div>
            </div>
            );
          })()}
        </>
      )}

      {/* Configuration String Modal */}
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
