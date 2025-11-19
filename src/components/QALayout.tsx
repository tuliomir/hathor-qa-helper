/**
 * QA Layout Component
 * Main layout with sidebar and content area
 */

import Sidebar from './Sidebar';
import StageContent from './StageContent';
import ToastContainer from './common/ToastContainer';
import { useAppSelector } from '../store/hooks';
import { useWalletStore } from '../hooks/useWalletStore';
import { useStage } from '../hooks/useStage';
import { formatBalance } from '../utils/balanceUtils';

export default function QALayout() {
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const { getWallet } = useWalletStore();
  const { setCurrentStage } = useStage();
  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Fixed Header always visible */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-gradient-to-r from-primary to-blue-700 text-white shadow-md">
        <div className="px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Conditionally render test wallet info */}
            {testWallet ? (
              <>
                <h2 className="text-lg font-bold m-0">Test Wallet:</h2>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{testWallet.metadata.friendlyName}</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                    {testWallet.metadata.network}
                  </span>
                </div>
              </>
            ) : (
              <h2 className="text-lg font-bold m-0">QA Helper</h2>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div
              className="text-sm cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setCurrentStage('transaction-history')}
              title="Click to view transaction history"
            >
              <span className="opacity-80">Transactions: </span>
              <span className="font-bold">0</span>
            </div>
            {testWallet && testWallet.balance && (
              <div className="text-sm">
                <span className="opacity-80">Balance: </span>
                <span className="font-bold">{formatBalance(testWallet.balance)} HTR</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: add top padding equal to header height (h-14 = 56px) */}
      {/* `min-h-0` allows flex children with `overflow` to size correctly inside the column */}
      <div className="flex flex-1 pt-14 min-h-0">
        <Sidebar />
        <StageContent />
        <ToastContainer />
      </div>
    </div>
  );
}
