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
import CopyButton from '../common/CopyButton';
import DryRunCheckbox from '../common/DryRunCheckbox';
import { LoadingOverlay } from '../common/LoadingOverlay';
import TimelockPicker from '../common/TimelockPicker';
import { defaultTimelockValue, timelockToUnix } from '../../utils/timelockUtils';
import { useToast } from '../../hooks/useToast';
import { extractErrorMessage } from '../../utils/errorUtils';

const STORAGE_KEY_SNAP_ORIGIN = 'hathor_qa_snap_origin';

export const SnapConnectionStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();

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

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Snap Connection</h1>
      <p className="text-muted mb-7.5">Connect to the Hathor MetaMask Snap and configure the snap origin</p>

      {/* MetaMask Detection */}
      {hasMetaMask === false && (
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
              <p className="font-bold text-yellow-900 m-0">MetaMask Not Detected</p>
              <p className="text-sm text-yellow-800 mt-1 mb-0">
                Please install MetaMask or MetaMask Flask to use Snap features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Snap Origin Configuration */}
      <div className="card-primary mb-7.5">
        <h2 className="text-xl font-bold m-0 mb-4">Snap Origin</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Snap Origin URL</label>
            <input
              type="text"
              value={originInput}
              onChange={(e) => handleSetOrigin(e.target.value)}
              placeholder="local:http://localhost:8080"
              className="input"
            />
            <p className="text-xs text-muted mt-1">The snap origin identifier (local dev or npm package)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSetOrigin(DEFAULT_SNAP_ORIGIN)} className="btn-secondary py-1.5 px-3 text-sm">
              Local Dev
            </button>
            <button onClick={() => handleSetOrigin(SNAP_ORIGIN_NPM)} className="btn-secondary py-1.5 px-3 text-sm">
              NPM Package
            </button>
          </div>
        </div>
      </div>

      {/* Connection Card */}
      <div className="card-primary mb-7.5 relative">
        {isConnecting && <LoadingOverlay message="Waiting for MetaMask..." />}

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold m-0">Snap Session</h2>
            <p className="text-sm text-muted mt-1">
              {isConnected
                ? 'Connected and ready to test Snap methods'
                : 'Install/connect the Hathor Snap to begin testing'}
            </p>
          </div>
          <div>
            {isConnected ? (
              <button onClick={handleDisconnect} className="btn-danger">
                Disconnect
              </button>
            ) : (
              <button onClick={handleConnect} disabled={isConnecting || hasMetaMask === false} className="btn-primary">
                {isConnecting ? 'Connecting...' : isReconnecting ? 'Reconnecting...' : 'Connect Snap'}
              </button>
            )}
          </div>
        </div>

        {/* Snap Info */}
        {isConnected && installedSnap && (
          <div className="bg-blue-50 border border-blue-300 rounded p-4 mt-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Connected Snap</h3>
            <div className="bg-white border border-blue-200 rounded p-3 space-y-2">
              <div>
                <div className="text-xs text-muted mb-1">Snap ID</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs break-all">{installedSnap.id}</div>
                  <CopyButton text={installedSnap.id} label="Copy snap ID" />
                </div>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">Version</div>
                <div className="font-mono text-xs">{installedSnap.version}</div>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">Origin</div>
                <div className="font-mono text-xs break-all">{snapOrigin}</div>
              </div>
              {snapNetwork && (
                <div>
                  <div className="text-xs text-muted mb-1">Network</div>
                  <div className="font-mono text-xs">{snapNetwork}</div>
                </div>
              )}
              {snapAddress && (
                <div>
                  <div className="text-xs text-muted mb-1">Address (index 0)</div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-xs break-all">{snapAddress}</div>
                    <CopyButton text={snapAddress} label="Copy address" />
                  </div>
                </div>
              )}
              {isFetchingWalletInfo && <div className="text-xs text-muted italic">Fetching wallet info...</div>}
            </div>
          </div>
        )}
      </div>

      {/* Dry Run Toggle */}
      {isConnected && (
        <div className="card-primary mb-7.5">
          <div className="flex items-center gap-4">
            <DryRunCheckbox />
            <div>
              <h3 className="text-base font-bold m-0">Dry Run Mode</h3>
              <p className="text-sm text-muted mt-1 mb-0">Toggle dry run for all snap method stages</p>
            </div>
          </div>
        </div>
      )}

      {/* Inject Fund — shown when snap connected + addr0 available + funding wallet ready */}
      {canInjectFund && (
        <div className="card-primary mb-7.5">
          <h3 className="text-lg font-bold mb-4">Fund Snap Wallet</h3>
          <p className="text-sm text-muted mb-4">
            Send HTR from the funding wallet to the snap wallet address ({snapAddress.slice(0, 8)}...
            {snapAddress.slice(-6)})
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Unlocked</label>
                <input
                  type="number"
                  value={injectUnlocked}
                  onChange={(e) => setInjectUnlocked(parseInt(e.target.value) || 0)}
                  min="0"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Locked</label>
                <input
                  type="number"
                  value={injectLocked}
                  onChange={(e) => setInjectLocked(parseInt(e.target.value) || 0)}
                  min="0"
                  className="input"
                />
              </div>
            </div>

            <TimelockPicker
              value={injectTimestamp}
              onChange={setInjectTimestamp}
              label="Timestamp (lock until)"
              hint="Locked funds unavailable until this time (default: 5 min from now)"
            />

            {injectError && (
              <div className="p-3 bg-red-50 border border-danger rounded text-sm text-red-900">{injectError}</div>
            )}

            <button
              type="button"
              onClick={handleInjectFund}
              disabled={isInjecting || (injectUnlocked === 0 && injectLocked === 0)}
              className="btn-primary w-full"
            >
              {isInjecting ? 'Injecting...' : 'Inject Fund'}
            </button>
          </div>
        </div>
      )}

      {/* Getting Started Guide — shown when not connected */}
      {!isConnected && (
        <div className="card-primary mb-7.5 border border-indigo-200 bg-gradient-to-br from-indigo-50 to-slate-50">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-indigo-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold m-0 text-indigo-900">Getting Started</h2>
          </div>

          <p className="text-sm text-slate-700 mb-5 leading-relaxed">
            The MetaMask Snaps section requires the <strong>Hathor Snap</strong> running locally. Follow these steps to
            set up your environment before connecting.
          </p>

          {/* Prerequisites */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0">
                !
              </span>
              Prerequisites
            </h3>
            <ul className="text-sm text-slate-600 space-y-1 ml-6.5 list-disc">
              <li>
                <strong>MetaMask</strong> (or MetaMask Flask) browser extension installed
              </li>
              <li>
                <strong>Node.js</strong> 18+ and a package manager (yarn or npm)
              </li>
            </ul>
          </div>

          {/* Step 1 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
                1
              </span>
              Clone the RPC library
            </h3>
            <div className="relative group">
              <pre className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 text-sm font-mono overflow-x-auto">
                <span className="text-slate-500">$</span> git clone https://github.com/HathorNetwork/hathor-rpc-lib.git
                {'\n'}
                <span className="text-slate-500">$</span> cd hathor-rpc-lib
              </pre>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton
                  text="git clone https://github.com/HathorNetwork/hathor-rpc-lib.git && cd hathor-rpc-lib"
                  label="Copy"
                  className="!bg-slate-700 hover:!bg-slate-600 !text-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
                2
              </span>
              Install dependencies
            </h3>
            <div className="relative group">
              <pre className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 text-sm font-mono overflow-x-auto">
                <span className="text-slate-500">$</span> yarn install
              </pre>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton
                  text="yarn install"
                  label="Copy"
                  className="!bg-slate-700 hover:!bg-slate-600 !text-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
                3
              </span>
              Start the Snap dev server
            </h3>
            <div className="relative group">
              <pre className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 text-sm font-mono overflow-x-auto">
                <span className="text-slate-500">$</span> yarn snap-start
              </pre>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton
                  text="yarn snap-start"
                  label="Copy"
                  className="!bg-slate-700 hover:!bg-slate-600 !text-slate-300"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              This builds the Snap and serves it on{' '}
              <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">localhost:8080</code>, which matches
              the default <em>Local Dev</em> origin above.
            </p>
          </div>

          {/* Step 4 */}
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
                4
              </span>
              Connect above
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Once the Snap dev server is running, keep the <strong>Local Dev</strong> origin selected and click{' '}
              <strong>Connect Snap</strong>. MetaMask will prompt you to install the Hathor Snap.
            </p>
          </div>

          {/* Repo link */}
          <div className="mt-5 pt-4 border-t border-indigo-100">
            <a
              href="https://github.com/HathorNetwork/hathor-rpc-lib"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              View hathor-rpc-lib on GitHub
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
