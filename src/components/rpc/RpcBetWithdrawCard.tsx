/**
 * RPC Bet Withdraw Card Component
 *
 * Card for testing withdrawing bet prize via RPC call
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import { ExplorerLink } from '../common/ExplorerLink';
import { safeStringify } from '../../utils/betHelpers';
import { useAppSelector } from '../../store/hooks.ts'
import TxStatus from '../common/TxStatus.tsx'

export interface RpcBetWithdrawCardProps {
  onExecute: () => Promise<{ request: unknown; response: unknown }>;
  disabled?: boolean;
  isDryRun?: boolean;
  ncId: string;
  setNcId: (value: string) => void;
  latestNcId: string | null;
  withdrawAddress: string;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  amount: string;
  setAmount: (value: string) => void;
  token: string;
  setToken: (value: string) => void;
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
  // Persisted data from Redux
  initialRequest?: { method: string; params: unknown } | null;
  initialResponse?: unknown | null;
  initialError?: string | null;
}

export const RpcBetWithdrawCard: React.FC<RpcBetWithdrawCardProps> = ({
  onExecute,
  disabled = false,
  isDryRun = false,
  ncId,
  setNcId,
  latestNcId,
  withdrawAddress,
  addressIndex,
  setAddressIndex,
  amount,
  setAmount,
  token,
  setToken,
  pushTx,
  setPushTx,
  initialRequest = null,
  initialResponse = null,
  initialError = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: unknown } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(true);
  const [intermediatesExpanded, setIntermediatesExpanded] = useState(true);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const { showToast } = useToast();
	const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId ?? undefined);

  // Live request building
  const [liveRequest, setLiveRequest] = useState<{ method: string; params: unknown } | null>(null);

  // Load persisted data from Redux
  useEffect(() => {
    if (initialRequest) {
      setRequestInfo(initialRequest);
      setRequestExpanded(true);
    }
    if (initialResponse) {
      setResultData(initialResponse);
      setExpanded(true);
    }
    if (initialError) {
      setError(initialError);
      setExpanded(true);
    }
  }, [initialRequest, initialResponse, initialError]);

  // Live request building
  useEffect(() => {
    const amountNum = parseFloat(amount) || 0;

    const invokeParams = {
      network: 'testnet',
      method: 'withdraw',
      nc_id: ncId || '<nc_id>',
      actions: [
        {
          type: 'withdrawal',
          address: withdrawAddress || '<address>',
          amount: amountNum.toString(),
          token: token || '<token>',
          changeAddress: withdrawAddress || '<address>',
        },
      ],
      args: [],
      push_tx: pushTx,
    };

    const requestParams = {
      method: 'htr_sendNanoContractTx',
      params: invokeParams,
    };

    setLiveRequest(requestParams);
  }, [ncId, withdrawAddress, amount, token, pushTx]);

  const handleSelectLatestNcId = () => {
    if (!latestNcId) {
      showToast('No nano contract has been initialized yet. Please initialize a bet first.', 'error');
      return;
    }
    setNcId(latestNcId);
    showToast('Nano Contract ID selected successfully', 'success');
  };

  const handleExecute = async () => {
    if (!ncId || ncId.trim() === '') {
      showToast('Please provide a Nano Contract ID', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    setResultData(null);
    setRequestInfo(null);

    try {
      const { request, response } = await onExecute();

      setRequestInfo(request as { method: string; params: unknown });
      setResultData(response);
      setRequestExpanded(true);
      setExpanded(true);

      console.log(`[RPC Request] Withdraw Prize`, request);
      console.log(`[RPC Success] Withdraw Prize`, response);

      showToast(
        isDryRun ? 'Request generated (not sent to RPC)' : 'Prize withdrawn successfully',
        'success'
      );
    } catch (err: unknown) {
      console.error('Error in handleExecute:', err);
      const errorMessage = (err instanceof Error ? err.message : null) || 'An error occurred';
      setError(errorMessage);
      setExpanded(true);

      if (err && typeof err === 'object' && 'requestParams' in err) {
        setRequestInfo(err.requestParams as { method: string; params: unknown });
        setRequestExpanded(true);
      }

      console.error(`[RPC Error] Withdraw Prize`, {
        message: errorMessage,
        error: err,
        requestParams: err && typeof err === 'object' && 'requestParams' in err ? err.requestParams : undefined,
      });

      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasResult = resultData !== null || error !== null;

  // Helper to check if an object is a Buffer
  const isBuffer = (obj: unknown): obj is { type: string; data: number[] } => {
    return !!(obj && typeof obj === 'object' && 'type' in obj && (obj as { type?: string }).type === 'Buffer' && 'data' in obj && Array.isArray((obj as { data?: unknown }).data));
  };

  // Helper to render Buffer in a compact way
  const renderBuffer = (buffer: { type?: string; data?: number[] }) => {
    const dataLength = buffer.data?.length || 0;
    const preview = buffer.data?.slice(0, 8).join(', ') || '';
    return (
      <div className="text-sm">
        <span className="text-muted">Buffer({dataLength} bytes)</span>
        {dataLength > 0 && (
          <span className="text-xs text-muted ml-2">
            [{preview}{dataLength > 8 ? '...' : ''}]
          </span>
        )}
      </div>
    );
  };

  // Render raw JSON view
  const renderRawJson = (data: unknown) => {
    return (
      <div className="border border-gray-300 rounded p-3 overflow-auto max-h-96 bg-gray-50 text-left">
        <pre className="text-sm font-mono whitespace-pre-wrap break-words m-0 text-left">
          {safeStringify(data, 2) as string}
        </pre>
      </div>
    );
  };

  // Render formatted response
  const renderFormattedResponse = (data: unknown) => {
    if (!data || typeof data !== 'object') {
      return <div className="text-sm text-muted italic p-3">Invalid response data</div>;
    }

    const renderField = (key: string, value: unknown, depth: number = 0): React.ReactElement => {
      const indent = depth * 12;

      if (isBuffer(value)) {
        return (
          <div key={key} className="py-2" style={{ paddingLeft: `${indent}px` }}>
            <span className="text-sm font-semibold text-primary">{key}: </span>
            {renderBuffer(value)}
          </div>
        );
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          return (
            <div key={key} className="py-2" style={{ paddingLeft: `${indent}px` }}>
              <span className="text-sm font-semibold text-primary">{key}: </span>
              <span className="text-sm text-muted italic">[]</span>
            </div>
          );
        }

        return (
          <div key={key} className="py-2" style={{ paddingLeft: `${indent}px` }}>
            <div className="text-sm font-semibold text-primary mb-1">{key}:</div>
            <div className="ml-4 space-y-1">
              {value.map((item, idx) => (
                <div key={idx}>
                  {typeof item === 'object' && item !== null ? (
                    <div className="border-l-2 border-gray-300 pl-3">
                      {Object.entries(item).map(([k, v]) => renderField(k, v, depth + 1))}
                    </div>
                  ) : (
                    <div className="text-sm">
                      <span className="text-muted">[{idx}]: </span>
                      <span className="font-mono">{String(item)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (typeof value === 'object' && value !== null) {
        return (
          <div key={key} className="py-2" style={{ paddingLeft: `${indent}px` }}>
            <div className="text-sm font-semibold text-primary mb-1">{key}:</div>
            <div className="ml-4 border-l-2 border-gray-300 pl-3">
              {Object.entries(value).map(([k, v]) => renderField(k, v, depth + 1))}
            </div>
          </div>
        );
      }

      return (
        <div key={key} className="py-2" style={{ paddingLeft: `${indent}px` }}>
          <span className="text-sm font-semibold text-primary">{key}: </span>
          <span className="text-sm font-mono">{String(value)}</span>
        </div>
      );
    };

    return (
      <div className="border border-gray-300 rounded p-4 overflow-auto max-h-96 bg-white text-left">
        {Object.entries(data).map(([key, value]) => renderField(key, value))}
      </div>
    );
  };

  // Main render function for results
  const renderResult = () => {
    if (!resultData) return null;

    try {
      const parsedResult = typeof resultData === 'string' ? JSON.parse(resultData) : resultData;

      if (showRawResponse) {
        return renderRawJson(parsedResult);
      }

      return renderFormattedResponse(parsedResult);
    } catch {
      return (
        <div className="border border-gray-300 rounded p-3 overflow-auto max-h-64">
          <pre className="text-sm font-mono">{String(resultData)}</pre>
        </div>
      );
    }
  };

  return (
    <>
      {/* Input Fields Card */}
      <div className="card-primary mb-7.5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Withdraw Prize</h3>
            <p className="text-sm text-muted mt-1">
              Withdraw your prize from a bet nano contract
            </p>
          </div>
          {isDryRun && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              DRY RUN
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* Nano Contract ID */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Nano Contract ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ncId}
                onChange={(e) => setNcId(e.target.value)}
                placeholder="Enter nano contract ID"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={handleSelectLatestNcId}
                className="btn-secondary px-4 flex items-center gap-2"
                title="Select latest initialized nano contract"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                Select
              </button>
            </div>
            <p className="text-xs text-muted mt-1">
              The nano contract ID to withdraw prize from. Click "Select" to use the latest initialized bet.
            </p>
          </div>

          {/* Withdrawal Address Index */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Withdrawal Address Index</label>
            <input
              type="number"
              value={addressIndex}
              onChange={(e) => setAddressIndex(parseInt(e.target.value) || 0)}
              min="0"
              placeholder="0"
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              Index of the address to use for withdrawal
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="E.g., 100"
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              Amount to withdraw (in token's smallest unit)
            </p>
          </div>

          {/* Token */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter token ID (e.g., 00 for HTR)"
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              Token used for the bet (default: 00 for HTR)
            </p>
          </div>

          {/* Push TX Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pushTx}
              onChange={(e) => setPushTx(e.target.checked)}
              className="checkbox checkbox-primary"
              id="pushTx"
            />
            <label htmlFor="pushTx" className="text-sm cursor-pointer">
              Push Transaction
            </label>
          </div>
        </div>

        <div className="mt-6">
          <button onClick={handleExecute} disabled={loading || disabled} className="btn-primary">
            {loading ? 'Withdrawing...' : 'Withdraw Prize'}
          </button>
        </div>
      </div>

      {/* Transaction Hash Display (if available) */}
      {(resultData as { response?: { hash?: string } })?.response?.hash && (
        <div className="card-primary mb-7.5">
          <div className="bg-green-50 border border-green-300 rounded p-4">
            <div className="flex items-center gap-2 text-green-700 mb-3">
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
              <span className="font-medium">Prize withdrawn successfully</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted font-medium">Transaction Hash</span>
                <div className="flex items-center gap-1">
                  <CopyButton text={(resultData as { response: { hash: string } }).response.hash} label="Copy TX hash" />
	                <TxStatus hash={(resultData as { response: { hash: string } }).response.hash} walletId={testWalletId} />
                  <ExplorerLink hash={(resultData as { response: { hash: string } }).response.hash} />
                </div>
              </div>
              <div className="bg-white border border-green-200 rounded p-2 font-mono text-sm break-all">
                {(resultData as { response: { hash: string } }).response.hash}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Intermediates Section */}
      <div className="card-primary mb-7.5">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setIntermediatesExpanded(!intermediatesExpanded)}
            className="text-base font-bold text-primary hover:text-primary-dark flex items-center gap-2"
          >
            <span>{intermediatesExpanded ? '▼' : '▶'}</span>
            Intermediate Calculations
          </button>
        </div>

        {intermediatesExpanded && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-4">
            <p className="text-sm text-yellow-800 mb-3">
              These values are calculated automatically from your inputs and will be used in the request.
            </p>
            <div className="space-y-3">
              {/* Derived Withdrawal Address */}
              <div className="bg-white border border-yellow-200 rounded overflow-hidden">
                <div className="bg-yellow-100 px-3 py-2 border-b border-yellow-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-yellow-800">
                      Withdrawal Address (from index {addressIndex})
                    </span>
                    {withdrawAddress && (
                      <CopyButton text={withdrawAddress} label="Copy" />
                    )}
                  </div>
                </div>
                <div className="px-3 py-2">
                  {withdrawAddress ? (
                    <span className="text-sm font-mono text-yellow-900 break-all">
                      {withdrawAddress}
                    </span>
                  ) : (
                    <span className="text-sm text-muted italic">
                      Deriving withdrawal address from wallet...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Request Section */}
      {liveRequest && (
        <div className="card-primary mb-7.5">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setRequestExpanded(!requestExpanded)}
              className="text-base font-bold text-primary hover:text-primary-dark flex items-center gap-2"
            >
              <span>{requestExpanded ? '▼' : '▶'}</span>
              Request {requestInfo ? '(Sent)' : '(Preview)'}
            </button>
            <CopyButton text={safeStringify(liveRequest, 2) as string} label="Copy request" />
          </div>

          {requestExpanded && (
            <div className="bg-blue-50 border border-blue-300 rounded p-4">
              {!requestInfo && (
                <p className="text-sm text-blue-800 mb-3">
                  This is a live preview of the request that will be sent. It updates as you change the inputs above.
                </p>
              )}
              <div className="space-y-3">
                <div className="bg-white border border-blue-200 rounded overflow-hidden">
                  <div className="bg-blue-100 px-3 py-2 border-b border-blue-200">
                    <span className="text-sm font-semibold text-blue-800">method</span>
                  </div>
                  <div className="px-3 py-2">
                    <span className="text-sm font-mono text-blue-900">{liveRequest.method}</span>
                  </div>
                </div>
                <div className="bg-white border border-blue-200 rounded overflow-hidden">
                  <div className="bg-blue-100 px-3 py-2 border-b border-blue-200">
                    <span className="text-sm font-semibold text-blue-800">params</span>
                  </div>
                  <div className="px-3 py-2 max-h-64 overflow-y-auto">
                    <pre className="text-sm font-mono text-blue-900 text-left whitespace-pre-wrap break-words m-0">
                      {safeStringify(liveRequest.params, 2) as string}
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
            <div className="flex items-center gap-2">
              {(resultData && !error) ? (
                <button
                  onClick={() => setShowRawResponse(!showRawResponse)}
                  className="btn-secondary py-1.5 px-3 text-sm"
                >
                  {showRawResponse ? 'Show Formatted' : 'Show Raw'}
                </button>
              ) : null}
              <CopyButton
                text={resultData ? safeStringify(resultData, 2) as string : error || ''}
                label="Copy response"
              />
            </div>
          </div>

          {expanded && (
            <div className="relative">
              {isDryRun && resultData === null ? (
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
