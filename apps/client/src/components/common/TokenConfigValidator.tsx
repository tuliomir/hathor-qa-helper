/**
 * Token Configuration String Component
 * Shows the most recent custom token's configuration string
 * Two modes:
 * - 'validate': User pastes from app to validate against expected
 * - 'display': User copies from here to paste into app
 */

import { useMemo, useState } from 'react';
import { getConfigurationString } from '../../utils/tokenConfigString';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import { refreshWalletTokens } from '../../store/slices/walletStoreSlice';
import type { Token } from '../../store/slices/tokensSlice';
import CopyButton from './CopyButton';
import { Identifier } from './Identifier';
import { PreconditionStrip } from './PreconditionStrip';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { useRequireTestWallet } from '../../hooks/useRequirements';

type Mode = 'validate' | 'display';

interface TokenConfigComponentProps {
  mode: Mode;
}

function TokenConfigComponent({ mode }: TokenConfigComponentProps) {
  const dispatch = useAppDispatch();
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const allTokens = useAppSelector((s) => s.tokens.tokens);
  const { getWallet } = useWalletStore();
  const testWalletRequirement = useRequireTestWallet();

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
    return getConfigurationString(mostRecentToken.uid, mostRecentToken.name, mostRecentToken.symbol);
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

  if (testWalletRequirement.met !== true) {
    return <PreconditionStrip requirements={[testWalletRequirement]} />;
  }

  if (!mostRecentToken) {
    return (
      <Callout
        tone="warning"
        title="No custom tokens in the test wallet"
        action={
          <button type="button" onClick={handleRefresh} disabled={isRefreshing} className="btn btn-secondary btn-sm">
            {isRefreshing ? 'Refreshing…' : 'Refresh tokens'}
          </button>
        }
      >
        Create a token first, or refresh if you just created one.
      </Callout>
    );
  }

  const title = mode === 'validate' ? 'Token configuration validator' : 'Token configuration string';
  const subtitle =
    mode === 'validate'
      ? 'Paste the configuration string from the app to validate it.'
      : 'Copy this configuration string to register the token in the app.';

  return (
    <Panel title={title} description={subtitle} bodyClassName="gap-4">
      <dl className="m-0 grid grid-cols-1 gap-3 rounded-box bg-base-200 p-3 sm:grid-cols-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-ink-muted">Name</dt>
          <dd className="m-0 font-medium">{mostRecentToken.name}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-ink-muted">Symbol</dt>
          <dd className="m-0 font-medium">{mostRecentToken.symbol}</dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-caption text-ink-muted">UID</dt>
          <dd className="m-0 min-w-0">
            <Identifier value={mostRecentToken.uid} kind="token" />
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body font-medium">
            {mode === 'validate' ? 'Expected configuration string' : 'Configuration string'}
          </span>
          {configString && <CopyButton text={configString} label="Copy configuration string" />}
        </div>
        <code className="block rounded-field border border-base-300 bg-base-200 px-3 py-2 font-mono text-data [overflow-wrap:anywhere]">
          {configString}
        </code>
      </div>

      {mode === 'validate' && (
        <>
          <Field
            label="Configuration string from the app"
            trailing={
              pastedConfig && (
                <button type="button" onClick={handleClear} className="btn btn-ghost btn-xs">
                  Clear
                </button>
              )
            }
          >
            <textarea
              value={pastedConfig}
              onChange={handlePasteChange}
              placeholder="Paste the configuration string from the Desktop Wallet here"
              className="textarea min-h-20 w-full resize-y font-mono text-data"
            />
          </Field>

          {hasValidated &&
            pastedConfig.trim() &&
            (isMatch ? (
              <Callout tone="success" title="Configuration strings match" role="status">
                The token configuration is correct.
              </Callout>
            ) : (
              <Callout tone="error" title="Configuration strings do not match" role="alert">
                Check that you copied the configuration string of the right token.
              </Callout>
            ))}
        </>
      )}
    </Panel>
  );
}

// Pre-configured components for the component registry (no props allowed)
export default function TokenConfigValidator() {
  return <TokenConfigComponent mode="validate" />;
}

export function TokenConfigDisplay() {
  return <TokenConfigComponent mode="display" />;
}
