/**
 * Custom Tokens Stage
 * Displays custom tokens for wallets from the global store
 */

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { WalletInfo } from '../../types/walletStore';
import { addToken } from '../../store/slices/tokensSlice';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { tokensUtils } from '@hathor/wallet-lib';
import CopyButton from '../common/CopyButton';

type TabType = 'fund' | 'test';

// Component for displaying wallet tokens
function WalletTokensDisplay({ wallet }: { wallet: WalletInfo }) {
  const dispatch = useAppDispatch();
  const tokens = useAppSelector((s) => s.tokens.tokens);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTokenUid, setSelectedTokenUid] = useState<string | null>(null);
  const [configString, setConfigString] = useState<string | null>(null);

  const handleLoadTokens = async () => {
    if (!wallet || !wallet.instance) {
      setError('Wallet instance not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get token UIDs
      const uids = await wallet.instance.getTokens();

      // Fetch details for each token UID (skip native token "00")
      for (const uid of uids) {
        // Skip native token - we already have it in the slice
        if (uid === NATIVE_TOKEN_UID) {
          continue;
        }

        try {
          const txData = await wallet.instance.getTxById(uid);

          // Extract token info and store in Redux
          if (txData.success && txData.txTokens) {
            const tokenInfo = txData.txTokens.find((t: any) => t.tokenId === uid);
            if (tokenInfo && tokenInfo.tokenName && tokenInfo.tokenSymbol) {
              dispatch(addToken({
                uid,
                name: tokenInfo.tokenName,
                symbol: tokenInfo.tokenSymbol,
              }));
            }
          }
        } catch (err) {
          console.error(`Failed to fetch token details for ${uid}:`, err);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenClick = (uid: string, name: string, symbol: string) => {
    setSelectedTokenUid(uid);
    const config = tokensUtils.getConfigurationString(uid, name, symbol);
    setConfigString(config);
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

      {/* Load Tokens Button */}
      <div className="card-primary mb-7.5">
        <button
          type="button"
          onClick={handleLoadTokens}
          className="btn-primary px-4 py-2 w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load Custom Tokens'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card-primary mb-7.5 bg-red-50 border border-danger">
          <p className="m-0 text-red-900">{error}</p>
        </div>
      )}

      {/* Tokens List */}
      {tokens.length > 0 && (
        <div className="card-primary mb-7.5">
          <h3 className="text-lg font-bold mb-3">Available Tokens</h3>
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
                {tokens.map((token) => (
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
      {configString && selectedTokenUid && (
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
