/**
 * RPC Bet Initialize Card Component
 *
 * Card for testing bet initialization via RPC call
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import { safeStringify, getOracleBuffer } from '../../utils/betHelpers';

export interface RpcBetInitializeCardProps {
  onExecute: () => Promise<any>;
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
  // Persisted data from Redux
  initialRequest?: { method: string; params: any } | null;
  initialResponse?: any | null;
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
  initialRequest = null,
  initialResponse = null,
  initialError = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: any } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(true); // Always expanded for live view
  const [intermediatesExpanded, setIntermediatesExpanded] = useState(true);
  const { showToast } = useToast();

  // Live request building - calculate request and intermediates on every input change
  const [liveRequest, setLiveRequest] = useState<{ method: string; params: any } | null>(null);
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
      } catch (error) {
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
      setRequestInfo(request);
      setResult(response);
      setRequestExpanded(true);
      setExpanded(true);

      console.log(`[RPC Request] Initialize Bet`, request);
      console.log(`[RPC Success] Initialize Bet`, response);

      showToast(
        isDryRun ? 'Request generated (not sent to RPC)' : 'Bet initialized successfully',
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

      console.error(`[RPC Error] Initialize Bet`, {
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

  // Render raw JSON view
  const renderRawJson = (data: any) => {
    return (
      <div className="border border-gray-300 rounded p-3 overflow-auto max-h-96 bg-gray-50">
        <pre className="text-sm font-mono text-left whitespace-pre-wrap break-words m-0">
          {safeStringify(data, 2)}
        </pre>
      </div>
    );
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
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              DRY RUN
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* Blueprint ID */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Blueprint ID</label>
            <input
              type="text"
              value={blueprintId}
              onChange={(e) => setBlueprintId(e.target.value)}
              placeholder="Enter blueprint ID"
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              The blueprint ID for the bet nano contract
            </p>
          </div>

          {/* Oracle Address */}
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
			        Index of the address to use as the oracle address
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
              Token used for placing bets
            </p>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Bet Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              Last time users can place a bet
            </p>
          </div>

          {/* Push TX Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pushTx}
              onChange={(e) => setPushTx(e.target.checked)}
              className="h-4 w-4"
              id="pushTx"
            />
            <label htmlFor="pushTx" className="text-sm">
              Push Transaction
            </label>
          </div>
        </div>

        <div className="mt-6">
          <button onClick={handleExecute} disabled={loading || disabled} className="btn-primary">
            {loading ? 'Initializing...' : 'Initialize Bet'}
          </button>
        </div>
      </div>

      {/* NC ID Display (if available) */}
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
              <span className="font-medium">Bet initialized successfully</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted font-medium">Nano Contract ID</span>
                <CopyButton text={result.response.hash} label="Copy NC ID" />
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

              {/* Derived Address */}
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
                      {renderRawJson(result)}
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
