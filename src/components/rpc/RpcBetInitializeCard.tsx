/**
 * RPC Bet Initialize Card Component
 *
 * Card for testing bet initialization via RPC call
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import { ExplorerLink } from '../common/ExplorerLink';
import DryRunCheckbox from '../common/DryRunCheckbox';
import { safeStringify, getOracleBuffer } from '../../utils/betHelpers';
import { DateTimePicker } from '../ui/datetime-picker';
import { NETWORK_CONFIG } from '../../constants/network';
import { formatTimeUntil } from '../../utils/valuesUtils.ts'
import TxStatus from '../common/TxStatus.tsx'
import { useAppSelector } from '../../store/hooks.ts'

export interface RpcBetInitializeCardProps {
  onExecute: () => Promise<{ request: unknown; response: unknown }>;
  disabled?: boolean;
  isDryRun?: boolean;
  blueprintId: string;
  setBlueprintId: (value: string) => void;
  oracleAddress: string;
  token: string;
  setToken: (value: string) => void;
  deadline: string;
  setDeadline: (value: string) => void;
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  tokens?: { uid: string; symbol: string; name?: string }[];
  // Persisted data from Redux
  initialRequest?: { method: string; params: unknown } | null;
  initialResponse?: unknown | null;
  initialError?: string | null;
}

export const RpcBetInitializeCard: React.FC<RpcBetInitializeCardProps> = ({
  onExecute,
  disabled = false,
  isDryRun = false,
  blueprintId,
  setBlueprintId,
  oracleAddress,
  token,
  setToken,
  deadline,
  setDeadline,
  pushTx,
  setPushTx,
  addressIndex,
  setAddressIndex,
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
	const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId ?? undefined);
  const { showToast } = useToast();

  // Live request building - calculate request and intermediates on every input change
  const [liveRequest, setLiveRequest] = useState<{ method: string; params: unknown } | null>(null);
  const [intermediates, setIntermediates] = useState<{
    oracleBuffer: string | null;
    timestamp: number | null;
    oracleBufferError?: string;
  }>({
    oracleBuffer: null,
    timestamp: null,
  });

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
    // Calculate intermediates
    let oracleBuffer: string | null = null;
    let oracleBufferError: string | undefined = undefined;
    let timestamp: number | null = null;

    // Calculate oracle buffer if address is provided
    if (oracleAddress.trim()) {
      try {
        oracleBuffer = getOracleBuffer(oracleAddress);
      } catch (error) {
        oracleBufferError = error instanceof Error ? error.message : 'Invalid oracle address';
      }
    }

    // Calculate timestamp if deadline is provided
    if (deadline) {
      try {
        const deadlineDate = new Date(deadline);
        timestamp = Math.floor(deadlineDate.getTime() / 1000);
      } catch {
        // Invalid date, timestamp stays null
      }
    }

    // Update intermediates state
    setIntermediates({
      oracleBuffer,
      timestamp,
      oracleBufferError,
    });

    // Build the live request
    const invokeParams = {
      network: 'testnet',
      method: 'initialize',
      blueprint_id: blueprintId || '<blueprint_id>',
      actions: [],
      args: [
        oracleBuffer || '<oracle_script>',
        token || '<token>',
        timestamp !== null ? timestamp : '<timestamp>',
      ],
      push_tx: pushTx,
      nc_id: null,
    };

    const requestParams = {
      method: 'htr_sendNanoContractTx',
      params: invokeParams,
    };

    setLiveRequest(requestParams);
  }, [blueprintId, oracleAddress, token, deadline, pushTx]);

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

      console.log(`[RPC Request] Initialize Bet`, request);
      console.log(`[RPC Success] Initialize Bet`, response);

      showToast(
        isDryRun ? 'Request generated (not sent to RPC)' : 'Bet initialized successfully',
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

      console.error(`[RPC Error] Initialize Bet`, {
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

  // Render formatted response for bet initialize
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
            <h3 className="text-lg font-bold">Initialize Bet</h3>
            <p className="text-sm text-muted mt-1">
              Initialize a new bet nano contract with oracle and token parameters
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
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 002-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              DRY RUN
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* Blueprint ID */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Blueprint ID</label>
            <div className="relative">
              <input
                type="text"
                value={blueprintId}
                onChange={(e) => setBlueprintId(e.target.value)}
                placeholder="Enter blueprint ID"
                className="input pr-10"
              />
              {blueprintId && (
                <a
                  href={`${NETWORK_CONFIG.TESTNET.explorerUrl}blueprint/detail/${blueprintId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-primary transition-colors"
                  title="View blueprint in explorer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </a>
              )}
            </div>
            <p className="text-xs text-muted mt-1">
              The blueprint ID for the bet nano contract
            </p>
          </div>

          {/* Oracle Address */}
	        <div>
		        <label className="block text-sm font-medium mb-1.5">Change Oracle Address Index</label>
		        <input
			        type="number"
			        value={addressIndex}
			        onChange={(e) => setAddressIndex(parseInt(e.target.value) || 0)}
			        min="0"
			        placeholder="0"
			        className="input"
		        />
		        <p className="text-xs text-muted mt-1">
			        Index of the address to use as the oracle address
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
              Token used for placing bets
            </p>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Bet Deadline</label>
            <DateTimePicker
              value={deadline ? new Date(deadline) : undefined}
              onChange={(date) => {
                if (date) {
                  // Convert to the format expected by the existing state (same format produced by the previous input)
                  const isoString = date.toISOString().slice(0, 16);
                  setDeadline(isoString);
                }
              }}
              placeholder="Select bet deadline"
              granularity="minute"
              hourCycle={24}
            />
            <p className="text-xs text-muted mt-1">
              Last time users can place a bet
            </p>
            <p className="text-xs text-muted mt-1">
              Time until this deadline: {formatTimeUntil(deadline)}
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

        <div className="mt-6 flex items-center gap-4">
          <DryRunCheckbox />
          <button onClick={handleExecute} disabled={loading || disabled} className="btn-primary">
            {loading ? 'Initializing...' : 'Initialize Bet'}
          </button>
        </div>
      </div>

      {/* NC ID Display (if available) */}
      {(result as { response?: { hash?: string } })?.response?.hash && (
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
              <span className="font-medium">Bet initialized successfully</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted font-medium">Nano Contract ID</span>
                <div className="flex items-center gap-1">
                  <CopyButton text={(result as { response: { hash: string } }).response.hash} label="Copy NC ID" />
	                <TxStatus hash={(result as { response: { hash: string } }).response.hash} walletId={testWalletId} />
	                <ExplorerLink hash={(result as { response: { hash: string } }).response.hash} />
                </div>
              </div>
              <div className="bg-white border border-green-200 rounded p-2 font-mono text-xs break-all">
                {(result as { response: { hash: string } }).response.hash}
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

	            {/* Oracle Address */}
	            <div className="bg-white border border-yellow-200 rounded overflow-hidden">
		            <div className="bg-yellow-100 px-3 py-2 border-b border-yellow-200">
			            <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-yellow-800">
                      Oracle Address (from index {addressIndex})
                    </span>
				            {oracleAddress && (
					            <CopyButton text={oracleAddress} label="Copy" />
				            )}
			            </div>
		            </div>
		            <div className="px-3 py-2">
			            {oracleAddress ? (
				            <span className="text-sm font-mono text-yellow-900 break-all">
                      {oracleAddress}
                    </span>
			            ) : (
				            <span className="text-sm text-muted italic">
                      Deriving oracle address from wallet...
                    </span>
			            )}
		            </div>
	            </div>

              {/* Oracle Buffer */}
              <div className="bg-white border border-yellow-200 rounded overflow-hidden">
                <div className="bg-yellow-100 px-3 py-2 border-b border-yellow-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-yellow-800">
                      Oracle Script (from address)
                    </span>
                    {intermediates.oracleBuffer && (
                      <CopyButton text={intermediates.oracleBuffer} label="Copy" />
                    )}
                  </div>
                </div>
                <div className="px-3 py-2">
                  {intermediates.oracleBufferError ? (
                    <span className="text-sm text-red-600">{intermediates.oracleBufferError}</span>
                  ) : intermediates.oracleBuffer ? (
                    <span className="text-sm font-mono text-yellow-900 break-all">
                      {intermediates.oracleBuffer}
                    </span>
                  ) : (
                    <span className="text-sm text-muted italic">
                      Enter oracle address to calculate
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div className="bg-white border border-yellow-200 rounded overflow-hidden">
                <div className="bg-yellow-100 px-3 py-2 border-b border-yellow-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-yellow-800">
                      Unix Timestamp (from deadline)
                    </span>
                    {intermediates.timestamp !== null && (
                      <CopyButton text={intermediates.timestamp.toString()} label="Copy" />
                    )}
                  </div>
                </div>
                <div className="px-3 py-2">
                  {intermediates.timestamp !== null ? (
                    <span className="text-sm font-mono text-yellow-900">
                      {intermediates.timestamp}
                    </span>
                  ) : (
                    <span className="text-sm text-muted italic">
                      Enter deadline to calculate
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
              {(result && !error) ? (
                <button
                  onClick={() => setShowRawResponse(!showRawResponse)}
                  className="btn-secondary py-1.5 px-3 text-sm"
                >
                  {showRawResponse ? 'Show Formatted' : 'Show Raw'}
                </button>
              ) : null}
              <CopyButton
                text={result ? safeStringify(result, 2) as string : error || ''}
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
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 002-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
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

                      {/* Nano Contract ID Display */}
                      {(() => {
                        try {
                          const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
                          const hash = parsedResult?.response?.hash;

                          if (hash) {
                            return (
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
                                  <span className="font-medium">Nano Contract Created</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-muted font-medium">Nano Contract ID (Hash)</span>
                                    <div className="flex items-center gap-1">
                                      <CopyButton text={hash} label="Copy ID" />
	                                    <TxStatus hash={hash} walletId={testWalletId} />
                                      <ExplorerLink hash={hash} specificPage="nc_detail" />
                                    </div>
                                  </div>
                                  <div className="bg-white border border-green-200 rounded p-2 font-mono text-sm break-all">
                                    {hash}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        } catch {
                          // Ignore parsing errors
                        }
                        return null;
                      })()}

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
