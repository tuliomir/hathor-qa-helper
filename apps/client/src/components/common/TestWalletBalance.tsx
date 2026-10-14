/**
 * Test Wallet Balance Display
 * Simple component that displays the HTR balance of the test wallet
 */

import { MdRefresh } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import { refreshWalletBalance } from '../../store/slices/walletStoreSlice';
import { formatBalance } from '../../utils/balanceUtils';
import { useState } from 'react';
import { PreconditionStrip } from './PreconditionStrip';
import { Panel } from '../ui/Panel';
import { useRequireTestWallet } from '../../hooks/useRequirements';

export default function TestWalletBalance() {
  const dispatch = useAppDispatch();
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const { getWallet } = useWalletStore();
  const requirement = useRequireTestWallet();

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

  if (requirement.met !== true || !testWallet) {
    return <PreconditionStrip requirements={[requirement]} />;
  }

  return (
    <Panel
      title="Test wallet balance"
      description={testWallet.metadata.friendlyName}
      actions={
        <button type="button" onClick={handleRefresh} disabled={isRefreshing} className="btn btn-ghost btn-sm">
          <MdRefresh aria-hidden="true" />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      <p className="m-0 font-mono text-title tabular-nums">
        {formatBalance(testWallet.balance)} <span className="font-sans text-body text-ink-muted">HTR</span>
      </p>
    </Panel>
  );
}
