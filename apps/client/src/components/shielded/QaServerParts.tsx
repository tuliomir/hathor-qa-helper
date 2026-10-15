/** Pieces shared by the Shielded stages: the "server is down" callout and the QA server error callout. */

import { useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { Callout } from '../ui/Callout';
import CopyButton from '../common/CopyButton';
import { useAppSelector } from '../../store/hooks';
import { useCheckServerNow } from '../../hooks/useSigner';
import { describeQaServerError, type QaServerErrorInfo } from '../../services/qaServerClient';

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
      <p className="m-0">
        Shielded sends need it: it signs for your shielded-network wallets. Start it from the repo root:
      </p>
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
