/**
 * Common stage preconditions for PreconditionStrip, so stages don't rebuild
 * them. Each hook returns one Requirement.
 */

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { selectIsWalletConnectConnected } from '../store/slices/walletConnectSlice';
import { selectIsSnapConnected } from '../store/slices/snapSlice';
import { getStageUrl } from '../config/stageRoutes';
import { NETWORKS, type NetworkKey } from '@qa-helper/shared/networks';
import { QA_SERVER_PROXY_PREFIX, QA_SERVER_ROUTES, type ShieldedCapabilityLevel } from '@qa-helper/shared/serverApi';
import type { Requirement } from '../utils/requirements';

const WALLETS_URL = getStageUrl('wallet-initialization');

function useWalletRequirement(role: 'test' | 'funding'): Requirement {
  const Role = role === 'test' ? 'Test' : 'Funding';
  const wallet = useSelector((state: RootState) => {
    const id = role === 'test' ? state.walletSelection.testWalletId : state.walletSelection.fundingWalletId;
    return id ? state.walletStore.wallets[id] : undefined;
  });
  const fix = { label: `Choose a ${role} wallet`, to: WALLETS_URL };
  const base = { id: `${role}-wallet`, short: `${Role} wallet` };

  if (!wallet) return { ...base, met: false, label: `${Role} wallet not selected`, action: fix.label, fix };
  switch (wallet.status) {
    case 'ready':
      return { ...base, met: true, label: `${Role} wallet ready` };
    case 'connecting':
    case 'syncing':
      return { ...base, met: 'pending', label: `${Role} wallet ${wallet.status}` };
    case 'error':
      return {
        ...base,
        met: false,
        label: `${Role} wallet failed`,
        action: `Restart the ${role} wallet`,
        fix: { label: 'Open wallets', to: WALLETS_URL },
      };
    default:
      return {
        ...base,
        met: false,
        label: `${Role} wallet not started`,
        action: `Start the ${role} wallet`,
        fix: { label: 'Start it', to: WALLETS_URL },
      };
  }
}

export const useRequireTestWallet = () => useWalletRequirement('test');
export const useRequireFundingWallet = () => useWalletRequirement('funding');

export function useRequireRpcSession(): Requirement {
  const connected = useSelector(selectIsWalletConnectConnected);
  return connected
    ? { id: 'rpc-session', short: 'RPC session', met: true, label: 'RPC session connected' }
    : {
        id: 'rpc-session',
        short: 'RPC session',
        met: false,
        label: 'RPC session not connected',
        action: 'Connect an RPC session',
        fix: { label: 'Connect a wallet', to: getStageUrl('rpc-connection') },
      };
}

export function useRequireSnap(): Requirement {
  const connected = useSelector(selectIsSnapConnected);
  return connected
    ? { id: 'snap', short: 'Snap', met: true, label: 'Snap connected' }
    : {
        id: 'snap',
        short: 'Snap',
        met: false,
        label: 'Snap not connected',
        action: 'Connect the snap',
        fix: { label: 'Connect MetaMask', to: getStageUrl('snap-connection') },
      };
}

/**
 * Pings the QA server's /health through the dev proxy every 10s. Local
 * state on purpose; the shell's helper-server pill owns the global status.
 */
export function useRequireHelperServer(pollMs = 10_000): Requirement {
  const [state, setState] = useState<boolean | 'pending'>('pending');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${QA_SERVER_PROXY_PREFIX}${QA_SERVER_ROUTES.health}`);
        if (!cancelled) setState(res.ok);
      } catch {
        if (!cancelled) setState(false);
      }
    };
    check();
    const timer = setInterval(check, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pollMs]);

  const base = { id: 'helper-server', short: 'Helper server' };
  if (state === 'pending') return { ...base, met: 'pending', label: 'Checking the helper server' };
  return state
    ? { ...base, met: true, label: 'Helper server running' }
    : {
        ...base,
        met: false,
        label: 'Helper server not running',
        action: 'Start the helper server (bun run dev:server)',
      };
}

/** The test wallet's network (or `actual`) must be `expected`. */
export function useRequireNetwork(expected: NetworkKey, actual?: NetworkKey | null): Requirement {
  const testNetwork = useSelector((state: RootState) => {
    const id = state.walletSelection.testWalletId;
    return id ? state.walletStore.wallets[id]?.metadata.network : undefined;
  });
  const current = actual === undefined ? testNetwork : actual;
  const label = NETWORKS[expected].label;
  return current === expected
    ? { id: `network-${expected}`, short: label, met: true, label }
    : {
        id: `network-${expected}`,
        short: label,
        met: false,
        label: current ? `Needs ${label}; test wallet is on ${NETWORKS[current].label}` : `Needs ${label}`,
        action: `Switch the test wallet to ${label}`,
        fix: { label: 'Open wallets', to: WALLETS_URL },
      };
}

const LEVELS: ShieldedCapabilityLevel[] = ['none', 'watch', 'view', 'full'];

/** The test wallet's shielded capability (as wallet-lib reports it) must reach `level`. */
export function useRequireCapability(level: ShieldedCapabilityLevel): Requirement {
  const capability = useSelector((state: RootState) => {
    const id = state.walletSelection.testWalletId;
    return id ? state.walletStore.wallets[id]?.shieldedCapability?.level : undefined;
  });
  const word = level[0].toUpperCase() + level.slice(1);
  const met = capability !== undefined && LEVELS.indexOf(capability) >= LEVELS.indexOf(level);
  return met
    ? {
        id: `capability-${level}`,
        short: `${word} capability`,
        met: true,
        label: `Test wallet capability: ${capability}`,
      }
    : {
        id: `capability-${level}`,
        short: `${word} capability`,
        met: false,
        label: `Test wallet capability below ${word.toLowerCase()}`,
        action: `Use a test wallet with ${word.toLowerCase()} capability`,
      };
}
