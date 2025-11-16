/**
 * QA Layout Component
 * Main layout with sidebar and content area
 */

import Sidebar from './Sidebar';
import StageContent from './StageContent';
import ToastContainer from './common/ToastContainer';
import { useAppSelector } from '../store/hooks';
import { useWalletStore } from '../hooks/useWalletStore';
import { formatBalance } from '../utils/balanceUtils';

export default function QALayout() {
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const { getWallet } = useWalletStore();
  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header with Test Wallet Info */}
      {testWallet && (
        <div className="bg-gradient-to-r from-primary to-blue-700 text-white shadow-md">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold m-0">Test Wallet:</h2>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold">{testWallet.metadata.friendlyName}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                  {testWallet.metadata.network}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="opacity-80">Transactions: </span>
                <span className="font-bold">0</span>
              </div>
              {testWallet.balance && (
                <div className="text-sm">
                  <span className="opacity-80">Balance: </span>
                  <span className="font-bold">{formatBalance(testWallet.balance)} HTR</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1">
        <Sidebar />
        <StageContent />
        <ToastContainer />
      </div>
    </div>
  );
}
