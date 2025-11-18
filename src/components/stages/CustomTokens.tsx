/**
 * Custom Tokens Stage
 * Displays custom tokens for wallets from the global store
 */

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import type { WalletInfo } from '../../types/walletStore';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { tokensUtils } from '@hathor/wallet-lib';
import CopyButton from '../common/CopyButton';
import { refreshWalletTokens, refreshWalletBalance } from '../../store/slices/walletStoreSlice';

type TabType = 'fund' | 'test';

interface Token {
  uid: string;
  name: string;
  symbol: string;
}

// Component for displaying wallet tokens
function WalletTokensDisplay({ wallet }: { wallet: WalletInfo }) {
  const dispatch = useAppDispatch();
  const allTokens = useAppSelector((s) => s.tokens.tokens);
  const [selectedTokenUid, setSelectedTokenUid] = useState<string | null>(null);
  const [configString, setConfigString] = useState<string | null>(null);
  const [addressIndex, setAddressIndex] = useState(0);
  const [amount, setAmount] = useState(1);
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tokens are now loaded automatically when wallet starts, so we don't need to load them here
  // Just reset selected token when wallet changes
  useEffect(() => {
    setSelectedTokenUid(null);
    setConfigString(null);
  }, [wallet?.metadata.id]);

  // Filter tokens for this wallet (exclude native token)
  const walletTokens: Token[] = wallet.tokenUids
    ? wallet.tokenUids
        .filter((uid) => uid !== NATIVE_TOKEN_UID)
        .map((uid) => allTokens.find((t) => t.uid === uid))
        .filter((t): t is Token => t !== undefined)
    : [];

  // Auto-select first token when wallet changes or tokens load
  useEffect(() => {
    if (walletTokens.length > 0 && !selectedTokenUid) {
      const firstToken = walletTokens[0];
      setSelectedTokenUid(firstToken.uid);
      const config = tokensUtils.getConfigurationString(firstToken.uid, firstToken.name, firstToken.symbol);
      setConfigString(config);
    }
  }, [walletTokens.length, selectedTokenUid]);

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

  const handleTokenClick = (uid: string, name: string, symbol: string) => {
    setSelectedTokenUid(uid);
    const config = tokensUtils.getConfigurationString(uid, name, symbol);
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

  const handleRefresh = async () => {
    if (!wallet || isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Refresh both tokens and balance
      await Promise.all([
        dispatch(refreshWalletTokens(wallet.metadata.id)).unwrap(),
        dispatch(refreshWalletBalance(wallet.metadata.id)).unwrap(),
      ]);
    } catch (error) {
      console.error('Failed to refresh wallet data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const selectedToken = walletTokens.find((t) => t.uid === selectedTokenUid);

  const getPaymentRequest = () => {
    if (!derivedAddress || !selectedToken) return '';
    return JSON.stringify({
      address: `hathor:${derivedAddress}`,
      amount: amount.toString(),
      token: {
        uid: selectedToken.uid,
        name: selectedToken.name,
        symbol: selectedToken.symbol,
      }
    });
  };

  return (
    <>
      {/* Wallet Info */}
      <div className="card-primary mb-7.5">
        <h2 className="text-xl font-bold mb-4">Wallet Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted mb-1">Name:</p>
            <p className="font-bold m-0">{wallet.metadata.friendlyName}</p>
          </div>
          <div>
            <p className="text-sm text-muted mb-1">Network:</p>
            <p className="font-bold m-0">{wallet.metadata.network}</p>
          </div>
        </div>
      </div>

      {/* No Tokens Message */}
      {walletTokens.length === 0 && (
        <div className="card-primary mb-7.5 text-center">
          <p className="m-0 text-muted">No custom tokens found for this wallet.</p>
        </div>
      )}

      {/* Tokens List */}
      {walletTokens.length > 0 && (
        <div className="card-primary mb-7.5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold m-0">Custom Tokens</h3>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-primary py-1.5 px-4 text-sm"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-300">
                <tr>
                  <th className="text-left py-2 px-3 font-bold">Symbol</th>
                  <th className="text-left py-2 px-3 font-bold">Name</th>
                  <th className="text-left py-2 px-3 font-bold">UID</th>
                </tr>
              </thead>
              <tbody>
                {walletTokens.map((token) => (
                  <tr
                    key={token.uid}
                    onClick={() => handleTokenClick(token.uid, token.name, token.symbol)}
                    className={`border-b border-gray-200 cursor-pointer transition-colors ${
                      selectedTokenUid === token.uid
                        ? 'bg-primary/10'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-2 px-3 font-semibold">{token.symbol}</td>
                    <td className="py-2 px-3">{token.name}</td>
                    <td className="py-2 px-3 font-mono text-2xs">{token.uid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configuration String Display */}
      {configString && selectedTokenUid && selectedToken && (
        <div className="card-primary mb-7.5">
          <div className="mb-3 text-center">
            <h3 className="text-lg font-bold m-0">Configuration String</h3>
          </div>

          {/* Configuration String */}
          <div className="flex items-center justify-center gap-2 mb-7.5">
            <p className="font-mono text-2xs break-all m-0 p-2 bg-gray-100 rounded inline-block">
              {configString}
            </p>
            <CopyButton text={configString} label="Copy config string" className="ml-2" />
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-white border-2 border-gray-300 rounded">
              <QRCode value={configString} size={200} />
            </div>
          </div>
        </div>
      )}

      {/* Payment Request Section */}
      {selectedToken && (
        <>
          {/* Address Index Control */}
          <div className="card-primary mb-7.5">
            <label htmlFor="address-index" className="block mb-1.5 font-bold">
              Address Index:
            </label>
            <input
              id="address-index"
              type="number"
              min={0}
              step={1}
              value={addressIndex}
              onChange={handleAddressIndexChange}
              className="input"
            />
            <p className="text-muted text-xs mt-1.5 mb-0">Index used to derive the address (default 0)</p>
          </div>

          {/* Amount Field */}
          <div className="card-primary mb-7.5">
            <label htmlFor="amount-input" className="block mb-1.5 font-bold">
              Payment Amount:
            </label>
            <input
              id="amount-input"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={handleAmountChange}
              className="input"
              placeholder="Enter amount"
            />
            <p className="text-muted text-xs mt-1.5 mb-0">
              Enter a positive integer for the payment amount ({selectedToken.symbol} tokens)
            </p>
          </div>

          {/* Payment Request QR Code */}
          {derivedAddress && (
            <div className="card-primary mb-7.5">
              <div className="mb-3 text-center">
                <h3 className="text-lg font-bold m-0">Payment Request QR Code</h3>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-white border-2 border-gray-300 rounded">
                  <QRCode value={getPaymentRequest()} size={200} />
                </div>
                <div className="flex items-center w-full">
                  <p className="font-mono text-2xs break-all m-0 p-2 bg-gray-100 rounded w-full">
                    {getPaymentRequest()}
                  </p>
                  <CopyButton text={getPaymentRequest()} label="Copy payment request" className="ml-2" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function CustomTokens() {
  const { getAllWallets } = useWalletStore();
  const wallets = getAllWallets();

  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);

  const [activeTab, setActiveTab] = useState<TabType>('test');

  const fundingWallet = wallets.find((w) => w.metadata.id === fundingWalletId && w.status === 'ready');
  const testWallet = wallets.find((w) => w.metadata.id === testWalletId && w.status === 'ready');

  const noWalletsSelected = !fundingWallet && !testWallet;

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Custom Tokens</h1>
      <p className="text-muted mb-7.5">
        View custom tokens for the funding and test wallets.
      </p>

      {noWalletsSelected ? (
        <div className="p-10 text-center border-2 border-dashed border-warning rounded-lg bg-yellow-50 text-yellow-800">
          <h2 className="mt-0 text-2xl font-bold">No Wallets Selected</h2>
          <p className="text-base">
            Please go to the <strong>Wallet Initialization</strong> stage, start wallets, and select both a funding
            wallet and a test wallet.
          </p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="mb-7.5">
            <div className="flex border-b border-gray-300">
              <button
                onClick={() => setActiveTab('fund')}
                className={`px-6 py-3 font-bold text-base border-b-2 transition-colors ${
                  activeTab === 'fund'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
                disabled={!fundingWallet}
              >
                Funding Wallet
                {!fundingWallet && ' (Not Selected)'}
              </button>
              <button
                onClick={() => setActiveTab('test')}
                className={`px-6 py-3 font-bold text-base border-b-2 transition-colors ${
                  activeTab === 'test'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
                disabled={!testWallet}
              >
                Test Wallet
                {!testWallet && ' (Not Selected)'}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'fund' && fundingWallet && (
            <WalletTokensDisplay wallet={fundingWallet} />
          )}

          {activeTab === 'test' && testWallet && (
            <WalletTokensDisplay wallet={testWallet} />
          )}
        </>
      )}
    </div>
  );
}
