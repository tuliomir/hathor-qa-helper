/**
 * The single answer to "what state is this wallet in?" for the UI. Every
 * wallet row derives its status chip, error line and start/stop action from
 * here, so they can't disagree. The network shown next to a wallet is its
 * configured network; only `isLive` says whether it is connected to it.
 */

import type { WalletStatus } from '../types/wallet';
import type { StatusTone } from './statusTone';

export type WalletAction = 'start' | 'stop' | 'force-stop' | 'none';

export interface WalletRuntimeView {
  label: string;
  tone: StatusTone;
  /** Human reason for a failed start, or null. */
  detail: string | null;
  /** The error as wallet-lib reported it, for a tooltip. */
  rawError: string | null;
  action: WalletAction;
  /** A wallet instance exists (starting or running). */
  isLive: boolean;
}

const VIEWS: Record<WalletStatus, Pick<WalletRuntimeView, 'label' | 'tone' | 'action' | 'isLive'>> = {
  idle: { label: 'Stopped', tone: 'idle', action: 'start', isLive: false },
  connecting: { label: 'Connecting', tone: 'progress', action: 'force-stop', isLive: true },
  syncing: { label: 'Syncing', tone: 'progress', action: 'force-stop', isLive: true },
  ready: { label: 'Ready', tone: 'success', action: 'stop', isLive: true },
  error: { label: 'Failed to start', tone: 'error', action: 'start', isLive: false },
  'address-only': { label: 'Address only', tone: 'info', action: 'none', isLive: false },
};

export function walletRuntimeView(wallet: { status: WalletStatus; error?: string }): WalletRuntimeView {
  const rawError = wallet.status === 'error' ? (wallet.error ?? null) : null;
  return {
    ...VIEWS[wallet.status],
    rawError,
    detail: rawError === null ? null : describeStartError(rawError),
  };
}

/** Rewrites wallet-lib/axios start failures into words a tester can act on. */
export function describeStartError(message: string): string {
  const timeout = /timeout of (\d+)ms exceeded/i.exec(message);
  if (timeout) return `Full node didn't answer within ${Number(timeout[1]) / 1000}s`;
  if (/^network error$/i.test(message.trim())) return "Couldn't reach the full node";
  return message;
}
