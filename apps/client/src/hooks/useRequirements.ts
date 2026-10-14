/**
 * Common stage preconditions for PreconditionStrip, so stages don't rebuild
 * them. Each hook returns one Requirement.
 */

import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { selectIsWalletConnectConnected } from '../store/slices/walletConnectSlice';
import { selectIsSnapConnected } from '../store/slices/snapSlice';
import { getStageUrl } from '../config/stageRoutes';
import { NETWORKS, type NetworkKey } from '@qa-helper/shared/networks';
import type { ShieldedCapabilityLevel, WalletSession } from '@qa-helper/shared/serverApi';
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

/** Helper (QA) server status from helperServerSlice; the shell's server pill does the polling. */
export function useRequireHelperServer(): Requirement {
  const { status, error } = useSelector((state: RootState) => state.helperServer);
  const base = { id: 'helper-server', short: 'QA server' };
  switch (status) {
    case 'online':
      return { ...base, met: true, label: 'QA server running' };
    case 'idle':
    case 'connecting':
      return { ...base, met: 'pending', label: 'Checking the QA server' };
    case 'local-only':
      return {
        ...base,
        met: false,
        label: 'QA server only runs next to the dev client',
        action: 'Run the dev client (bun run dev:all)',
      };
    case 'error':
      return {
        ...base,
        met: false,
        label: `QA server error${error ? `: ${error}` : ''}`,
        action: 'Check the QA server',
        fix: { label: 'Open QA server', to: getStageUrl('shielded-qa-server') },
      };
    default:
      return {
        ...base,
        met: false,
        label: 'QA server not running',
        action: 'Start the QA server (bun run dev:server)',
        fix: { label: 'How to start it', to: getStageUrl('shielded-qa-server') },
      };
  }
}

/** A QA server session must be chosen and ready. */
export function useRequireServerSession(session: WalletSession | null | undefined): Requirement {
  const base = { id: 'server-session', short: 'Server session' };
  const fix = { label: 'Start one', to: getStageUrl('shielded-qa-server') };
  if (!session) {
    return { ...base, met: false, label: 'No server session selected', action: 'Choose a ready server session', fix };
  }
  if (session.state === 'starting') return { ...base, met: 'pending', label: 'Server session starting' };
  if (session.state === 'error') {
    return { ...base, met: false, label: 'Server session failed', action: 'Restart the server session', fix };
  }
  return { ...base, met: true, label: 'Server session ready' };
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
