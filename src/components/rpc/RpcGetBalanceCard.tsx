/**
 * RPC Get Balance Card Component
 *
 * Card for testing htr_getBalance RPC call
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { useToast } from '../../hooks/useToast';

export interface RpcGetBalanceCardProps {
  onExecute: () => Promise<any>;
  disabled?: boolean;
  balanceTokens: string[];
  setBalanceTokens: (tokens: string[]) => void;
  isDryRun?: boolean;
}

export const RpcGetBalanceCard: React.FC<RpcGetBalanceCardProps> = ({
  onExecute,
  disabled = false,
  balanceTokens,
  setBalanceTokens,
  isDryRun = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: any } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(false);
  const { showToast } = useToast();

  // Get known tokens from Redux
  const knownTokens = useSelector((state: RootState) => state.tokens.tokens);

  const handleAddToken = () => {
    setBalanceTokens([...balanceTokens, '']);
  };

  const handleRemoveToken = (index: number) => {
    const newTokens = balanceTokens.filter((_, i) => i !== index);
    setBalanceTokens(newTokens);
  };

  const handleTokenChange = (index: number, value: string) => {
    const newTokens = [...balanceTokens];
    newTokens[index] = value;
    setBalanceTokens(newTokens);
  };

  const handleImportKnownTokens = () => {
    const knownTokenIds = knownTokens.map((t) => t.uid);
    if (knownTokenIds.length > 0) {
      // Merge with existing tokens, avoiding duplicates
      const existingTokens = new Set(balanceTokens.filter((t) => t.trim() !== ''));
      const newTokens = knownTokenIds.filter((id) => !existingTokens.has(id));

      if (newTokens.length > 0) {
        setBalanceTokens([...balanceTokens.filter((t) => t.trim() !== ''), ...newTokens]);
        showToast('Tokens imported', 'success');
      } else {
        showToast('No new tokens to import', 'info');
      }
    }
  };

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

  const availableToImport = knownTokens.filter((token) => !balanceTokens.includes(token.uid))
    .length;

  const hasResult = result !== null || error !== null;

  const handleCopyRequest = () => {
    navigator.clipboard.writeText(JSON.stringify(requestInfo, null, 2));
    showToast('Request copied to clipboard', 'success');
  };

  const handleCopyResponse = () => {
    const textToCopy = result ? JSON.stringify(result, null, 2) : error || '';
    navigator.clipboard.writeText(textToCopy);
    showToast('Response copied to clipboard', 'success');
  };

  // Render result with proper nested object handling
  const renderResult = () => {
    if (!result) return null;

    try {
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

      // Handle arrays
      if (Array.isArray(parsedResult)) {
        if (parsedResult.length === 0) {
          return <div className="text-sm text-gray-400 italic p-3">Empty array</div>;
        }

        return (
          <div className="space-y-3">
            {parsedResult.map((item, idx) => (
              <div key={idx} className="bg-base-300 rounded-lg overflow-hidden">
                <div className="bg-base-200 px-3 py-2 border-b border-base-content/10">
                  <span className="text-sm font-semibold text-primary">[{idx}]</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {typeof item === 'object' && item !== null ? (
                    <div className="divide-y divide-base-content/10">
                      {Object.entries(item).map(([propKey, propValue]) => (
                        <div key={propKey} className="px-3 py-2 flex items-start gap-3">
                          <span className="text-gray-400 text-sm font-medium flex-shrink-0 min-w-[120px]">
                            {propKey}:
                          </span>
                          <span className="text-sm font-mono text-gray-300 break-all flex-1 overflow-x-auto">
                            {typeof propValue === 'object'
                              ? JSON.stringify(propValue, null, 2)
                              : String(propValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm font-mono text-gray-300">
                      {String(item)}
                    </div>
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
        return <div className="text-sm text-gray-400 italic p-3">Empty object</div>;
      }

      return (
        <div className="space-y-3">
          {entries.map(([key, value]) => (
            <div key={key} className="bg-base-300 rounded-lg overflow-hidden">
              <div className="bg-base-200 px-3 py-2 border-b border-base-content/10">
                <span className="text-sm font-semibold text-primary break-all">{key}</span>
              </div>
              <div className="max-h-64 overflow-y-auto px-3 py-2">
                <span className="text-sm font-mono text-gray-300 break-all">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    } catch (e) {
      return (
        <div className="bg-base-300 rounded-lg p-3 overflow-auto max-h-64">
          <pre className="text-sm font-mono text-gray-300">{String(result)}</pre>
        </div>
      );
    }
  };

  return (
    <div
      className={`card bg-base-100 shadow-xl border ${
        error ? 'border-error' : 'border-base-300'
      } hover:border-primary transition-colors`}
    >
      <div className="card-body">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title text-lg">Get Balance</h3>
              {isDryRun && (
                <span className="badge badge-secondary badge-sm gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  DRY RUN
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Get balances for specified tokens
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">
                <span className="label-text font-medium">Token IDs</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleImportKnownTokens}
                  className="btn btn-xs btn-outline"
                  disabled={availableToImport === 0}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Import Known{availableToImport > 0 && ` (${availableToImport})`}
                </button>
                <button onClick={handleAddToken} className="btn btn-xs btn-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Add Token
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {balanceTokens.map((token, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => handleTokenChange(index, e.target.value)}
                    placeholder="Token ID (e.g., 00 for HTR)"
                    className="input input-bordered input-sm flex-1"
                  />
                  {balanceTokens.length > 1 && (
                    <button
                      onClick={() => handleRemoveToken(index)}
                      className="btn btn-sm btn-square btn-ghost text-error"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleExecute} disabled={loading || disabled} className="btn btn-primary btn-sm">
            {loading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Loading
              </>
            ) : (
              'Execute'
            )}
          </button>

          {/* Request Info Section - Blue */}
          {requestInfo && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setRequestExpanded(!requestExpanded)}
                  className="text-sm font-medium text-info hover:text-info-focus flex items-center gap-1"
                >
                  <span>{requestExpanded ? '▼' : '▶'}</span>
                  Request
                </button>
                <button
                  onClick={handleCopyRequest}
                  className="btn btn-xs btn-ghost"
                  title="Copy request"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>

              {requestExpanded && (
                <div className="bg-info/10 border border-info/50 rounded-lg p-3">
                  <div className="space-y-2">
                    <div className="bg-info/5 border border-info/30 rounded overflow-hidden">
                      <div className="bg-info/10 px-3 py-2 border-b border-info/30">
                        <span className="text-sm font-semibold text-info">method</span>
                      </div>
                      <div className="px-3 py-2">
                        <span className="text-sm font-mono text-info">{requestInfo.method}</span>
                      </div>
                    </div>
                    <div className="bg-info/5 border border-info/30 rounded overflow-hidden">
                      <div className="bg-info/10 px-3 py-2 border-b border-info/30">
                        <span className="text-sm font-semibold text-info">params</span>
                      </div>
                      <div className="px-3 py-2 max-h-64 overflow-y-auto">
                        <pre className="text-sm font-mono text-info">
                          {JSON.stringify(requestInfo.params, null, 2)}
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
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-sm font-medium text-primary hover:text-primary-focus flex items-center gap-1"
                >
                  <span>{expanded ? '▼' : '▶'}</span>
                  {error ? 'Error Details' : 'Result'}
                </button>
                <button
                  onClick={handleCopyResponse}
                  className="btn btn-xs btn-ghost"
                  title="Copy response"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>

              {expanded && (
                <div className="relative">
                  {isDryRun && result === null ? (
                    <div className="bg-secondary/10 border border-secondary/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-secondary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                        </svg>
                        <span className="text-sm font-medium">Dry Run Mode</span>
                      </div>
                      <p className="text-sm text-secondary-content mt-2">
                        The request was generated but not sent to the RPC. Check the Request section
                        above to see the parameters that would be sent.
                      </p>
                    </div>
                  ) : (
                    <>
                      {error ? (
                        <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/50 rounded-lg">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-error flex-shrink-0 mt-0.5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-sm text-error break-words">{error}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-success">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
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
        </div>
      </div>
    </div>
  );
};
