/**
 * HelperServerPill
 *
 * Status of the local QA ("helper") server, which creates shielded outputs
 * for the browser. Only shielded-sending stages need it; nothing blocks on it.
 */

import { useEffect, useState } from 'react';
import { QA_SERVER_PROXY_PREFIX } from '@qa-helper/shared/serverApi';
import { useAppSelector } from '../../store/hooks';
import type { HelperServerStatus } from '../../store/slices/helperServerSlice';
import { useHelperServerHealth } from '../../hooks/useHelperServerHealth';
import CopyButton from '../common/CopyButton';
import { StatusDot } from '../ui/StatusDot';
import type { StatusTone } from '../../utils/statusTone';
import { POPOVER_PANEL_CLASS, usePopover } from '../ui/usePopover';

const START_COMMAND = 'bun run dev:server';

const PILL: Record<HelperServerStatus, { tone: StatusTone; label: string; name: string }> = {
  idle: { tone: 'progress', label: 'Helper', name: 'Helper server: connecting' },
  connecting: { tone: 'progress', label: 'Helper', name: 'Helper server: connecting' },
  online: { tone: 'success', label: 'Helper', name: 'Helper server: connected' },
  offline: { tone: 'idle', label: 'Helper offline', name: 'Helper server: not running' },
  error: { tone: 'error', label: 'Helper error', name: 'Helper server: error' },
  'local-only': { tone: 'idle', label: 'Helper: local only', name: 'Helper server: local only' },
};

function useNow(intervalMs: number, active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, active]);
  return now;
}

function ago(now: number, then: number | null): string {
  if (then === null) return 'never';
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return `${seconds} s ago`;
  return `${Math.round(seconds / 60)} min ago`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="m-0 font-mono text-data-sm">{children}</dd>
    </>
  );
}

function StartHint() {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0">Start it from the repo root:</p>
      <div className="flex items-center gap-2 rounded-field bg-base-200 px-2 py-1">
        <code className="font-mono text-data flex-1">{START_COMMAND}</code>
        <CopyButton text={START_COMMAND} label="Copy command" />
      </div>
    </div>
  );
}

export default function HelperServerPill() {
  const { retry } = useHelperServerHealth();
  const state = useAppSelector((s) => s.helperServer);
  const { open, toggle, triggerRef, panelRef } = usePopover();
  const now = useNow(1000, open);
  const pill = PILL[state.status];
  const url = `${globalThis.location?.origin ?? ''}${QA_SERVER_PROXY_PREFIX}`;

  return (
    <div className="relative flex-none">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={pill.name}
        onClick={toggle}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-base-300 bg-base-100 text-body whitespace-nowrap hover:bg-base-200"
      >
        <StatusDot tone={pill.tone} />
        <span className="hidden md:inline">{pill.label}</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Helper server"
          className={`${POPOVER_PANEL_CLASS} top-full right-0 w-[min(340px,calc(100vw-1rem))] p-3 flex flex-col gap-3 text-body`}
        >
          <div className="flex items-center gap-2">
            <StatusDot tone={pill.tone} />
            <span className="font-semibold">{pill.name.replace('Helper server: ', 'Helper server ')}</span>
          </div>
          <p className="m-0 text-ink-muted">
            The local QA server creates shielded outputs, which browsers cannot. Only shielded sends need it.
          </p>

          {state.status === 'online' && (
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <Row label="URL">{url}</Row>
              <Row label="Version">{state.version}</Row>
              <Row label="Latency">{state.latencyMs !== null ? `${state.latencyMs} ms` : 'n/a'}</Row>
              <Row label="Heartbeat">{ago(now, state.lastSeen)}</Row>
              <Row label="Wallets">{state.sessions ?? 0}</Row>
            </dl>
          )}

          {(state.status === 'idle' || state.status === 'connecting') && (
            <p className="m-0">
              Connecting to <span className="font-mono text-data whitespace-nowrap">{url}</span>
            </p>
          )}

          {state.status === 'offline' && (
            <>
              <p className="m-0">
                Not running at <span className="font-mono text-data whitespace-nowrap">{url}</span>.
              </p>
              <StartHint />
            </>
          )}

          {state.status === 'error' && (
            <>
              <p className="m-0">The server answered, but not as expected.</p>
              <pre className="m-0 whitespace-pre-wrap rounded-field bg-base-200 px-2 py-1 font-mono text-data-sm">
                {state.error}
              </pre>
              <StartHint />
            </>
          )}

          {state.status === 'local-only' && (
            <p className="m-0">
              It runs next to a local dev build only (<span className="font-mono text-data">bun run dev:all</span>).
              This deployment cannot reach it.
            </p>
          )}

          {state.status !== 'local-only' && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption text-ink-muted">Last check {ago(now, state.lastChecked)}</span>
              <button type="button" className="btn btn-sm btn-secondary" onClick={retry}>
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
