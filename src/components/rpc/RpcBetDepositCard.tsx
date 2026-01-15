/**
 * RPC Bet Deposit Card Component
 *
 * Card for testing placing a bet via RPC call
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import { ExplorerLink } from '../common/ExplorerLink';
import { safeStringify } from '../../utils/betHelpers';
import TxStatus from '../common/TxStatus.tsx'
import { useAppSelector } from '../../store/hooks.ts'

export interface RpcBetDepositCardProps {
  onExecute: () => Promise<{ request: unknown; response: unknown }>;
  isDryRun?: boolean;
  ncId: string;
  setNcId: (value: string) => void;
  latestInitializedNcId: string | null; // The latest initialized NC ID from Initialize stage
  betChoice: string;
  setBetChoice: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  address: string;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  token: string;
  setToken: (value: string) => void;
  initialToken?: string | null; // Token from initialized nano contract
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
  tokens?: { uid: string; symbol: string; name?: string }[];
  // Persisted data from Redux
  initialRequest?: { method: string; params: unknown } | null;
  initialResponse?: unknown | null;
  initialError?: string | null;
}

export const RpcBetDepositCard: React.FC<RpcBetDepositCardProps> = ({
  onExecute,
  isDryRun = false,
  ncId,
  setNcId,
  latestInitializedNcId,
  betChoice,
  setBetChoice,
  amount,
  setAmount,
  address,
  addressIndex,
  setAddressIndex,
  token,
  setToken,
  initialToken = null,
  pushTx,
  setPushTx,
  tokens = [],
  initialRequest = null,
  initialResponse = null,
  initialError = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: unknown } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(true); // Always expanded for live view
  const [intermediatesExpanded, setIntermediatesExpanded] = useState(true);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const { showToast } = useToast();
	const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId ?? undefined);

  // Live request building - calculate request on every input change
  const [liveRequest, setLiveRequest] = useState<{ method: string; params: unknown } | null>(null);

  // Check if token matches the initialized token
  const tokenMismatch = initialToken && token && token.toLowerCase() !== initialToken.toLowerCase();

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

  // Live request building - recalculate on every input change
  useEffect(() => {
    const amountNum = parseFloat(amount) || 0;

    const invokeParams = {
      network: 'testnet',
      method: 'bet',
      blueprint_id: null,
      actions: [
        {
          type: 'deposit',
          token: token || '<token>',
          amount: amountNum || '<amount>',
        },
      ],
      args: [betChoice || '<bet_choice>'],
      push_tx: pushTx,
      nc_id: ncId || '<nc_id>',
      nc_method: 'bet',
      nc_args: [betChoice || '<bet_choice>'],
      address: address || '<address>',
    };

    const requestParams = {
      method: 'htr_sendNanoContractTx',
      params: invokeParams,
    };

    setLiveRequest(requestParams);
  }, [ncId, betChoice, amount, address, token, pushTx]);

  const handleSelectLatestNcId = () => {
    if (!latestInitializedNcId) {
      showToast('No nano contract has been initialized yet. Please initialize a bet first.', 'error');
      return;
    }
    setNcId(latestInitializedNcId);
    showToast('Nano Contract ID selected successfully', 'success');
  };

  const handleExecute = async () => {
    // Validate ncId is provided
    if (!ncId || ncId.trim() === '') {
      showToast('Please provide a Nano Contract ID', 'error');
      return;
    }

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

      console.log(`[RPC Request] Place Bet`, request);
      console.log(`[RPC Success] Place Bet`, response);

      showToast(
        isDryRun ? 'Request generated (not sent to RPC)' : 'Bet placed successfully',
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

      console.error(`[RPC Error] Place Bet`, {
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

  // Helper to check if an object is a Buffer
  const isBuffer = (obj: unknown): boolean => {
    return obj && typeof obj === 'object' && obj.type === 'Buffer' && Array.isArray(obj.data);
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
          {safeStringify(data, 2)}
        </pre>
      </div>
    );
  };

  // Render formatted response for bet deposit
  const renderFormattedResponse = (data: unknown) => {
    if (!data || typeof data !== 'object') {
      return <div className="text-sm text-muted italic p-3">Invalid response data</div>;
    }

    // Helper to render a single field
    const renderField = (key: string, value: unknown, depth: number = 0): React.ReactElement => {
      const indent = depth * 12;

      // Handle Buffer objects
      if (isBuffer(value)) {
        return (
          <div key={key} className="py-2" style={{ paddingLeft: `${indent}px` }}>
            <span className="text-sm font-semibold text-primary">{key}: </span>
            {renderBuffer(value)}
          </div>
        );
      }

      // Handle arrays
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

      // Handle nested objects
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

      // Handle primitives
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
    if (!result) return null;

    try {
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

      // If showing raw, always use raw renderer
      if (showRawResponse) {
        return renderRawJson(parsedResult);
      }

      // Otherwise show formatted
      return renderFormattedResponse(parsedResult);
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
      {/* Input Fields Card */}
      <div className="card-primary mb-7.5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Place Bet</h3>
            <p className="text-sm text-muted mt-1">
              Place a bet on an existing bet nano contract
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
              The nano contract ID to place a bet on. Click "Select" to use the latest initialized bet.
            </p>
          </div>

          {/* Bet Choice */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Bet Choice</label>
            <input
              type="text"
              value={betChoice}
              onChange={(e) => setBetChoice(e.target.value)}
              placeholder="Result_1"
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              Your prediction/choice for the bet outcome
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
              Amount to bet (in token's smallest unit)
            </p>
          </div>

          {/* Address Index */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Change Address Index</label>
            <input
              type="number"
              value={addressIndex}
              onChange={(e) => setAddressIndex(parseInt(e.target.value) || 0)}
              min="0"
              placeholder="0"
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              Index of the address to use for placing the bet
            </p>
          </div>

          {/* Token */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Token</label>
            {tokens && tokens.length > 0 ? (
              <div className="relative">
                <select
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input cursor-pointer appearance-none pr-10"
                >
                  {tokens.map((t) => (
                    <option key={t.uid} value={t.uid}>
                      {t.symbol ? `${t.symbol} (${t.uid})` : t.uid}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              // Fallback to text input if tokens not provided
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter token ID (e.g., 00 for HTR)"
                className="input"
              />
            )}
            <p className="text-xs text-muted mt-1">
              Token used for placing the bet
            </p>
            {tokenMismatch && (
              <div className="mt-2 text-xs text-warning flex items-start gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  Warning: This token ({token}) is different from the one used to initialize the nano contract ({initialToken})
                </span>
              </div>
            )}
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
          <button onClick={handleExecute} disabled={loading} className="btn-primary">
            {loading ? 'Placing Bet...' : 'Place Bet'}
          </button>
        </div>
      </div>

      {/* Transaction Hash Display (if available) */}
      {result?.response?.hash && (
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
              <span className="font-medium">Bet placed successfully</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted font-medium">Transaction Hash</span>
                <div className="flex items-center gap-1">
                  <CopyButton text={result.response.hash} label="Copy TX hash" />
	                <TxStatus hash={result.response.hash} walletId={testWalletId} />
                  <ExplorerLink hash={result.response.hash} />
                </div>
              </div>
              <div className="bg-white border border-green-200 rounded p-2 font-mono text-sm break-all">
                {result.response.hash}
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
              {/* Derived Address */}
              <div className="bg-white border border-yellow-200 rounded overflow-hidden">
                <div className="bg-yellow-100 px-3 py-2 border-b border-yellow-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-yellow-800">
                      Bet Address (from index {addressIndex})
                    </span>
                    {address && (
                      <CopyButton text={address} label="Copy" />
                    )}
                  </div>
                </div>
                <div className="px-3 py-2">
                  {address ? (
                    <span className="text-sm font-mono text-yellow-900 break-all">
                      {address}
                    </span>
                  ) : (
                    <span className="text-sm text-muted italic">
                      Deriving address from wallet...
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
            <CopyButton text={safeStringify(liveRequest, 2)} label="Copy request" />
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
                      {safeStringify(liveRequest.params, 2)}
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
              {result && !error && (
                <button
                  onClick={() => setShowRawResponse(!showRawResponse)}
                  className="btn-secondary py-1.5 px-3 text-sm"
                >
                  {showRawResponse ? 'Show Formatted' : 'Show Raw'}
                </button>
              )}
              <CopyButton
                text={result ? safeStringify(result, 2) : error || ''}
                label="Copy response"
              />
            </div>
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
