/**
 * WalletContextBar
 *
 * One segment per role, in fixed order: Test wallet, Funding wallet, RPC
 * session, Snap. A segment shows a network chip only when its network differs
 * from the active one, and its dot turns to warning.
 *
 * Variants: `bar` (top bar, 1280px and up), `compact` (a "Context" button
 * with the dots, 768–1279px) and `stacked` (inside the navigation drawer).
 */

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectActiveNetwork } from '../../store/slices/networkSlice';
import { stopWallet } from '../../store/slices/walletStoreSlice';
import { useStage } from '../../hooks/useStage';
import { useToast } from '../../hooks/useToast';
import { formatBalance } from '../../utils/balanceUtils';
import { resolveNetworkKey } from '../../utils/networkHelpers';
import type { NetworkKey } from '../../constants/network';
import type { WalletStatus } from '../../types/wallet';
import NetworkChip from '../common/NetworkChip';
import ShieldedCapabilityBadge from '../common/ShieldedCapabilityBadge';
import { StatusDot } from '../ui/StatusDot';
import type { StatusTone } from '../../utils/statusTone';
import { useRpcStatus, useSnapStatus } from './connectionStatus';
import { MENU_ITEM_CLASS, POPOVER_PANEL_CLASS, usePopover } from '../ui/usePopover';

type Variant = 'bar' | 'compact' | 'stacked';

const WALLET_STATUS: Record<WalletStatus, { tone: StatusTone; word: string }> = {
  idle: { tone: 'idle', word: 'Stopped' },
  connecting: { tone: 'progress', word: 'Connecting' },
  syncing: { tone: 'progress', word: 'Syncing' },
  ready: { tone: 'success', word: 'Ready' },
  error: { tone: 'error', word: 'Error' },
};

const SEGMENT_CLASS = {
  bar: 'flex items-center gap-1.5 h-8 px-2.5 border-l border-base-300 first:border-l-0 whitespace-nowrap hover:bg-base-200 min-w-0',
  stacked:
    'flex flex-wrap items-center gap-x-1.5 gap-y-1 w-full min-h-8 px-2 py-1 rounded-field text-left hover:bg-base-300',
} as const;

function useWalletSegment(role: 'test' | 'funding') {
  const id = useAppSelector((s) =>
    role === 'test' ? s.walletSelection.testWalletId : s.walletSelection.fundingWalletId
  );
  const wallet = useAppSelector((s) => (id ? s.walletStore.wallets[id] : undefined));
  return { id, wallet };
}

/** Status with a network-mismatch override. */
function withMismatch(tone: StatusTone, network: NetworkKey | null, active: NetworkKey): StatusTone {
  return network && network !== active ? 'warning' : tone;
}

function MismatchChip({ network, active }: { network: NetworkKey | null; active: NetworkKey }) {
  if (!network || network === active) return null;
  return <NetworkChip network={network} label="short" size="sm" />;
}

