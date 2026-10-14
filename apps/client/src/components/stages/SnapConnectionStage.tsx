/**
 * Snap Connection Stage
 *
 * Handles MetaMask Snap installation/connection via EIP-6963 detection.
 * Syncs MetaMask context → Redux for other snap stages to check.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRequestSnap, useInvokeSnap, useMetaMaskContext } from '@hathor/snap-utils';
import type { AppDispatch, RootState } from '../../store';
import {
  setSnapConnected,
  setSnapOrigin,
  setSnapWalletInfo,
  setSnapError,
  resetSnap,
  selectSnapOrigin,
  selectIsSnapConnected,
  selectInstalledSnap,
  selectSnapAddress,
  selectSnapNetwork,
} from '../../store/slices/snapSlice';
import { DEFAULT_SNAP_ORIGIN, SNAP_ORIGIN_NPM } from '../../constants/snap';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { WALLET_CONFIG } from '../../constants/network';
import { useWalletStore } from '../../hooks/useWalletStore';
import { MdOpenInNew } from 'react-icons/md';
import CopyButton from '../common/CopyButton';
import TimelockPicker from '../common/TimelockPicker';
import { StageHeader } from '../common/StageHeader';
import { Identifier } from '../common/Identifier';
import NetworkChip from '../common/NetworkChip';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { SegmentedControl } from '../ui/SegmentedControl';
import { StatusChip } from '../ui/StatusChip';
import { setDryRunMode } from '../../store/slices/rpcSlice';
import { snapNetworkKey } from '../../utils/blueprints';
import { defaultTimelockValue, timelockToUnix } from '../../utils/timelockUtils';
import { useToast } from '../../hooks/useToast';
import { extractErrorMessage } from '../../utils/errorUtils';
import { applyNetworkServices } from '../../services/networkServices';

const STORAGE_KEY_SNAP_ORIGIN = 'hathor_qa_snap_origin';

type OriginPreset = 'local' | 'npm' | 'custom';

const ORIGIN_PRESETS: { value: OriginPreset; label: string }[] = [
  { value: 'local', label: 'Local dev' },
  { value: 'npm', label: 'NPM package' },
  { value: 'custom', label: 'Custom' },
];

function presetOf(origin: string): OriginPreset {
  if (origin === DEFAULT_SNAP_ORIGIN) return 'local';
  if (origin === SNAP_ORIGIN_NPM) return 'npm';
  return 'custom';
}

/** A shell command block in the JsonPanel style: mono on base-200, with copy. */
function CommandBlock({ lines, copyText }: { lines: string[]; copyText?: string }) {
  return (
    <div className="relative">
      <pre className="m-0 overflow-x-auto rounded-field bg-base-200 py-2.5 pl-3 pr-10 text-left font-mono text-data">
        {lines.map((line, i) => (
          <span key={i} className="block">
            <span className="select-none text-ink-muted" aria-hidden="true">
              ${' '}
            </span>
            {line}
          </span>
        ))}
      </pre>
      <div className="absolute right-1 top-1 rounded-field bg-base-200">
        <CopyButton text={copyText ?? lines.join('\n')} label="Copy command" />
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
      <dt className="w-36 flex-none text-caption text-ink-muted">{label}</dt>
      <dd className="m-0 flex min-w-0 items-center gap-1">{children}</dd>
    </div>
  );
}

