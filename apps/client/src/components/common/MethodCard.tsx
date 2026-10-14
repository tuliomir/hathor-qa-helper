/**
 * MethodCard — Compose and Inspect panels for RPC and Snap method stages.
 * Compose holds the inputs and the ExecuteBar; Inspect shows the live
 * request and the outcome (response, dry run, rejection or error). Side by
 * side from 1280px, stacked below.
 *
 * Adapters: useSnapMethod feeds the Snap variant (snap/SnapMethodCard),
 * useRpcMethod the RPC variant.
 */

import React, { useState } from 'react';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { ExecuteBar } from './ExecuteBar';
import { JsonPanel } from './JsonPanel';
import { TxIdDisplay } from './TxIdDisplay';
import { useToast } from '../../hooks/useToast';
import { extractErrorMessage } from '../../utils/errorUtils';
import { safeStringify } from '../../utils/betHelpers';

/** Request/response record, as stored by the method slices. */
export interface MethodData {
  request: { method: string; params: unknown } | null;
  response: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
}

export interface MethodCardProps {
  /** Compose panel title, e.g. "Send transaction". */
  title: string;
  description?: React.ReactNode;
  /** Primary button label; defaults to `title`. */
  actionLabel?: string;
  liveRequest: { method: string; params?: unknown } | null;
  methodData: MethodData | null;
  isDryRun: boolean;
  onExecute: () => Promise<unknown>;
  disabled?: boolean;
  /** Shown next to the disabled primary button (dry run stays enabled). */
  disabledReason?: string | null;
  /** Defaults to the active network (see ExecuteBar). */
  isMainnet?: boolean;
  /** Who the user waits for while running. */
  wallet?: 'MetaMask' | 'wallet';
  isRejection?: (err: unknown) => boolean;
  /** Formatted response view (enables Formatted/Raw). */
  renderResponse?: (response: unknown) => React.ReactNode;
  /** Custom error block for errors thrown in this session (the default is a generic error callout). */
  renderError?: (error: unknown, message: string) => React.ReactNode;
  getTxHash?: (response: unknown) => string | null;
  explorerNetwork?: string;
  requestCaption?: React.ReactNode;
  /** Extra Compose footer actions next to the primary button. */
  secondaryActions?: React.ReactNode;
  /** Extra content at the bottom of the Inspect panel. */
  inspectExtra?: React.ReactNode;
  successToast?: string;
  children: React.ReactNode;
}

function timeOf(ts: number | null) {
  return ts ? new Date(ts).toLocaleTimeString([], { hour12: false }) : '';
}

export function MethodCard({
  title,
  description,
  actionLabel,
  liveRequest,
  methodData,
  isDryRun,
  onExecute,
  disabled = false,
  disabledReason = null,
  isMainnet,
  wallet = 'wallet',
  isRejection,
  renderResponse,
  renderError,
  getTxHash,
  explorerNetwork,
  requestCaption,
  secondaryActions,
  inspectExtra,
  successToast,
  children,
}: MethodCardProps) {
  const { showToast } = useToast();
  const [running, setRunning] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<unknown>(null);
  const [rejected, setRejected] = useState(false);

  const handleExecute = async () => {
    setRunning(true);
    setLocalError(null);
    setRawError(null);
    setRejected(false);
    try {
      await onExecute();
      showToast(isDryRun ? 'Dry run: request generated, not sent' : (successToast ?? `${title} succeeded`), 'success');
    } catch (err) {
      console.error(`[MethodCard:${title}]`, err);
      if (isRejection?.(err)) {
        setRejected(true);
        showToast(`Rejected in ${wallet === 'MetaMask' ? 'MetaMask' : 'the wallet'}`, 'warning');
      } else {
        const msg = extractErrorMessage(err);
        setLocalError(msg);
        setRawError(err);
        showToast(msg, 'error');
      }
    } finally {
      setRunning(false);
    }
  };

  const error = rejected ? null : (localError ?? methodData?.error ?? null);
  const response = methodData?.response ?? null;
  const txHash = response !== null && getTxHash ? getTxHash(response) : null;

  const sent = methodData?.request ?? null;
  // The sent request is only "Sent" while the inputs still produce it.
  const showsSent =
    sent !== null &&
    liveRequest !== null &&
    sent.method === liveRequest.method &&
    safeStringify(sent.params ?? null) === safeStringify(liveRequest.params ?? null);
  let tag = 'Preview';
  let tagTone: 'neutral' | 'dry-run' = 'neutral';
  if (running) tag = 'Sending';
  else if (showsSent && methodData?.isDryRun) {
    tag = 'Dry run';
    tagTone = 'dry-run';
  } else if (showsSent) tag = `Sent ${timeOf(methodData?.timestamp ?? null)}`;

  const waitingFor = wallet === 'MetaMask' ? 'Waiting for MetaMask' : 'Waiting for the wallet';

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <Panel
        title={title}
        description={description}
        footer={
          <ExecuteBar
            label={actionLabel ?? title}
            onExecute={handleExecute}
            isMainnet={isMainnet}
            running={running}
            runningLabel={isDryRun ? 'Generating request…' : `${waitingFor}…`}
            disabledReason={disabled ? (disabledReason ?? 'Not available') : disabledReason}
            secondary={secondaryActions}
          />
        }
      >
        <fieldset disabled={running} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
          {children}
        </fieldset>
      </Panel>

      <Panel title="Inspect" bodyClassName="gap-4">
        {liveRequest ? (
          <JsonPanel
            title="Request"
            tag={tag}
            tagTone={tagTone}
            value={liveRequest}
            collapsible={false}
            caption={requestCaption ?? (showsSent ? undefined : 'Live preview; updates as you edit the inputs.')}
          />
        ) : (
          <p className="m-0 text-body text-ink-muted">Fill in the inputs to see the request.</p>
        )}

        {rejected && (
          <div data-result="rejected">
            <Callout tone="warning" title={`Rejected in ${wallet === 'MetaMask' ? 'MetaMask' : 'the wallet'}`}>
              The prompt was declined. Nothing was sent.
            </Callout>
          </div>
        )}

        {!rejected &&
          error &&
          renderError &&
          rawError !== null &&
          localError !== null &&
          renderError(rawError, localError)}

        {!rejected && error && !(renderError && rawError !== null && localError !== null) && (
          <div data-result="error">
            <Callout tone="error" title="The request failed" role="alert">
              <pre className="m-0 whitespace-pre-wrap break-words font-mono text-data-sm">{error}</pre>
            </Callout>
          </div>
        )}

        {!rejected && !error && methodData?.isDryRun && response === null && showsSent && (
          <div data-result="dry-run">
            <Callout tone="dry-run" title="Dry run">
              Request generated, not sent.
            </Callout>
          </div>
        )}

        {!rejected && !error && response !== null && (
          <div data-result="success" className="flex flex-col gap-3">
            <p className="m-0 text-caption text-ink-muted">
              <span className="font-semibold text-success">Response received</span>
              {methodData?.duration !== null && methodData?.duration !== undefined && ` in ${methodData.duration} ms`}
            </p>
            {txHash && <TxIdDisplay hash={txHash} network={explorerNetwork} />}
            <JsonPanel
              title="Response"
              value={response}
              formatted={renderResponse ? renderResponse(response) : undefined}
            />
          </div>
        )}

        {inspectExtra}
      </Panel>
    </div>
  );
}

export default MethodCard;
