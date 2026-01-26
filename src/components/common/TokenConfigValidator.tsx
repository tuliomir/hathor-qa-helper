/**
 * Token Configuration String Component
 * Shows the most recent custom token's configuration string
 * Two modes:
 * - 'validate': User pastes from app to validate against expected
 * - 'display': User copies from here to paste into app
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { tokensUtils } from '@hathor/wallet-lib';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import { refreshWalletTokens } from '../../store/slices/walletStoreSlice';
import type { Token } from '../../store/slices/tokensSlice';
import CopyButton from './CopyButton';

type Mode = 'validate' | 'display';

interface TokenConfigComponentProps {
  mode: Mode;
}

function TokenConfigComponent({ mode }: TokenConfigComponentProps) {
  const dispatch = useAppDispatch();
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const allTokens = useAppSelector((s) => s.tokens.tokens);
  const { getWallet } = useWalletStore();

  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;

  const [pastedConfig, setPastedConfig] = useState('');
  const [hasValidated, setHasValidated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!testWalletId || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await dispatch(refreshWalletTokens(testWalletId)).unwrap();
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get the most recent custom token from the test wallet
  const mostRecentToken = useMemo(() => {
    if (!testWallet?.tokenUids) return null;

    // Filter custom tokens (exclude native HTR)
    const customTokens: Token[] = testWallet.tokenUids
      .filter((uid) => uid !== NATIVE_TOKEN_UID)
      .map((uid) => allTokens.find((t) => t.uid === uid))
      .filter((t): t is Token => t !== undefined)
      .sort((a, b) => {
        // Sort by timestamp (newer first)
        if (a.timestamp && b.timestamp) {
          return b.timestamp - a.timestamp;
        }
        return 0;
      });

    return customTokens.length > 0 ? customTokens[0] : null;
  }, [testWallet?.tokenUids, allTokens]);

  // Generate configuration string for the most recent token
  const configString = useMemo(() => {
    if (!mostRecentToken) return null;
    return tokensUtils.getConfigurationString(
      mostRecentToken.uid,
      mostRecentToken.name,
      mostRecentToken.symbol
    );
  }, [mostRecentToken]);

  // Compare the pasted config with expected (validate mode only)
  const isMatch = useMemo(() => {
    if (mode !== 'validate' || !configString || !pastedConfig.trim()) return null;
    return pastedConfig.trim() === configString.trim();
  }, [mode, configString, pastedConfig]);

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPastedConfig(e.target.value);
    setHasValidated(true);
  };

  const handleClear = () => {
    setPastedConfig('');
    setHasValidated(false);
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

  if (!mostRecentToken) {
    return (
      <div className="p-4 bg-yellow-50 border border-warning rounded-lg">
        <p className="text-yellow-800 m-0 text-sm mb-3">
          No custom tokens found in this wallet.
        </p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-warning btn-sm"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Tokens'}
        </button>
      </div>
    );
  }

  const title = mode === 'validate'
    ? 'Token Configuration Validator'
    : 'Token Configuration String';

  const subtitle = mode === 'validate'
    ? 'Paste the configuration string from the app to validate'
    : 'Copy this configuration string to register the token in the app';

  return (
    <div className="card-primary space-y-4">
      <div>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-xs text-muted mb-0">{subtitle}</p>
      </div>

      {/* Token Info */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted mb-1">Name</p>
            <p className="font-medium m-0">{mostRecentToken.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Symbol</p>
            <p className="font-medium m-0">{mostRecentToken.symbol}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">UID</p>
            <p className="font-mono text-xs m-0 truncate" title={mostRecentToken.uid}>
              {mostRecentToken.uid.slice(0, 8)}...{mostRecentToken.uid.slice(-8)}
            </p>
          </div>
        </div>
      </div>

      {/* Configuration String */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold m-0">
            {mode === 'validate' ? 'Expected Configuration String' : 'Configuration String'}
          </p>
          {configString && <CopyButton text={configString} label="Copy" />}
        </div>
        <div className={`p-3 rounded-lg border ${
          mode === 'display'
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <code className="text-xs font-mono break-all">{configString}</code>
        </div>
      </div>

      {/* Validate mode: Paste Input */}
      {mode === 'validate' && (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold m-0">Paste Configuration String from App</p>
              {pastedConfig && (
                <button onClick={handleClear} className="text-xs text-muted hover:text-gray-700">
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={pastedConfig}
              onChange={handlePasteChange}
              placeholder="Paste the configuration string from the Desktop Wallet here..."
              className="input w-full font-mono text-xs min-h-[80px] resize-y"
            />
          </div>

          {/* Validation Result */}
          {hasValidated && pastedConfig.trim() && (
            <div
              className={`p-4 rounded-lg border ${
                isMatch
                  ? 'bg-green-50 border-success'
                  : 'bg-red-50 border-danger'
              }`}
            >
              {isMatch ? (
                <div className="flex items-center gap-3">
                  <span className="text-success text-xl">✓</span>
                  <div>
                    <p className="font-bold text-green-900 m-0">Configuration strings match!</p>
                    <p className="text-sm text-green-800 mt-1 mb-0">
                      The token configuration is correct.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-danger text-xl">✗</span>
                  <div>
                    <p className="font-bold text-red-900 m-0">Configuration strings do NOT match</p>
                    <p className="text-sm text-red-800 mt-1 mb-0">
                      Please verify you copied the correct configuration string.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Pre-configured components for the component registry (no props allowed)
export default function TokenConfigValidator() {
  return <TokenConfigComponent mode="validate" />;
}

export function TokenConfigDisplay() {
  return <TokenConfigComponent mode="display" />;
}
