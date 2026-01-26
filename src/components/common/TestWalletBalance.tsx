/**
 * Test Wallet Balance Display
 * Simple component that displays the HTR balance of the test wallet
 */

import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import { refreshWalletBalance } from '../../store/slices/walletStoreSlice';
import { formatBalance } from '../../utils/balanceUtils';
import { useState } from 'react';

export default function TestWalletBalance() {
  const dispatch = useAppDispatch();
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const { getWallet } = useWalletStore();

  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!testWalletId || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await dispatch(refreshWalletBalance(testWalletId)).unwrap();
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!testWalletId) {
    return (
      <div className="p-4 bg-yellow-50 border border-warning rounded-lg">
        <p className="text-yellow-800 m-0 text-sm mb-2">No test wallet selected.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-800 underline text-sm">
          Go to Wallet Initialization to select a test wallet
        </Link>
      </div>
    );
  }

  if (!testWallet || testWallet.status !== 'ready') {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 m-0 text-sm">
          <span className="inline-block animate-pulse mr-2">⏳</span>
          Wallet is connecting... Please wait.
        </p>
      </div>
    );
  }

  return (
    <div className="card-primary">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold m-0">Test Wallet Balance</h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-ghost btn-sm text-xs"
          title="Refresh balance"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <p className="text-xs text-muted mb-3">
        {testWallet.metadata.friendlyName}
      </p>

      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-3xl font-bold text-gray-900 m-0">
          {formatBalance(testWallet.balance)} <span className="text-lg text-muted">HTR</span>
        </p>
      </div>
    </div>
  );
}