export const SnapConnectionStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);

  const snapOrigin = useSelector(selectSnapOrigin);
  const isConnected = useSelector(selectIsSnapConnected);
  const installedSnap = useSelector(selectInstalledSnap);
  const snapAddress = useSelector(selectSnapAddress);
  const snapNetwork = useSelector(selectSnapNetwork);

  // Restore origin from localStorage on first load
  const storedOrigin = localStorage.getItem(STORAGE_KEY_SNAP_ORIGIN);
  const [originInput, setOriginInput] = useState(snapOrigin || storedOrigin || DEFAULT_SNAP_ORIGIN);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [hasMetaMask, setHasMetaMask] = useState<boolean | null>(null);
  const [isFetchingWalletInfo, setIsFetchingWalletInfo] = useState(false);

  // Funding wallet for inject fund feature
  const { getWallet } = useWalletStore();
  const fundingWalletId = useSelector((state: RootState) => state.walletSelection.fundingWalletId);
  const fundingWallet = fundingWalletId ? getWallet(fundingWalletId) : null;

  // Inject fund state
  const [injectUnlocked, setInjectUnlocked] = useState(10);
  const [injectLocked, setInjectLocked] = useState(5);
  const [injectTimestamp, setInjectTimestamp] = useState<string>(() => defaultTimelockValue(5));
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectError, setInjectError] = useState<string | null>(null);

  const canInjectFund = isConnected && snapAddress && fundingWallet?.instance;

  const handleInjectFund = async () => {
    if (!snapAddress || !fundingWallet?.instance) return;

    setIsInjecting(true);
    setInjectError(null);

    try {
      const fundAddr0 = await fundingWallet.instance.getAddressAtIndex(0);
      const timelockTs = timelockToUnix(injectTimestamp)!;

      const outputs: Array<{ address: string; value: bigint; token: string; timelock?: number }> = [];
      if (injectUnlocked > 0) {
        outputs.push({ address: snapAddress, value: BigInt(injectUnlocked), token: NATIVE_TOKEN_UID });
      }
      if (injectLocked > 0) {
        outputs.push({
          address: snapAddress,
          value: BigInt(injectLocked),
          token: NATIVE_TOKEN_UID,
          timelock: timelockTs,
        });
      }
      if (outputs.length === 0) return;

      applyNetworkServices(fundingWallet.metadata.network);
      const sendTx = await fundingWallet.instance.sendManyOutputsSendTransaction(outputs, {
        changeAddress: fundAddr0,
        pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
      });
      await sendTx.run();
      showToast('Funds injected to snap wallet successfully', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to inject funds';
      setInjectError(msg);
      console.error('Inject fund error:', err);
    } finally {
      setIsInjecting(false);
    }
  };

  const requestSnap = useRequestSnap(originInput);
  const invokeSnap = useInvokeSnap(originInput);
  const { provider, installedSnap: contextSnap, error: contextError, setInstalledSnap } = useMetaMaskContext();

  // Detect MetaMask via EIP-6963
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.info?.rdns === 'io.metamask' || detail?.info?.rdns === 'io.metamask.flask') {
        setHasMetaMask(true);
      }
    };

    window.addEventListener('eip6963:announceProvider', handler);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // Timeout to detect absence
    const timeout = setTimeout(() => {
      setHasMetaMask((prev) => (prev === null ? false : prev));
    }, 2000);

    return () => {
      window.removeEventListener('eip6963:announceProvider', handler);
      clearTimeout(timeout);
    };
  }, []);

  // Sync MetaMask context → Redux
  useEffect(() => {
    if (contextSnap) {
      dispatch(
        setSnapConnected({
          installedSnap: {
            id: contextSnap.id,
            version: contextSnap.version,
          },
          snapOrigin: originInput,
        })
      );
    }
  }, [contextSnap, dispatch, originInput]);

  useEffect(() => {
    if (contextError) {
      dispatch(setSnapError(extractErrorMessage(contextError)));
    }
  }, [contextError, dispatch]);

  // Auto-reconnect: on mount, check if snap is already installed in MetaMask
  // via wallet_getSnaps (no user approval needed). This avoids requiring
  // re-installation after page reload. Mirrors the web-wallet approach.
  useEffect(() => {
    if (isConnected || !provider || !storedOrigin) return;

    const checkExistingSnap = async () => {
      setIsReconnecting(true);
      try {
        const snaps = (await provider.request({ method: 'wallet_getSnaps' })) as Record<
          string,
          { id: string; version: string; enabled: boolean; blocked: boolean }
        > | null;

        const snap = snaps?.[storedOrigin];
        if (snap && snap.enabled && !snap.blocked) {
          // Snap is installed and active — reconnect without install dialog
          setInstalledSnap({ id: snap.id ?? storedOrigin, version: snap.version } as import('@hathor/snap-utils').Snap);
          dispatch(
            setSnapConnected({
              installedSnap: { id: snap.id ?? storedOrigin, version: snap.version },
              snapOrigin: storedOrigin,
            })
          );
          dispatch(setSnapOrigin(storedOrigin));
        }
      } catch (err) {
        console.warn('Auto-reconnect check failed:', err);
      } finally {
        setIsReconnecting(false);
      }
    };

    checkExistingSnap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const fetchWalletInfo = useCallback(async () => {
    setIsFetchingWalletInfo(true);
    try {
      const res = await invokeSnap({ method: 'htr_getWalletInformation' });
      const parsed = typeof res === 'string' ? JSON.parse(res) : res;
      const address = parsed?.response?.address0 ?? null;
      const network = parsed?.response?.network ?? null;
      if (address && network) {
        dispatch(setSnapWalletInfo({ address, network }));
      }
    } catch (err) {
      console.warn('Failed to fetch snap wallet info:', err);
    } finally {
      setIsFetchingWalletInfo(false);
    }
  }, [dispatch, invokeSnap]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    dispatch(setSnapOrigin(originInput));
    try {
      await requestSnap();
      localStorage.setItem(STORAGE_KEY_SNAP_ORIGIN, originInput);
      showToast('Snap connected successfully', 'success');
      // Scroll sidebar to the snaps group so stages are visible
      setTimeout(() => {
        document.getElementById('stage-group-snaps')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (err) {
      const msg = extractErrorMessage(err);
      dispatch(setSnapError(msg));
      showToast(msg, 'error');
    } finally {
      setIsConnecting(false);
    }
  }, [dispatch, originInput, requestSnap, showToast]);

  // Auto-fetch wallet info once connected and not yet fetched
  useEffect(() => {
    if (isConnected && !snapAddress && !isFetchingWalletInfo) {
      fetchWalletInfo();
    }
  }, [isConnected, snapAddress, isFetchingWalletInfo, fetchWalletInfo]);

  const handleDisconnect = () => {
    dispatch(resetSnap());
    localStorage.removeItem(STORAGE_KEY_SNAP_ORIGIN);
    showToast('Snap disconnected', 'success');
  };

  const handleSetOrigin = (value: string) => {
    setOriginInput(value);
  };

  const sessionStatus = isConnecting
    ? { status: 'connecting', label: 'Waiting for MetaMask' }
    : isReconnecting
      ? { status: 'connecting', label: 'Reconnecting' }
      : isConnected
        ? { status: 'connected', label: 'Connected' }
        : { status: 'idle', label: 'Not connected' };
  const snapNetworkChip = snapNetwork ? snapNetworkKey(snapNetwork) : null;

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="snap-connection" description="Connect to the Hathor MetaMask Snap and choose its origin." />

      {hasMetaMask === false && (
        <Callout tone="warning" title="MetaMask not detected" role="alert">
          Install MetaMask or MetaMask Flask to use the snap stages.
        </Callout>
      )}

      <Panel
        title="Snap origin"
        description="Where MetaMask loads the snap from: a local dev server or the npm package."
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-body font-medium">Preset</span>
          <SegmentedControl
            className="self-start"
            aria-label="Snap origin preset"
            options={ORIGIN_PRESETS}
            value={presetOf(originInput)}
            onChange={(preset) => {
              if (preset === 'local') handleSetOrigin(DEFAULT_SNAP_ORIGIN);
              if (preset === 'npm') handleSetOrigin(SNAP_ORIGIN_NPM);
              if (preset === 'custom') document.getElementById('snap-origin-input')?.focus();
            }}
          />
        </div>
        <Field label="Snap origin" hint="The snap ID MetaMask installs, e.g. local:http://localhost:8080.">
          <input
            id="snap-origin-input"
            type="text"
            value={originInput}
            onChange={(e) => handleSetOrigin(e.target.value)}
            placeholder="local:http://localhost:8080"
            spellCheck={false}
            className="input w-full font-mono text-data"
          />
        </Field>
      </Panel>

      <Panel
        title="Snap session"
        description={
          isConnected
            ? 'Connected and ready for the snap stages.'
            : 'Install or connect the Hathor Snap to start testing.'
        }
        actions={
          isConnected ? (
            <button type="button" onClick={handleDisconnect} className="btn btn-sm btn-outline btn-error">
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting || hasMetaMask === false}
              className="btn btn-sm btn-primary"
            >
              {(isConnecting || isReconnecting) && (
                <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              )}
              {isConnecting ? 'Waiting for MetaMask…' : isReconnecting ? 'Reconnecting…' : 'Connect snap'}
            </button>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={sessionStatus.status} label={sessionStatus.label} />
          <label className="ml-auto flex cursor-pointer select-none items-center gap-2 text-body">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={isDryRun}
              onChange={(e) => dispatch(setDryRunMode(e.target.checked))}
            />
            Dry run for every snap stage
          </label>
        </div>

        {isConnected && installedSnap && (
          <section
            className="flex flex-col gap-2 border-t border-base-300 pt-3"
            aria-labelledby="snap-connected-heading"
          >
            <h3 id="snap-connected-heading" className="m-0 text-body font-semibold">
              Connected snap
            </h3>
            <dl className="m-0 flex flex-col gap-2">
              <DetailRow label="Snap ID">
                <code className="min-w-0 truncate font-mono text-data" title={installedSnap.id}>
                  {installedSnap.id}
                </code>
                <CopyButton text={installedSnap.id} label="Copy snap ID" />
              </DetailRow>
              <DetailRow label="Version">
                <code className="font-mono text-data">{installedSnap.version}</code>
              </DetailRow>
              <DetailRow label="Origin">
                <code className="min-w-0 truncate font-mono text-data" title={snapOrigin}>
                  {snapOrigin}
                </code>
              </DetailRow>
              {snapNetwork && (
                <DetailRow label="Network">
                  {snapNetworkChip ? (
                    <NetworkChip network={snapNetworkChip} size="sm" />
                  ) : (
                    <code className="font-mono text-data">{snapNetwork}</code>
                  )}
                </DetailRow>
              )}
              {snapAddress && (
                <DetailRow label="Address (index 0)">
                  <Identifier value={snapAddress} kind="address" walletTag={false} />
                </DetailRow>
              )}
              {isFetchingWalletInfo && (
                <p className="m-0 flex items-center gap-2 text-caption text-ink-muted">
                  <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                  Fetching wallet information…
                </p>
              )}
            </dl>
          </section>
        )}
      </Panel>

      {canInjectFund && (
        <Panel
          title="Fund the snap wallet"
          description="Send HTR from the funding wallet to the snap's address 0."
          footer={
            <button
              type="button"
              onClick={handleInjectFund}
              disabled={isInjecting || (injectUnlocked === 0 && injectLocked === 0)}
              className="btn btn-primary ml-auto"
            >
              {isInjecting && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
              {isInjecting ? 'Sending funds…' : 'Send funds'}
            </button>
          }
        >
          <p className="m-0 flex flex-wrap items-center gap-2 text-body">
            <span className="text-ink-muted">Recipient</span>
            <Identifier value={snapAddress} kind="address" walletTag="Snap addr 0" />
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Unlocked amount">
              <input
                type="number"
                value={injectUnlocked}
                onChange={(e) => setInjectUnlocked(parseInt(e.target.value) || 0)}
                min="0"
                className="input w-full text-right font-mono text-data tabular-nums"
              />
            </Field>
            <Field label="Locked amount">
              <input
                type="number"
                value={injectLocked}
                onChange={(e) => setInjectLocked(parseInt(e.target.value) || 0)}
                min="0"
                className="input w-full text-right font-mono text-data tabular-nums"
              />
            </Field>
          </div>
          <TimelockPicker
            value={injectTimestamp}
            onChange={setInjectTimestamp}
            label="Lock until"
            hint="Locked funds can't be spent before this time (default: 5 minutes from now)."
          />
          {injectError && (
            <Callout tone="error" title="Sending funds failed" role="alert">
              <pre className="m-0 whitespace-pre-wrap break-words font-mono text-data-sm">{injectError}</pre>
            </Callout>
          )}
        </Panel>
      )}

      {!isConnected && (
        <Panel title="Set up the Hathor Snap">
          <div className="flex max-w-prose flex-col gap-4 text-left text-body-lg">
            <p className="m-0">
              The snap stages need the Hathor Snap running locally. Set it up once, then connect above.
            </p>

            <div className="flex flex-col gap-1">
              <h3 className="m-0 text-body-lg font-semibold">Before you start</h3>
              <ul className="m-0 list-disc pl-5">
                <li>MetaMask or MetaMask Flask installed in this browser.</li>
                <li>Node.js 18 or newer, and yarn or npm.</li>
              </ul>
            </div>

            <ol className="m-0 flex list-decimal flex-col gap-4 pl-5 marker:font-semibold marker:text-ink-muted">
              <li className="space-y-2 pl-1">
                <span className="block font-semibold">Clone the RPC library</span>
                <CommandBlock
                  lines={['git clone https://github.com/HathorNetwork/hathor-rpc-lib.git', 'cd hathor-rpc-lib']}
                  copyText="git clone https://github.com/HathorNetwork/hathor-rpc-lib.git && cd hathor-rpc-lib"
                />
              </li>
              <li className="space-y-2 pl-1">
                <span className="block font-semibold">Install dependencies</span>
                <CommandBlock lines={['yarn install']} />
              </li>
              <li className="space-y-2 pl-1">
                <span className="block font-semibold">Start the snap dev server</span>
                <CommandBlock lines={['yarn snap-start']} />
                <span className="block text-body text-ink-muted">
                  This builds the snap and serves it on{' '}
                  <code className="rounded-selector bg-base-200 px-1 font-mono text-data">localhost:8080</code>, which
                  is the Local dev origin.
                </span>
              </li>
              <li className="space-y-1 pl-1">
                <span className="block font-semibold">Connect</span>
                <span className="block">
                  With the dev server running and the Local dev origin selected, press Connect snap. MetaMask asks you
                  to install the Hathor Snap.
                </span>
              </li>
            </ol>

            <a
              href="https://github.com/HathorNetwork/hathor-rpc-lib"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary inline-flex items-center gap-1 self-start text-body"
            >
              hathor-rpc-lib on GitHub
              <MdOpenInNew aria-hidden="true" />
            </a>
          </div>
        </Panel>
      )}
    </div>
  );
};
