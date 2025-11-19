/**
 * RPC Testing Stage
 *
 * Allows testing RPC calls via WalletConnect to a local RPC server
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
import { RpcGetBalanceCard } from '../rpc/RpcGetBalanceCard';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useToast } from '../../hooks/useToast';

export const RpcTesting: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const testWallet = useSelector((state: RootState) =>
    testWalletId ? state.walletStore.wallets[testWalletId] : null
  );
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);

  // Local state
  const [balanceTokens, setBalanceTokens] = useState<string[]>(['00']);
  const [isConnecting, setIsConnecting] = useState(false);
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null);

  // Get test wallet address at index 0
  React.useEffect(() => {
    const getAddress = async () => {
      if (testWallet?.instance) {
        try {
          // Type assertion since we know the instance has getAddressAtIndex method
          const wallet = testWallet.instance as any;
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
    } catch (error: any) {
      console.error('Failed to connect:', error);
      showToast(error.message || 'Failed to connect to WalletConnect', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await dispatch(disconnectWalletConnect()).unwrap();
      showToast('Disconnected from WalletConnect', 'success');
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      showToast(error.message || 'Failed to disconnect', 'error');
    }
  };

  const handleToggleDryRun = () => {
    dispatch(toggleDryRunMode());
  };

  const handleCopyAddress = () => {
    if (connectedAddress) {
      navigator.clipboard.writeText(connectedAddress);
      showToast('Address copied to clipboard', 'success');
    }
  };

  // Create RPC handlers
  const rpcHandlers = useMemo(() => {
    if (!walletConnect.client || !walletConnect.session) {
      return null;
    }

    return createRpcHandlers({
      client: walletConnect.client,
      session: walletConnect.session,
      balanceTokens,
      dryRun: isDryRun,
    });
  }, [walletConnect.client, walletConnect.session, balanceTokens, isDryRun]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">RPC Testing</h2>
        <p className="text-gray-400 text-sm">
          Test RPC calls to a local wallet RPC server via WalletConnect
        </p>
      </div>

      {/* WalletConnect Connection */}
      <div className="card bg-base-100 shadow-xl border border-base-300">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="card-title text-lg">WalletConnect Session</h3>
              <p className="text-sm text-gray-400 mt-1">
                {isConnected
                  ? 'Connected and ready to test RPC methods'
                  : 'Connect your wallet to begin testing'}
              </p>
            </div>
            <div>
              {isConnected ? (
                <button onClick={handleDisconnect} className="btn btn-error btn-sm">
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="btn btn-primary btn-sm"
                >
                  {isConnecting ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Wallet Info */}
          {isConnected && connectedAddress && (
            <div className="mt-4 bg-info/10 border border-info/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-info flex-shrink-0 mt-0.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-info mb-2">Wallet Information</h4>
                  <div className="bg-base-100 border border-info/30 rounded p-3">
                    <div className="text-xs text-gray-400 mb-1">Address 0</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-xs text-gray-200 break-all">
                        {connectedAddress}
                      </div>
                      <button
                        onClick={handleCopyAddress}
                        className="btn btn-xs btn-ghost flex-shrink-0"
                        title="Copy address"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Address Mismatch Warning */}
      {addressMismatch && (
        <div role="alert" className="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            <strong>Warning:</strong> The connected wallet address does not match the selected test
            wallet address. RPC testing has been disabled. Please connect the correct wallet or select
            a different test wallet.
          </span>
        </div>
      )}

      {/* Warning if not connected */}
      {!isConnected && (
        <div role="alert" className="alert alert-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span>
            <strong>Not Connected:</strong> Please connect your wallet using the button above to enable
            RPC testing.
          </span>
        </div>
      )}

      {/* Dry Run Mode Toggle */}
      {isConnected && !addressMismatch && (
        <div
          className={`card shadow-xl border transition-colors ${
            isDryRun
              ? 'bg-secondary/10 border-secondary/30'
              : 'bg-base-100 border-base-300'
          }`}
        >
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 ${isDryRun ? 'text-secondary' : 'text-gray-400'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold">Dry Run Mode</h3>
                  <p className="text-xs text-gray-400">
                    {isDryRun
                      ? 'Requests will be generated but NOT sent to the RPC'
                      : 'Execute will send actual RPC requests'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-secondary"
                checked={isDryRun}
                onChange={handleToggleDryRun}
              />
            </div>
          </div>
        </div>
      )}

      {/* RPC Methods Section */}
      {isConnected && !addressMismatch && rpcHandlers && (
        <section className="space-y-4">
          <h3 className="text-xl font-bold">Wallet Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <RpcGetBalanceCard
              onExecute={rpcHandlers.getRpcBalance}
              disabled={false}
              balanceTokens={balanceTokens}
              setBalanceTokens={setBalanceTokens}
              isDryRun={isDryRun}
            />
          </div>
        </section>
      )}
    </div>
  );
};
