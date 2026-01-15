/**
 * RPC Get UTXOs Card Component
 *
 * Card for testing htr_getUtxos RPC call
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import type { UtxoData } from '../../store/slices/getUtxosSlice';

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

export interface RpcGetUtxosCardProps {
  onExecute: () => Promise<{ request: unknown; response: unknown }>;
  disabled?: boolean;
  isDryRun?: boolean;
  // Persisted data from Redux
  initialRequest?: { method: string; params: unknown } | null;
  initialResponse?: unknown | null;
  initialError?: string | null;
}

export const RpcGetUtxosCard: React.FC<RpcGetUtxosCardProps> = ({
  onExecute,
  disabled = false,
  isDryRun = false,
  initialRequest = null,
  initialResponse = null,
  initialError = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: unknown } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(false);
  const { showToast } = useToast();

  // Load persisted data from Redux when component mounts or when initial data changes
  useEffect(() => {
    if (initialRequest) {
      setRequestInfo(initialRequest);
      setRequestExpanded(true);
    }
    if (initialResponse) {
      setResult(initialResponse);
      setExpanded(true);
    }
    if (initialError) {
      setError(initialError);
      setExpanded(true);
    }
  }, [initialRequest, initialResponse, initialError]);

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRequestInfo(null);

    try {
      const { request, response } = await onExecute();

      // Store request and response separately
      setRequestInfo(request as { method: string; params: unknown });
      setResult(response);
      setRequestExpanded(true);
      setExpanded(true);

      console.log(`[RPC Request] Get UTXOs`, request);
      console.log(`[RPC Success] Get UTXOs`, response);

      showToast(
        isDryRun ? 'Request generated (not sent to RPC)' : 'UTXOs retrieved successfully',
        'success'
      );
    } catch (err: unknown) {
      console.error('Error in handleExecute:', err);
      const errorMessage = (err instanceof Error ? err.message : null) || 'An error occurred';
      setError(errorMessage);
      setExpanded(true);

      // Capture request params from error if available
      if (err && typeof err === 'object' && 'requestParams' in err) {
        setRequestInfo(err.requestParams as { method: string; params: unknown });
        setRequestExpanded(true);
      }

      console.error(`[RPC Error] Get UTXOs`, {
        message: errorMessage,
        error: err,
        requestParams: err && typeof err === 'object' && 'requestParams' in err ? err.requestParams : undefined,
      });

      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasResult = result !== null || error !== null;

  // Check if result is a getUtxos response
  const isGetUtxosResponse = (data: unknown): data is {
    type: number;
    response: {
      total_amount_available: string;
      total_utxos_available: string;
      total_amount_locked: string;
      total_utxos_locked: string;
      utxos: UtxoData[];
    }
  } => {
    return !!(
      data &&
      typeof data === 'object' &&
      'type' in data &&
      (data as { type?: number }).type === 5 &&
      'response' in data
    );
  };

  // Render result
  const renderResult = () => {
    if (!result) return null;

    try {
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

      // Special handling for getUtxos response
      if (isGetUtxosResponse(parsedResult)) {
        const response = parsedResult.response;

        return (
          <div className="space-y-4">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-gray-300 rounded p-3">
                <p className="text-xs text-muted mb-1">Total Amount Available</p>
                <p className="text-lg font-bold font-mono m-0">{response.total_amount_available}</p>
              </div>
              <div className="bg-white border border-gray-300 rounded p-3">
                <p className="text-xs text-muted mb-1">Total UTXOs Available</p>
                <p className="text-lg font-bold font-mono m-0">{response.total_utxos_available}</p>
              </div>
              <div className="bg-white border border-gray-300 rounded p-3">
                <p className="text-xs text-muted mb-1">Total Amount Locked</p>
                <p className="text-lg font-bold font-mono m-0">{response.total_amount_locked}</p>
              </div>
              <div className="bg-white border border-gray-300 rounded p-3">
                <p className="text-xs text-muted mb-1">Total UTXOs Locked</p>
                <p className="text-lg font-bold font-mono m-0">{response.total_utxos_locked}</p>
              </div>
            </div>

            {/* UTXOs List */}
            {response.utxos && response.utxos.length > 0 && (
              <div className="bg-white border border-gray-300 rounded overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                  <span className="text-sm font-semibold text-primary">UTXOs ({response.utxos.length})</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {response.utxos.map((utxo, index) => (
                    <div
                      key={`${utxo.tx_id}-${utxo.index}`}
                      className={`p-3 ${index > 0 ? 'border-t border-gray-200' : ''}`}
                    >
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted">Address:</span>
                          <p className="font-mono text-2xs break-all mt-1 mb-0">{utxo.address}</p>
                        </div>
                        <div>
                          <span className="text-muted">Amount:</span>
                          <p className="font-mono font-semibold mt-1 mb-0">{utxo.amount}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted">TX ID:</span>
                          <p className="font-mono text-2xs break-all mt-1 mb-0">{utxo.tx_id}</p>
                        </div>
                        <div>
                          <span className="text-muted">Index:</span>
                          <p className="font-mono mt-1 mb-0">{utxo.index}</p>
                        </div>
                        <div>
                          <span className="text-muted">Status:</span>
                          <p className="mt-1 mb-0">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              utxo.locked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {utxo.locked ? 'Locked' : 'Available'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {response.utxos && response.utxos.length === 0 && (
              <div className="bg-gray-50 border border-gray-300 rounded p-4 text-center">
                <p className="text-muted m-0">No UTXOs found matching the criteria</p>
              </div>
            )}
          </div>
        );
      }

      // Fallback to raw JSON view
      return (
        <div className="border border-gray-300 rounded p-3 overflow-auto max-h-96 bg-gray-50">
          <pre className="text-sm font-mono text-left whitespace-pre-wrap break-words m-0">
            {safeStringify(parsedResult, 2)}
          </pre>
        </div>
      );
    } catch {
      return (
        <div className="border border-gray-300 rounded p-3 overflow-auto max-h-64">
          <pre className="text-sm font-mono">{String(result)}</pre>
        </div>
      );
    }
  };

  return (
    <>
      {/* Execute Button */}
      <div className="card-primary mb-7.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Execute RPC Call</h3>
            <p className="text-sm text-muted mt-1">
              {isDryRun
                ? 'Generate request (will not be sent to RPC server)'
                : 'Send htr_getUtxos request to RPC server'}
            </p>
          </div>
          <button onClick={handleExecute} disabled={loading || disabled} className="btn-primary">
            {loading ? 'Loading...' : 'Execute'}
          </button>
        </div>
      </div>

      {/* Request Info Section */}
      {requestInfo && (
        <div className="card-primary mb-7.5">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setRequestExpanded(!requestExpanded)}
              className="text-base font-bold text-primary hover:text-primary-dark flex items-center gap-2"
            >
              <span>{requestExpanded ? '▼' : '▶'}</span>
              Request
            </button>
            <CopyButton
              text={safeStringify(requestInfo, 2)}
              label="Copy request"
            />
          </div>

          {requestExpanded && (
            <div className="bg-blue-50 border border-blue-300 rounded p-4">
              <div className="space-y-3">
                <div className="bg-white border border-blue-200 rounded overflow-hidden">
                  <div className="bg-blue-100 px-3 py-2 border-b border-blue-200">
                    <span className="text-sm font-semibold text-blue-800">method</span>
                  </div>
                  <div className="px-3 py-2">
                    <span className="text-sm font-mono text-blue-900">{requestInfo.method}</span>
                  </div>
                </div>
                <div className="bg-white border border-blue-200 rounded overflow-hidden">
                  <div className="bg-blue-100 px-3 py-2 border-b border-blue-200">
                    <span className="text-sm font-semibold text-blue-800">params</span>
                  </div>
                  <div className="px-3 py-2 max-h-64 overflow-y-auto">
                    <pre className="text-sm font-mono text-blue-900 text-left whitespace-pre-wrap break-words m-0">
                      {safeStringify(requestInfo.params, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Response Section */}
      {hasResult && (
        <div className="card-primary mb-7.5">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-base font-bold text-primary hover:text-primary-dark flex items-center gap-2"
            >
              <span>{expanded ? '▼' : '▶'}</span>
              {error ? 'Error Details' : 'Response'}
            </button>
            <CopyButton
              text={result ? safeStringify(result, 2) : error || ''}
              label="Copy response"
            />
          </div>

          {expanded && (
            <div className="relative">
              {isDryRun && result === null ? (
                <div className="bg-purple-50 border border-purple-300 rounded p-4">
                  <div className="flex items-center gap-2 text-purple-700 mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                    </svg>
                    <span className="text-sm font-medium">Dry Run Mode</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    The request was generated but not sent to the RPC server. Check the Request
                    section above to see the parameters that would be sent.
                  </p>
                </div>
              ) : (
                <>
                  {error ? (
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
                      <p className="text-sm text-red-900 break-words">{error}</p>
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
                      {renderResult()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
