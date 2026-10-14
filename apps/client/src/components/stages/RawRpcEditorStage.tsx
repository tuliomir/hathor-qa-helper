/**
 * Raw RPC Editor Stage
 *
 * Allows users to send raw JSON RPC requests directly to the wallet
 * with JSON formatting/validation and request/response history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setCurrentRequest, addHistoryEntry, clearHistory, removeHistoryEntry } from '../../store/slices/rawRpcSlice';
import { clearRawRpcEditorNavigation } from '../../store/slices/navigationSlice';
import { HATHOR_TESTNET_CHAIN } from '../../constants/walletConnect';
import { MdChevronRight, MdExpandMore } from 'react-icons/md';
import { useToast } from '../../hooks/useToast';
import { useRequireRpcSession } from '../../hooks/useRequirements';
import { firstUnmetReason } from '../../utils/requirements';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { ExecuteBar } from '../common/ExecuteBar';
import { JsonPanel } from '../common/JsonPanel';
import { Panel } from '../ui/Panel';
import { Field } from '../ui/Field';
import { Callout } from '../ui/Callout';
import { EmptyState } from '../ui/EmptyState';
import { StatusChip } from '../ui/StatusChip';

/**
 * Helper function to safely stringify objects containing BigInt values
 */
const safeStringify = (obj: unknown, space?: number): string => {
  return JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), space);
};

