/**
 * Pieces shared by the Shielded stages: the "server is down" callout, the
 * QA server error callout, and the server-session and client-wallet pickers.
 */

import { useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import type { WalletSession } from '@qa-helper/shared/serverApi';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { StatusChip } from '../ui/StatusChip';
import CopyButton from '../common/CopyButton';
import { CapabilityBadge } from '../common/CapabilityBadge';
import NetworkChip from '../common/NetworkChip';
import { useAppSelector } from '../../store/hooks';
import { isSessionShieldedReady, sessionLabel } from '../../store/slices/qaServerSlice';
import { useCheckServerNow } from '../../hooks/useServerSessions';
import { describeQaServerError, type QaServerErrorInfo } from '../../services/qaServerClient';
import { NETWORK_CONFIG, type NetworkKey } from '../../constants/network';
import { truncateMiddle } from '../../utils/truncate';

const QA_SERVER_START_COMMAND = 'bun run dev:server';

/** Shown while the QA server is not online: what it is for and how to start it. */
export function QaServerDownCallout() {
  const status = useAppSelector((s) => s.helperServer.status);
  const error = useAppSelector((s) => s.helperServer.error);
  const checkNow = useCheckServerNow();
  const [checking, setChecking] = useState(false);
  if (status === 'online') return null;

  if (status === 'idle' || status === 'connecting') {
    return (
      <Callout tone="info" title="Checking the QA server">
        Looking for the local QA server behind the dev proxy.
      </Callout>
    );
  }
  if (status === 'local-only') {
    return (
      <Callout tone="warning" title="The QA server is only reachable from the dev client">
        This build has no dev proxy. Run <code className="font-mono text-data">bun run dev:all</code> from the repo root
        and open the dev client.
      </Callout>
    );
  }

  const check = async () => {
    setChecking(true);
    try {
      await checkNow();
    } finally {
      setChecking(false);
    }
  };

  return (
    <Callout
      tone={status === 'error' ? 'error' : 'warning'}
      title={status === 'error' ? 'The QA server answered with an error' : 'The QA server is not running'}
      action={
        <button type="button" className="btn btn-secondary btn-sm" onClick={check} disabled={checking}>
          {checking ? (
            <span className="loading loading-spinner loading-xs" aria-hidden="true" />
          ) : (
            <MdRefresh aria-hidden="true" />
          )}
          Check again
        </button>
      }
    >
      <p className="m-0">Shielded sends, server balances and server unblinding need it. Start it from the repo root:</p>
      <div className="mt-1.5 flex max-w-md items-center gap-2 rounded-field bg-base-100 px-2 py-1">
        <code className="flex-1 font-mono text-data">{QA_SERVER_START_COMMAND}</code>
        <CopyButton text={QA_SERVER_START_COMMAND} label="Copy command" />
      </div>
      {status === 'error' && error && <p className="m-0 mt-1.5 font-mono text-data-sm">{error}</p>}
    </Callout>
  );
}

/** A failed QA server call: plain title, what to do, and the raw message. */
export function QaServerErrorCallout({ error, title }: { error: QaServerErrorInfo; title?: string }) {
  const d = describeQaServerError(error);
  return (
    <div data-result="error" data-error-code={error.code}>
      <Callout tone="error" title={title ?? d.title} role="alert">
        <div className="flex flex-col gap-1.5">
          {d.hint && <p className="m-0">{d.hint}</p>}
          <div className="flex flex-wrap items-center gap-2 text-caption">
            <span className="rounded-selector bg-base-100 px-1.5 font-mono font-semibold">{error.code}</span>
            {error.status > 0 && <span className="text-ink-muted">HTTP {error.status}</span>}
          </div>
          <pre className="m-0 whitespace-pre-wrap break-words font-mono text-data-sm">{error.message}</pre>
        </div>
      </Callout>
    </div>
  );
}

function sessionOptionLabel(session: WalletSession, labels: Record<string, string>): string {
  const state = session.state === 'ready' ? '' : ` (${session.state})`;
  return `${sessionLabel(session, labels)} · ${NETWORK_CONFIG[session.network].label} · ${truncateMiddle(session.legacyAddress0, 6, 6)}${state}`;
}

export interface SessionPickerProps {
  sessions: WalletSession[];
  labels: Record<string, string>;
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
  hint?: string;
  /** Only offer ready sessions. */
  onlyReady?: boolean;
  id?: string;
}

export function SessionPicker({
  sessions,
  labels,
  value,
  onChange,
  label = 'Server wallet',
  hint,
  onlyReady = false,
  id,
}: SessionPickerProps) {
  const options = onlyReady ? sessions.filter((s) => s.state === 'ready') : sessions;
  const selected = sessions.find((s) => s.id === value) ?? null;
  const emptyHint = sessions.length === 0 ? 'No sessions yet. Start one in QA server.' : 'No ready session yet.';
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={options.length === 0 ? emptyHint : hint}
      trailing={
        selected && (
          <span className="flex items-center gap-2">
            <StatusChip status={selected.state} />
            <CapabilityBadge
              level={selected.capability?.level}
              canCreateShieldedOutputs={isSessionShieldedReady(selected)}
            />
          </span>
        )
      }
    >
      <select
        className="select w-full"
        value={value ?? ''}
        disabled={options.length === 0}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{options.length === 0 ? 'No session available' : 'Choose a server wallet'}</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {sessionOptionLabel(s, labels)}
          </option>
        ))}
      </select>
    </Field>
  );
}

export interface ClientWalletPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
  hint?: string;
  /** Only offer started wallets. */
  onlyReady?: boolean;
  /** Only offer wallets on this network. */
  network?: NetworkKey | null;
  id?: string;
}

export function ClientWalletPicker({
  value,
  onChange,
  label = 'Client wallet',
  hint,
  onlyReady = false,
  network = null,
  id,
}: ClientWalletPickerProps) {
  const wallets = useAppSelector((s) => s.walletStore.wallets);
  const all = Object.values(wallets);
  const options = all.filter(
    (w) => (!onlyReady || w.status === 'ready') && (!network || w.metadata.network === network)
  );
  const selected = value ? wallets[value] : undefined;
  let emptyHint: string | undefined;
  if (options.length === 0) {
    if (all.length === 0) emptyHint = 'No client wallets yet. Add one in Wallet initialization.';
    else if (network) emptyHint = `No ${onlyReady ? 'started ' : ''}client wallet on ${NETWORK_CONFIG[network].label}.`;
    else emptyHint = 'No started client wallet. Start one in Wallet initialization.';
  }
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={emptyHint ?? hint}
      trailing={
        selected && (
          <span className="flex items-center gap-2">
            <NetworkChip network={selected.metadata.network} size="sm" label="short" />
            <StatusChip status={selected.status === 'idle' ? 'stopped' : selected.status} />
          </span>
        )
      }
    >
      <select
        className="select w-full"
        value={value ?? ''}
        disabled={options.length === 0}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{options.length === 0 ? 'No wallet available' : 'Choose a client wallet'}</option>
        {options.map((w) => (
          <option key={w.metadata.id} value={w.metadata.id}>
            {w.metadata.friendlyName} · {NETWORK_CONFIG[w.metadata.network].label} ·{' '}
            {w.status === 'idle' ? 'not started here' : w.status}
          </option>
        ))}
      </select>
    </Field>
  );
}
