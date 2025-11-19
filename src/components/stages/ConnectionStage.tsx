/**
 * Connection Stage
 *
 * Handles WalletConnect connection and Dry Run mode configuration
 */

import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  connectWalletConnect,
  disconnectWalletConnect,
  selectWalletConnectFirstAddress,
  selectIsWalletConnectConnected,
} from '../../store/slices/walletConnectSlice';
import { toggleDryRunMode } from '../../store/slices/rpcSlice';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';

export const ConnectionStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();

  // Redux state
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const testWallet = useSelector((state: RootState) =>
    testWalletId ? state.walletStore.wallets[testWalletId] : null
  );
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);

  // Local state
  const [isConnecting, setIsConnecting] = useState(false);
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);

  // Get test wallet address at index 0
  React.useEffect(() => {
    const getAddress = async () => {
      if (testWallet?.instance) {
        try {
          // Type assertion since we know the instance has getAddressAtIndex method
          const wallet = testWallet.instance as { getAddressAtIndex: (index: number) => Promise<string> };
          const address = await wallet.getAddressAtIndex(0);
          setTestWalletAddress(address);
        } catch (error) {
          console.error('Failed to get test wallet address:', error);
          setTestWalletAddress(null);
        }
      } else {
        setTestWalletAddress(null);
      }
    };

    getAddress();
  }, [testWallet]);

  // Check if connected address matches test wallet address at index 0
  const addressMismatch = useMemo(() => {
    if (!isConnected || !connectedAddress || !testWalletAddress) return false;

    return connectedAddress.toLowerCase() !== testWalletAddress.toLowerCase();
  }, [isConnected, connectedAddress, testWalletAddress]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await dispatch(connectWalletConnect(undefined)).unwrap();
      showToast('Connected to WalletConnect', 'success');
    } catch (error) {
      console.error('Failed to connect:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to WalletConnect';
      showToast(errorMessage, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await dispatch(disconnectWalletConnect()).unwrap();
      showToast('Disconnected from WalletConnect', 'success');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect';
      showToast(errorMessage, 'error');
    }
  };

  const handleToggleDryRun = () => {
    dispatch(toggleDryRunMode());
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">RPC Connection</h1>
      <p className="text-muted mb-7.5">
        Connect to your wallet via WalletConnect and configure RPC testing options
      </p>

      {/* WalletConnect Connection Card */}
      <div className="card-primary mb-7.5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold m-0">WalletConnect Session</h2>
            <p className="text-sm text-muted mt-1">
              {isConnected
                ? 'Connected and ready to test RPC methods'
                : 'Connect your wallet to begin testing'}
            </p>
          </div>
          <div>
            {isConnected ? (
              <button onClick={handleDisconnect} className="btn-danger">
                Disconnect
              </button>
            ) : (
              <button onClick={handleConnect} disabled={isConnecting} className="btn-primary">
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        {/* Wallet Info */}
        {isConnected && connectedAddress && (
          <div className="bg-blue-50 border border-blue-300 rounded p-4 mt-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Connected Wallet</h3>
            <div className="bg-white border border-blue-200 rounded p-3">
              <div className="text-xs text-muted mb-1">Address 0</div>
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-xs break-all">{connectedAddress}</div>
                <CopyButton text={connectedAddress} label="Copy address" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Address Mismatch Warning */}
      {addressMismatch && (
        <div className="card-primary mb-7.5 bg-yellow-50 border border-warning">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-warning flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-bold text-yellow-900 m-0">Address Mismatch Warning</p>
              <p className="text-sm text-yellow-800 mt-1 mb-0">
                The connected wallet address does not match the selected test wallet address. RPC
                testing has been disabled. Please connect the correct wallet or select a different
                test wallet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning if not connected */}
      {!isConnected && (
        <div className="card-primary mb-7.5 bg-blue-50 border border-info">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-info flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-bold text-blue-900 m-0">Not Connected</p>
              <p className="text-sm text-blue-800 mt-1 mb-0">
                Please connect your wallet using the button above to enable RPC testing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dry Run Mode Toggle */}
      {isConnected && !addressMismatch && (
        <div className="card-primary mb-7.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold m-0">Dry Run Mode</h3>
              <p className="text-sm text-muted mt-1 mb-0">
                {isDryRun
                  ? 'Requests will be generated but NOT sent to the RPC'
                  : 'Execute will send actual RPC requests'}
              </p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={handleToggleDryRun}
                className="mr-2"
              />
              <span className="text-sm font-medium">{isDryRun ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
