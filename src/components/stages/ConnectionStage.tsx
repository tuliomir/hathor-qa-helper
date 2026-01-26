/**
 * Connection Stage
 *
 * Handles WalletConnect connection and Dry Run mode configuration
 */

import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
	connectWalletConnect,
	disconnectWalletConnect,
	selectIsWalletConnectConnected,
	selectWalletConnectFirstAddress,
} from '../../store/slices/walletConnectSlice';
import { toggleDryRunMode } from '../../store/slices/rpcSlice';
import { selectDeepLinksEnabled, toggleDeepLinksEnabled, } from '../../store/slices/deepLinkSlice';
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
  const deepLinksEnabled = useSelector(selectDeepLinksEnabled);

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

  const handleToggleDeepLinks = () => {
    dispatch(toggleDeepLinksEnabled());
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
        <div className="card-primary mb-7.5 bg-red-50 border border-red-500">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-600 flex-shrink-0"
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
              <p className="font-bold text-red-900 m-0">Wrong Wallet Connected</p>
              <p className="text-sm text-red-800 mt-1 mb-0">
                The wallet being called is not the test wallet. This is not a workflow expected by
                this helper. Please connect the same wallet that was selected as the test wallet.
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

      {/* Dry Run Mode Toggle using DaisyUI `swap` component */}
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

            {/* DaisyUI swap: input controls the state, swap-on/swap-off show icons */}
            <div className="flex items-center">
              <label className="swap swap-rotate">
                <input
                  type="checkbox"
                  checked={isDryRun}
                  onChange={handleToggleDryRun}
                  aria-label="Toggle Dry Run mode"
                />

                {/* swap-on: Dry Run enabled (show a check icon) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="swap-on h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>

                {/* swap-off: Dry Run disabled (show an x icon) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="swap-off h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </label>

              <span className="ml-3 text-sm font-medium">{isDryRun ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Wallet Deeplinks Toggle - Always visible */}
      <div className="card-primary mb-7.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold m-0">Activate Mobile Wallet Deeplinks</h3>
              <p className="text-sm text-muted mt-1 mb-0">
                {deepLinksEnabled
                  ? 'Deeplink toasts and QR code modals will be shown for mobile wallet interaction'
                  : 'Deeplink notifications are disabled'}
              </p>
            </div>

            <div className="flex items-center">
              <label className="swap swap-rotate">
                <input
                  type="checkbox"
                  checked={deepLinksEnabled}
                  onChange={handleToggleDeepLinks}
                  aria-label="Toggle Mobile Wallet Deeplinks"
                />

                {/* swap-on: Deeplinks enabled (show a check icon) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="swap-on h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>

                {/* swap-off: Deeplinks disabled (show an x icon) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="swap-off h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </label>

              <span className="ml-3 text-sm font-medium">{deepLinksEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>
    </div>
  );
};