function WalletSegment({ role, variant }: { role: 'test' | 'funding'; variant: 'bar' | 'stacked' }) {
  const dispatch = useAppDispatch();
  const { setCurrentStage } = useStage();
  const { success } = useToast();
  const active = useAppSelector(selectActiveNetwork);
  const { id, wallet } = useWalletSegment(role);
  const { open, toggle, close, triggerRef, panelRef } = usePopover();
  const roleLabel = role === 'test' ? 'Test' : 'Funding';

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open, panelRef]);

  if (!id || !wallet) {
    return (
      <button
        type="button"
        onClick={() => setCurrentStage('wallet-initialization')}
        className={`${SEGMENT_CLASS[variant]} text-ink-muted`}
      >
        <span className="text-caption">{roleLabel} wallet:</span> none
      </button>
    );
  }

  const network = wallet.metadata.network;
  const status = WALLET_STATUS[wallet.status];
  const tone = withMismatch(status.tone, network, active);
  const mismatch = network !== active;
  const name = wallet.metadata.friendlyName;

  const go = (stage: Parameters<typeof setCurrentStage>[0]) => {
    close();
    setCurrentStage(stage);
  };

  return (
    <div className={`relative ${variant === 'bar' ? 'flex' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        title={mismatch ? `${roleLabel} wallet on ${network}; app on ${active}` : undefined}
        className={SEGMENT_CLASS[variant]}
      >
        <span className="text-caption text-ink-muted">{roleLabel}</span>
        <span className="font-semibold truncate max-w-[14ch]">{name}</span>
        <span className="inline-flex items-center gap-1 text-caption">
          <StatusDot tone={tone} />
          {status.word}
        </span>
        {wallet.status === 'ready' && wallet.balance !== undefined && (
          <span className={`font-mono text-data ${variant === 'bar' ? 'hidden 2xl:inline' : ''}`}>
            {formatBalance(wallet.balance)} HTR
          </span>
        )}
        <MismatchChip network={network} active={active} />
        {active === 'SHIELDED_TESTNET' && <ShieldedCapabilityBadge capability={wallet.shieldedCapability} />}
      </button>
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={`${roleLabel} wallet`}
          className={`${POPOVER_PANEL_CLASS} top-full left-0 w-64`}
        >
          {mismatch && (
            <p className="m-0 px-2 py-1.5 text-caption text-warning-ink">
              {roleLabel} wallet on {network}; app on {active}.
            </p>
          )}
          {wallet.firstAddress && (
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={() => {
                void navigator.clipboard?.writeText(wallet.firstAddress!);
                success(`${roleLabel} address 0 copied`);
                close(true);
              }}
            >
              Copy address 0
            </button>
          )}
          <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => go('transaction-history')}>
            Transaction history
          </button>
          <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => go('wallet-initialization')}>
            Wallet initialization
          </button>
          {wallet.status !== 'idle' && (
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={() => {
                close(true);
                void dispatch(stopWallet(id));
              }}
            >
              Stop wallet
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SessionSegment({ kind, variant }: { kind: 'rpc' | 'snap'; variant: 'bar' | 'stacked' }) {
  const { setCurrentStage } = useStage();
  const active = useAppSelector(selectActiveNetwork);
  const rpc = useRpcStatus();
  const snap = useSnapStatus();
  const rpcChain = useAppSelector((s) => s.walletConnect.chains?.[0] ?? null);

  const status = kind === 'rpc' ? rpc : snap;
  const rawNetwork = kind === 'rpc' ? (rpcChain?.split(':')[1] ?? null) : snap.network;
  const network = status.tone === 'success' ? resolveNetworkKey(rawNetwork) : null;
  const tone = withMismatch(status.tone, network, active);
  const label = kind === 'rpc' ? 'RPC' : 'Snap';
  const detail =
    network && network !== active ? `${status.detail}. ${label} on ${network}; app on ${active}` : status.detail;

  return (
    <button
      type="button"
      title={detail}
      aria-label={`${label}: ${detail}`}
      onClick={() => setCurrentStage(kind === 'rpc' ? 'rpc-connection' : 'snap-connection')}
      className={SEGMENT_CLASS[variant]}
    >
      <span className="text-caption text-ink-muted">{label}</span>
      <span className="inline-flex items-center gap-1 text-caption">
        <StatusDot tone={tone} />
        {status.word}
      </span>
      <MismatchChip network={network} active={active} />
    </button>
  );
}

function Segments({ variant }: { variant: 'bar' | 'stacked' }) {
  return (
    <>
      <WalletSegment role="test" variant={variant} />
      <WalletSegment role="funding" variant={variant} />
      <SessionSegment kind="rpc" variant={variant} />
      <SessionSegment kind="snap" variant={variant} />
    </>
  );
}

/** Dots for the compact "Context" button: test, funding, RPC, snap. */
function useContextTones(): StatusTone[] {
  const active = useAppSelector(selectActiveNetwork);
  const test = useWalletSegment('test').wallet;
  const funding = useWalletSegment('funding').wallet;
  const rpc = useRpcStatus();
  const snap = useSnapStatus();
  const walletTone = (w: typeof test) =>
    w ? withMismatch(WALLET_STATUS[w.status].tone, w.metadata.network, active) : 'idle';
  const snapNetwork = snap.tone === 'success' ? resolveNetworkKey(snap.network) : null;
  return [walletTone(test), walletTone(funding), rpc.tone, withMismatch(snap.tone, snapNetwork, active)];
}

function CompactContext() {
  const tones = useContextTones();
  const { open, toggle, triggerRef, panelRef } = usePopover();

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Wallet context"
        onClick={toggle}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-field whitespace-nowrap hover:bg-base-200"
      >
        <span className="text-caption text-ink-muted">Context</span>
        {tones.map((tone, i) => (
          <StatusDot key={i} tone={tone} />
        ))}
      </button>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Wallet context"
          className={`${POPOVER_PANEL_CLASS} top-full left-0 w-80 flex flex-col gap-0.5`}
        >
          <Segments variant="stacked" />
        </div>
      )}
    </div>
  );
}

export default function WalletContextBar({ variant }: { variant: Variant }) {
  if (variant === 'compact') return <CompactContext />;
  if (variant === 'stacked') {
    return (
      <div role="group" aria-label="Wallet context" className="flex flex-col gap-0.5">
        <Segments variant="stacked" />
      </div>
    );
  }
  return (
    <div role="group" aria-label="Wallet context" className="flex items-center min-w-0">
      <Segments variant="bar" />
    </div>
  );
}
