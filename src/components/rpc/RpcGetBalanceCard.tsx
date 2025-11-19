/**
 * RPC Get Balance Card Component
 *
 * Card for testing htr_getBalance RPC call
 */

import React, { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';

/**
 * Helper function to safely stringify objects containing BigInt values
 */
const safeStringify = (obj: any, space?: number): string => {
  return JSON.stringify(
    obj,
    (_, value) => (typeof value === 'bigint' ? value.toString() : value),
    space
  );
};

export interface RpcGetBalanceCardProps {
  onExecute: () => Promise<any>;
  disabled?: boolean;
  tokens: Array<{ uid: string; name: string; symbol: string }>;
  isDryRun?: boolean;
}

export const RpcGetBalanceCard: React.FC<RpcGetBalanceCardProps> = ({
  onExecute,
  disabled = false,
  tokens,
  isDryRun = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: any } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(false);
  const { showToast } = useToast();

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRequestInfo(null);

    try {
      const { request, response } = await onExecute();

      // Store request and response separately
      setRequestInfo(request);
      setResult(response);
      setRequestExpanded(true);
      setExpanded(true);

      console.log(`[RPC Request] Get Balance`, request);
      console.log(`[RPC Success] Get Balance`, response);

      showToast(
        isDryRun ? 'Request generated (not sent to RPC)' : 'Get Balance executed successfully',
        'success'
      );
    } catch (err: any) {
      console.error('Error in handleExecute:', err);
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      setExpanded(true);

      // Capture request params from error if available
      if (err.requestParams) {
        setRequestInfo(err.requestParams);
        setRequestExpanded(true);
      }

      console.error(`[RPC Error] Get Balance`, {
        message: errorMessage,
        error: err,
        requestParams: err.requestParams,
      });

      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasResult = result !== null || error !== null;

  // Render result with proper nested object handling
  const renderResult = () => {
    if (!result) return null;

    try {
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

      // Handle arrays
      if (Array.isArray(parsedResult)) {
        if (parsedResult.length === 0) {
          return <div className="text-sm text-muted italic p-3">Empty array</div>;
        }

        return (
          <div className="space-y-4">
            {parsedResult.map((item, idx) => (
              <div key={idx} className="border border-gray-300 rounded">
                <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                  <span className="text-sm font-semibold text-primary">[{idx}]</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {typeof item === 'object' && item !== null ? (
                    <div className="divide-y divide-gray-200">
                      {Object.entries(item).map(([propKey, propValue]) => (
                        <div key={propKey} className="px-3 py-2 flex items-start gap-3">
                          <span className="text-muted text-sm font-medium flex-shrink-0 min-w-[120px]">
                            {propKey}:
                          </span>
                          <span className="text-sm font-mono break-all flex-1 overflow-x-auto">
                            {typeof propValue === 'object'
                              ? safeStringify(propValue, 2)
                              : String(propValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm font-mono">{String(item)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }

      // Handle objects
      const entries = Object.entries(parsedResult);
      if (entries.length === 0) {
        return <div className="text-sm text-muted italic p-3">Empty object</div>;
      }

      return (
        <div className="space-y-4">
          {entries.map(([key, value]) => (
            <div key={key} className="border border-gray-300 rounded">
              <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                <span className="text-sm font-semibold text-primary break-all">{key}</span>
              </div>
              <div className="max-h-64 overflow-y-auto px-3 py-2">
                <span className="text-sm font-mono break-all">
                  {typeof value === 'object' ? safeStringify(value, 2) : String(value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    } catch (e) {
      return (
        <div className="border border-gray-300 rounded p-3 overflow-auto max-h-64">
          <pre className="text-sm font-mono">{String(result)}</pre>
        </div>
      );
    }
  };

  return (
    <>
      {/* Tokens Table */}
      <div className="card-primary mb-7.5">
        <h3 className="text-lg font-bold mb-3">Tokens to Query</h3>
        <p className="text-sm text-muted mb-4">
          The following tokens will be queried for balance information:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-300">
              <tr>
                <th className="text-left py-2 px-3 font-bold">Symbol</th>
                <th className="text-left py-2 px-3 font-bold">Name</th>
                <th className="text-left py-2 px-3 font-bold">UID</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.uid} className="border-b border-gray-200">
                  <td className="py-2 px-3 font-semibold">{token.symbol}</td>
                  <td className="py-2 px-3">{token.name}</td>
                  <td className="py-2 px-3 font-mono text-2xs">{token.uid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execute Button */}
      <div className="card-primary mb-7.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Execute RPC Call</h3>
            <p className="text-sm text-muted mt-1">
              {isDryRun
                ? 'Generate request (will not be sent to RPC server)'
                : 'Send htr_getBalance request to RPC server'}
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
                    <pre className="text-sm font-mono text-blue-900">
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
