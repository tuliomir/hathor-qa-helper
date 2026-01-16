/**
 * Raw RPC Editor Stage
 *
 * Allows users to send raw JSON RPC requests directly to the wallet
 * with JSON formatting/validation and request/response history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { selectIsWalletConnectConnected } from '../../store/slices/walletConnectSlice';
import {
  setCurrentRequest,
  addHistoryEntry,
  clearHistory,
  removeHistoryEntry,
} from '../../store/slices/rawRpcSlice';
import { clearRawRpcEditorNavigation } from '../../store/slices/navigationSlice';
import { HATHOR_TESTNET_CHAIN } from '../../constants/walletConnect';
import CopyButton from '../common/CopyButton';
import { useToast } from '../../hooks/useToast';

/**
 * Helper function to safely stringify objects containing BigInt values
 */
const safeStringify = (obj: unknown, space?: number): string => {
  return JSON.stringify(
    obj,
    (_, value) => (typeof value === 'bigint' ? value.toString() : value),
    space
  );
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
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const currentRequest = useSelector((state: RootState) => state.rawRpc.currentRequest);
  const history = useSelector((state: RootState) => state.rawRpc.history);
  const navigationData = useSelector((state: RootState) => state.navigation.rawRpcEditor);

  // Local state
  const [loading, setLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [responseExpanded, setResponseExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
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
      setResponseExpanded(true);

      // Add to history
      dispatch(addHistoryEntry({
        request: currentRequest,
        response: responseStr,
        error: null,
        duration,
      }));

      showToast('RPC request successful', 'success');
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      setLastError(errorMessage);
      setResponseExpanded(true);

      // Add to history
      dispatch(addHistoryEntry({
        request: currentRequest,
        response: null,
        error: errorMessage,
        duration,
      }));

      showToast(`RPC request failed: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentRequest, walletConnect.client, walletConnect.session, dispatch, showToast, validateJson]);

  // Load request from history
  const handleLoadFromHistory = useCallback((requestJson: string) => {
    dispatch(setCurrentRequest(requestJson));
    showToast('Request loaded from history', 'success');
  }, [dispatch, showToast]);

  // Toggle history item expansion
  const toggleHistoryItem = useCallback((id: string) => {
    setExpandedHistoryItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Raw RPC Editor</h1>
      <p className="text-muted mb-7.5">
        Send raw JSON RPC requests directly to the wallet
      </p>

      {/* Connection Status Info */}
      {!isConnected && (
        <div className="card-primary mb-7.5 bg-blue-50 border border-info">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-info flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-bold text-blue-900 m-0">Not Connected</p>
              <p className="text-sm text-blue-800 mt-1 mb-0">
                Please connect your wallet in the Connection stage to enable RPC requests.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Editor Section */}
      <div className="card-primary mb-7.5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold m-0">Request JSON</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleValidate}
              className="btn-secondary text-sm px-3 py-1"
            >
              Validate
            </button>
            <button
              onClick={handleFormat}
              className="btn-secondary text-sm px-3 py-1"
            >
              Format
            </button>
            <CopyButton text={currentRequest} label="Copy" />
          </div>
        </div>

        <textarea
          value={currentRequest}
          onChange={(e) => {
            dispatch(setCurrentRequest(e.target.value));
            setJsonError(null);
          }}
          className={`w-full h-64 font-mono text-sm p-3 border rounded resize-y ${
            jsonError ? 'border-danger bg-red-50' : 'border-gray-300 bg-gray-50'
          }`}
          placeholder='{"method": "htr_getWalletInformation", "params": {"network": "testnet"}}'
          spellCheck={false}
        />

        {jsonError && (
          <div className="mt-2 text-sm text-danger flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {jsonError}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExecute}
            disabled={loading || !isConnected}
            className="btn-primary"
          >
            {loading ? 'Executing...' : 'Execute'}
          </button>
        </div>
      </div>

      {/* Response Section */}
      {(lastResponse !== null || lastError !== null) && (
        <div className="card-primary mb-7.5">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setResponseExpanded(!responseExpanded)}
              className="text-base font-bold text-primary hover:text-primary-dark flex items-center gap-2"
            >
              <span>{responseExpanded ? '▼' : '▶'}</span>
              {lastError ? 'Error' : 'Response'}
            </button>
            <CopyButton
              text={lastResponse || lastError || ''}
              label="Copy"
            />
          </div>

          {responseExpanded && (
            <div className="relative">
              {lastError ? (
                <div className="flex items-start gap-2 p-4 bg-red-50 border border-danger rounded">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-danger flex-shrink-0 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-900 break-words m-0">{lastError}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-success">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium">Success</span>
                  </div>
                  <div className="border border-gray-300 rounded p-3 overflow-auto max-h-96 bg-gray-50">
                    <pre className="text-sm font-mono text-left whitespace-pre-wrap break-words m-0">
                      {lastResponse}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Section */}
      <div className="card-primary">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="text-base font-bold text-primary hover:text-primary-dark flex items-center gap-2"
          >
            <span>{historyExpanded ? '▼' : '▶'}</span>
            History ({history.length})
          </button>
          {history.length > 0 && (
            <button
              onClick={() => {
                dispatch(clearHistory());
                showToast('History cleared', 'success');
              }}
              className="text-sm text-danger hover:text-red-700"
            >
              Clear All
            </button>
          )}
        </div>

        {historyExpanded && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted italic">No requests yet</p>
            ) : (
              history.map((entry) => (
                <div
                  key={entry.id}
                  className={`border rounded overflow-hidden ${
                    entry.error ? 'border-danger' : 'border-gray-300'
                  }`}
                >
                  {/* Header */}
                  <div
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer ${
                      entry.error ? 'bg-red-50' : 'bg-gray-100'
                    }`}
                    onClick={() => toggleHistoryItem(entry.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      <span className="text-sm font-mono font-medium">
                        {(() => {
                          try {
                            const parsed = JSON.parse(entry.request);
                            return parsed.method || 'Unknown';
                          } catch {
                            return 'Invalid JSON';
                          }
                        })()}
                      </span>
                      {entry.duration !== null && (
                        <span className="text-xs text-muted">
                          {entry.duration}ms
                        </span>
                      )}
                      {entry.error ? (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-danger rounded">
                          Error
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-success rounded">
                          Success
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadFromHistory(entry.request);
                        }}
                        className="text-xs text-primary hover:text-primary-dark"
                        title="Load this request into editor"
                      >
                        Load
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(removeHistoryEntry(entry.id));
                        }}
                        className="text-xs text-danger hover:text-red-700"
                        title="Remove from history"
                      >
                        Remove
                      </button>
                      <span className="text-muted">
                        {expandedHistoryItems.has(entry.id) ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedHistoryItems.has(entry.id) && (
                    <div className="p-3 space-y-3 bg-white">
                      {/* Request */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-blue-800">Request</span>
                          <CopyButton text={entry.request} label="Copy" />
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded p-2 overflow-auto max-h-40">
                          <pre className="text-xs font-mono text-blue-900 m-0 whitespace-pre-wrap break-words">
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(entry.request), null, 2);
                              } catch {
                                return entry.request;
                              }
                            })()}
                          </pre>
                        </div>
                      </div>

                      {/* Response or Error */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${entry.error ? 'text-red-800' : 'text-green-800'}`}>
                            {entry.error ? 'Error' : 'Response'}
                          </span>
                          <CopyButton text={entry.response || entry.error || ''} label="Copy" />
                        </div>
                        <div className={`border rounded p-2 overflow-auto max-h-40 ${
                          entry.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                        }`}>
                          <pre className={`text-xs font-mono m-0 whitespace-pre-wrap break-words ${
                            entry.error ? 'text-red-900' : 'text-green-900'
                          }`}>
                            {entry.error || entry.response}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
