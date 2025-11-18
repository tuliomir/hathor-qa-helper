/**
 * Custom Tokens Stage
 * Displays custom tokens for wallets from the global store
 */

import { useState } from 'react';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppSelector } from '../../store/hooks';
import type { WalletInfo } from '../../types/walletStore';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';

type TabType = 'fund' | 'test';

// Component for displaying wallet tokens
function WalletTokensDisplay({ wallet }: { wallet: WalletInfo }) {
  const [tokenUids, setTokenUids] = useState<string[] | null>(null);
  const [tokenDetails, setTokenDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setTokenUids(uids);

      // Fetch details for each token UID
      const details: Record<string, any> = {};
      for (const uid of uids) {
        try {
          const txData = await wallet.instance.getTxById(uid);
          details[uid] = txData;
        } catch (err) {
          details[uid] = {
            error: err instanceof Error ? err.message : 'Failed to fetch token details'
          };
        }
      }
      setTokenDetails(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
      setTokenUids(null);
      setTokenDetails(null);
    } finally {
      setIsLoading(false);
    }
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

      {/* Token UIDs Display */}
      {tokenUids && (
        <div className="card-primary mb-7.5">
          <h3 className="text-lg font-bold mb-3">Token UIDs</h3>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-[200px]">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words m-0">
              {JSONBigInt.stringify(tokenUids, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Token Details Display */}
      {tokenDetails && (
        <div className="card-primary mb-7.5">
          <h3 className="text-lg font-bold mb-3">Token Details (from getTxById)</h3>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-[600px]">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words m-0">
              {JSONBigInt.stringify(tokenDetails, 2)}
            </pre>
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
