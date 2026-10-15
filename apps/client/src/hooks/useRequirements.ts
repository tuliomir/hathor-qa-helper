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
import type { ShieldedCapabilityLevel } from '@qa-helper/shared/serverApi';
import type { SignerInfo } from '../store/slices/qaServerSlice';
import type { Requirement } from '../utils/requirements';
import { isAddressOnly } from '../utils/addressOnlyWallet';

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
    case 'address-only':
      return {
        ...base,
        met: false,
        label: `${Role} wallet is address-only`,
        action: `Choose a ${role} wallet with a seed`,
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

/** A running test wallet: for stages that sign with it or read its balances. */
export const useRequireTestWallet = () => useWalletRequirement('test');

/**
 * The test wallet's address 0 is known: a running wallet, or an
 * address-only one. For stages that only need the address, like RPC
 * requests and sends to the test wallet.
 */
export function useRequireTestAddress(): Requirement {
  const running = useWalletRequirement('test');
  const addressOnly = useSelector((state: RootState) => {
    const id = state.walletSelection.testWalletId;
    const wallet = id ? state.walletStore.wallets[id] : undefined;
    return wallet ? isAddressOnly(wallet.metadata) : false;
  });
  return addressOnly
    ? { ...running, met: true, label: 'Test wallet: address only', action: undefined, fix: undefined }
    : running;
}
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
        action: 'Check the QA server (Helper pill in the top bar)',
      };
    default:
      return {
        ...base,
        met: false,
        label: 'QA server not running',
        action: 'Start the QA server (bun run dev:server)',
      };
  }
}

/**
 * The wallet's signer (its copy on the QA server) must be ready. Signers
 * follow their wallets, so the fix is always on the wallet itself.
 */
export function useRequireSigner(walletName: string | null, signer: SignerInfo | null): Requirement {
  const base = { id: 'signer', short: 'Signer' };
  if (!walletName || !signer) return { ...base, met: false, label: 'No sending wallet', action: 'Choose a wallet' };
  switch (signer.state) {
    case 'ready':
      return { ...base, met: true, label: `${walletName} can sign shielded sends` };
    case 'starting':
      return { ...base, met: 'pending', label: `Preparing ${walletName} to sign` };
    case 'error':
      return {
        ...base,
        met: false,
        label: `${walletName} could not start signing: ${signer.error}`,
        action: 'Retry from the Helper pill in the top bar',
      };
    default:
      return {
        ...base,
        met: false,
        label: `${walletName} is not started`,
        action: `Start ${walletName}`,
        fix: { label: 'Open wallets', to: WALLETS_URL },
      };
  }
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
