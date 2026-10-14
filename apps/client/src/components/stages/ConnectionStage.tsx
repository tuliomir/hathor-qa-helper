/**
 * Connection Stage
 *
 * WalletConnect session, dry run and mobile deep link options.
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  connectWalletConnect,
  disconnectWalletConnect,
  selectIsWalletConnectConnected,
  selectWalletConnectFirstAddress,
} from '../../store/slices/walletConnectSlice';
import { toggleDryRunMode } from '../../store/slices/rpcSlice';
import { selectDeepLinksEnabled, toggleDeepLinksEnabled } from '../../store/slices/deepLinkSlice';
import { useToast } from '../../hooks/useToast';
import { useRpcAddressMismatch } from '../../hooks/useRpcAddressMismatch';
import { StageHeader } from '../common/StageHeader';
import { Identifier } from '../common/Identifier';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { StatusChip } from '../ui/StatusChip';

function OptionToggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="toggle toggle-sm mt-0.5" checked={checked} onChange={onChange} />
      <span className="flex flex-col gap-0.5">
        <span className="text-body font-medium">{label}</span>
        <span className="text-caption text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}

export const ConnectionStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();

  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const deepLinksEnabled = useSelector(selectDeepLinksEnabled);
  const mismatch = useRpcAddressMismatch();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await dispatch(connectWalletConnect(undefined)).unwrap();
      showToast('Wallet connected', 'success');
    } catch (error) {
      console.error('Failed to connect:', error);
      showToast(error instanceof Error ? error.message : 'Failed to connect to WalletConnect', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await dispatch(disconnectWalletConnect()).unwrap();
      showToast('Wallet disconnected', 'success');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      showToast(error instanceof Error ? error.message : 'Failed to disconnect', 'error');
    }
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-connection"
        description="Connect a wallet over WalletConnect and set the RPC testing options."
      />

      <Panel
        title="WalletConnect session"
        actions={
          isConnected ? (
            <button type="button" className="btn btn-outline btn-error btn-sm" onClick={handleDisconnect}>
              Disconnect
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={handleConnect} disabled={isConnecting}>
              {isConnecting && <span className="loading loading-spinner loading-xs" aria-hidden="true" />}
              {isConnecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip
            status={isConnected ? 'connected' : isConnecting ? 'connecting' : 'idle'}
            label={isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Not connected'}
            tone={isConnected ? 'success' : isConnecting ? 'progress' : 'idle'}
          />
          <span className="text-body text-ink-muted">
            {isConnected
              ? 'RPC stages send their requests to this wallet.'
              : 'Connect a wallet to send RPC requests. Dry run works without one.'}
          </span>
        </div>
        {isConnected && connectedAddress && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-body font-medium">Address 0</span>
            <Identifier value={connectedAddress} kind="address" />
          </div>
        )}
      </Panel>

      {mismatch && (
        <Callout tone="error" title="Wrong wallet connected">
          <p className="m-0">
            The connected wallet is not the test wallet, which this helper does not expect. Connect the wallet selected
            as the test wallet.
          </p>
          <dl className="m-0 mt-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1">
            <dt>RPC session</dt>
            <dd className="m-0 min-w-0">
              <Identifier value={mismatch.connectedAddress} kind="address" walletTag={false} />
            </dd>
            <dt>Test wallet</dt>
            <dd className="m-0 min-w-0">
              <Identifier value={mismatch.testWalletAddress} kind="address" walletTag={false} />
            </dd>
          </dl>
        </Callout>
      )}

      <Panel title="Options">
        <OptionToggle
          label="Dry run"
          checked={isDryRun}
          onChange={() => dispatch(toggleDryRunMode())}
          hint={
            isDryRun
              ? 'Requests are generated but not sent to the wallet.'
              : 'Requests are sent to the connected wallet.'
          }
        />
        <OptionToggle
          label="Mobile wallet deep links"
          checked={deepLinksEnabled}
          onChange={() => dispatch(toggleDeepLinksEnabled())}
          hint={
            deepLinksEnabled
              ? 'Deep link toasts and QR codes appear for mobile wallet approval.'
              : 'Deep link notifications are off.'
          }
        />
      </Panel>
    </div>
  );
};