/**
 * Format timestamp to readable date/time
 */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const RawRpcEditorStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const rpcSession = useRequireRpcSession();
  const currentRequest = useSelector((state: RootState) => state.rawRpc.currentRequest);
  const history = useSelector((state: RootState) => state.rawRpc.history);
  const navigationData = useSelector((state: RootState) => state.navigation.rawRpcEditor);

  // Local state
  const [loading, setLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const [expandedHistoryItems, setExpandedHistoryItems] = useState<Set<string>>(new Set());

  // Handle navigation data (when sent from another stage)
  useEffect(() => {
    if (navigationData.requestJson) {
      dispatch(setCurrentRequest(navigationData.requestJson));
      dispatch(clearRawRpcEditorNavigation());
      showToast('Request loaded from RPC card', 'success');
    }
  }, [navigationData.requestJson, dispatch, showToast]);

  // Validate JSON
  const validateJson = useCallback((json: string): { valid: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.method || typeof parsed.method !== 'string') {
        return { valid: false, error: 'JSON must have a "method" field (string)' };
      }
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
    }
  }, []);

  // Format JSON
  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(currentRequest);
      const formatted = JSON.stringify(parsed, null, 2);
      dispatch(setCurrentRequest(formatted));
      setJsonError(null);
      showToast('JSON formatted successfully', 'success');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Invalid JSON';
      setJsonError(errorMsg);
      showToast(`Format failed: ${errorMsg}`, 'error');
    }
  }, [currentRequest, dispatch, showToast]);

  // Validate JSON on demand
  const handleValidate = useCallback(() => {
    const result = validateJson(currentRequest);
    if (result.valid) {
      setJsonError(null);
      showToast('JSON is valid', 'success');
    } else {
      setJsonError(result.error || 'Invalid JSON');
      showToast(`Validation failed: ${result.error}`, 'error');
    }
  }, [currentRequest, validateJson, showToast]);

  // Execute RPC request
  const handleExecute = useCallback(async () => {
    // Validate first
    const validation = validateJson(currentRequest);
    if (!validation.valid) {
      setJsonError(validation.error || 'Invalid JSON');
      showToast(`Cannot execute: ${validation.error}`, 'error');
      return;
    }

    if (!walletConnect.client || !walletConnect.session) {
      showToast('WalletConnect not connected', 'error');
      return;
    }

    setLoading(true);
    setLastResponse(null);
    setLastError(null);
    setJsonError(null);

    const startTime = Date.now();

    try {
      const requestParams = JSON.parse(currentRequest);

      const result = await walletConnect.client.request({
        topic: walletConnect.session.topic,
        chainId: HATHOR_TESTNET_CHAIN,
        request: requestParams,
      });

      const duration = Date.now() - startTime;
      const responseStr = safeStringify(result, 2);

      setLastResponse(responseStr);
      setLastDuration(duration);

      // Add to history
      dispatch(
        addHistoryEntry({
          request: currentRequest,
          response: responseStr,
          error: null,
          duration,
        })
      );

      showToast('Request sent', 'success');
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      setLastError(errorMessage);
      setLastDuration(duration);

      // Add to history
      dispatch(
        addHistoryEntry({
          request: currentRequest,
          response: null,
          error: errorMessage,
          duration,
        })
      );

      showToast(`RPC request failed: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentRequest, walletConnect.client, walletConnect.session, dispatch, showToast, validateJson]);

  // Load request from history
  const handleLoadFromHistory = useCallback(
    (requestJson: string) => {
      dispatch(setCurrentRequest(requestJson));
      showToast('Request loaded from history', 'success');
    },
    [dispatch, showToast]
  );

  // Toggle history item expansion
  const toggleHistoryItem = useCallback((id: string) => {
    setExpandedHistoryItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const methodOf = (json: string) => {
    try {
      return JSON.parse(json).method || 'Unknown';
    } catch {
      return 'Invalid JSON';
    }
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="rpc-raw-editor" description="Send a raw JSON request to the connected wallet." />
      <PreconditionStrip requirements={[rpcSession]} />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Panel
          title="Request"
          footer={
            <ExecuteBar
              label="Send request"
              onExecute={handleExecute}
              showDryRun={false}
              running={loading}
              runningLabel="Waiting for the wallet…"
              disabledReason={firstUnmetReason([rpcSession])}
              secondary={
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleValidate}>
                    Validate
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleFormat}>
                    Format
                  </button>
                </>
              }
            />
          }
        >
          <Field
            label="Request JSON"
            hint='Needs a "method". Sent as-is; dry run does not apply here.'
            error={jsonError}
          >
            <textarea
              value={currentRequest}
              onChange={(e) => {
                dispatch(setCurrentRequest(e.target.value));
                setJsonError(null);
              }}
              className={`textarea h-64 w-full resize-y font-mono text-data ${jsonError ? 'textarea-error' : ''}`}
              placeholder='{"method": "htr_getWalletInformation", "params": {"network": "testnet"}}'
              spellCheck={false}
            />
          </Field>
        </Panel>

        <Panel title="Response" bodyClassName="gap-4">
          {lastError !== null && (
            <div data-result="error">
              <Callout tone="error" title="The request failed" role="alert">
                <pre className="m-0 whitespace-pre-wrap break-words font-mono text-data-sm">{lastError}</pre>
              </Callout>
            </div>
          )}
          {lastResponse !== null && (
            <div data-result="success" className="flex flex-col gap-3">
              <p className="m-0 text-caption text-ink-muted">
                <span className="font-semibold text-success">Response received</span>
                {lastDuration !== null && ` in ${lastDuration} ms`}
              </p>
              <JsonPanel title="Response" value={lastResponse} collapsible={false} />
            </div>
          )}
          {lastError === null && lastResponse === null && (
            <EmptyState>The wallet's response appears here after you send a request.</EmptyState>
          )}
        </Panel>
      </div>

      <Panel
        title={`History (${history.length})`}
        actions={
          history.length === 0 ? undefined : (
            <button
              type="button"
              className="btn btn-ghost btn-xs text-error"
              onClick={() => {
                dispatch(clearHistory());
                showToast('History cleared', 'success');
              }}
            >
              Clear all
            </button>
          )
        }
      >
        {history.length === 0 ? (
          <EmptyState>Sent requests and their responses appear here.</EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-base-300 p-0">
            {history.map((entry) => {
              const open = expandedHistoryItems.has(entry.id);
              return (
                <li key={entry.id} className="flex flex-col gap-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button
                      type="button"
                      className="inline-flex min-w-0 items-center gap-1.5 rounded-field text-left hover:text-primary"
                      aria-expanded={open}
                      onClick={() => toggleHistoryItem(entry.id)}
                    >
                      {open ? <MdExpandMore aria-hidden="true" /> : <MdChevronRight aria-hidden="true" />}
                      <span className="font-mono text-data">{methodOf(entry.request)}</span>
                    </button>
                    <span className="text-caption text-ink-muted">{formatTimestamp(entry.timestamp)}</span>
                    {entry.duration !== null && (
                      <span className="text-caption text-ink-muted">{entry.duration} ms</span>
                    )}
                    <StatusChip
                      status={entry.error ? 'error' : 'ready'}
                      label={entry.error ? 'Error' : 'Success'}
                      tone={entry.error ? 'error' : 'success'}
                    />
                    <span className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleLoadFromHistory(entry.request)}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => dispatch(removeHistoryEntry(entry.id))}
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                  {open && (
                    <div className="flex flex-col gap-3 pl-5">
                      <JsonPanel title="Request" value={entry.request} collapsible={false} />
                      {entry.error ? (
                        <Callout tone="error" title="Error">
                          <pre className="m-0 whitespace-pre-wrap break-words font-mono text-data-sm">
                            {entry.error}
                          </pre>
                        </Callout>
                      ) : (
                        <JsonPanel title="Response" value={entry.response} collapsible={false} />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
};
