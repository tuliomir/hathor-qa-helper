/**
 * QA Layout Component
 * Main layout with sidebar and content area
 */

import Sidebar from './Sidebar';
import StageContent from './StageContent';
import ToastContainer from './common/ToastContainer';
import DeepLinkModal from './common/DeepLinkModal';
import { useAppSelector } from '../store/hooks';
import { useWalletStore } from '../hooks/useWalletStore';
import { useStage } from '../hooks/useStage';
import { formatBalance } from '../utils/balanceUtils';

export default function QALayout() {
  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const { getWallet } = useWalletStore();
  const { setCurrentStage } = useStage();

  const fundingWallet = fundingWalletId ? getWallet(fundingWalletId) : undefined;
  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;

  // Show wallets that are idle, connecting, syncing, ready, or have errors
  const shouldShowFundingWallet = fundingWallet && ['idle', 'connecting', 'syncing', 'ready', 'error'].includes(fundingWallet.status);
  const shouldShowTestWallet = testWallet && ['idle', 'connecting', 'syncing', 'ready', 'error'].includes(testWallet.status);
  const showAnyWallet = shouldShowFundingWallet || shouldShowTestWallet;

  const renderWalletInfo = (wallet: ReturnType<typeof getWallet>, label: string) => {
    if (!wallet) return null;

    const isLoading = wallet.status === 'idle' || wallet.status === 'connecting' || wallet.status === 'syncing';
    const isReady = wallet.status === 'ready';
    const isError = wallet.status === 'error';

    const getLoadingText = () => {
      if (wallet.status === 'idle') return 'Starting...';
      if (wallet.status === 'connecting') return 'Connecting...';
      if (wallet.status === 'syncing') return 'Syncing...';
      return '';
    };

    return (
      <div className="flex items-center gap-4 px-4 border-l border-white/20 first:border-l-0 first:pl-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold opacity-80">{label}:</span>
          <span className="text-base font-semibold">{wallet.metadata.friendlyName}</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
            {wallet.metadata.network}
          </span>
        </div>

        {isLoading && (
          <div className="text-xs bg-yellow-400/30 px-2 py-0.5 rounded">
            {getLoadingText()}
          </div>
        )}

        {isError && (
          <div
            className="text-xs bg-red-500/80 px-2 py-0.5 rounded cursor-pointer hover:bg-red-500 transition-colors"
            onClick={() => setCurrentStage('wallet-initialization')}
            title="Click to go to Wallet Initialization stage"
          >
            Error - Click to fix
          </div>
        )}

        {isReady && (
          <div className="flex items-center gap-4">
            <div
              className="text-sm cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setCurrentStage('transaction-history')}
              title="Click to view transaction history"
            >
              <span className="opacity-80">Txs: </span>
              <span className="font-bold">0</span>
            </div>
            {wallet.balance !== undefined && (
              <div className="text-sm">
                <span className="opacity-80">Balance: </span>
                <span className="font-bold">{formatBalance(wallet.balance)} HTR</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Fixed Header always visible */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-gradient-to-r from-primary to-blue-700 text-white shadow-md">
        <div className="px-6 h-14 flex items-center justify-between w-full">
          {showAnyWallet ? (
            <>
              {shouldShowTestWallet && renderWalletInfo(testWallet, 'Test')}
              {shouldShowFundingWallet && renderWalletInfo(fundingWallet, 'Funding')}
            </>
          ) : (
            <h2 className="text-lg font-bold m-0">QA Helper</h2>
          )}
        </div>
      </div>

      {/* Main Content Area: add top padding equal to header height (h-14 = 56px) */}
      {/* `min-h-0` allows flex children with `overflow` to size correctly inside the column */}
      <div className="flex flex-1 pt-14 min-h-0">
        <Sidebar />
        <StageContent />
        <ToastContainer />
        <DeepLinkModal />
      </div>
    </div>
  );
}
