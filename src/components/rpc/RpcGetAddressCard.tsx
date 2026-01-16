/**
 * RPC Get Address Card Component
 *
 * Card for testing htr_getAddress RPC call with type selection
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import Select from '../common/Select';
import DryRunCheckbox from '../common/DryRunCheckbox';
import type { AddressRequestType } from '../../store/slices/getAddressSlice';

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

export interface RpcGetAddressCardProps {
  onExecute: (type: AddressRequestType, index?: number) => Promise<{ request: unknown; response: unknown }>;
  disabled?: boolean;
  isDryRun?: boolean;
  requestType: AddressRequestType;
  indexValue: number;
  onRequestTypeChange: (type: AddressRequestType) => void;
  onIndexValueChange: (index: number) => void;
  // Persisted data from Redux
  initialRequest?: { method: string; params: unknown } | null;
  initialResponse?: unknown | null;
  initialError?: string | null;
}

export const RpcGetAddressCard: React.FC<RpcGetAddressCardProps> = ({
  onExecute,
  disabled = false,
  isDryRun = false,
  requestType,
  indexValue,
  onRequestTypeChange,
  onIndexValueChange,
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
      const { request, response } = await onExecute(
        requestType,
        requestType === 'index' ? indexValue : undefined
      );

      // Store request and response separately
      setRequestInfo(request as { method: string; params: unknown });
      setResult(response);
      setRequestExpanded(true);
      setExpanded(true);

      console.log(`[RPC Request] Get Address`, request);
      console.log(`[RPC Success] Get Address`, response);

      showToast(
        isDryRun ? 'Request generated (not sent to RPC)' : 'Address retrieved successfully',
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

      console.error(`[RPC Error] Get Address`, {
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

  // Check if result is a get address response
  const isGetAddressResponse = (data: unknown): data is { type: number; response: unknown } => {
    return !!(data && typeof data === 'object' && 'type' in data && (data as { type?: number }).type === 2 && 'response' in data);
  };

  // Render result
  const renderResult = () => {
    if (!result) return null;

    try {
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

      // Special handling for get address response
      if (isGetAddressResponse(parsedResult)) {
        const info = parsedResult.response as { address?: string; index?: number; addressPath?: string };

        return (
          <div className="space-y-3">
            {/* Address */}
            <div className="bg-white border border-gray-300 rounded overflow-hidden">
              <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">address</span>
                <CopyButton text={info.address || ''} label="Copy" />
              </div>
              <div className="px-3 py-2">
                <span className="text-sm font-mono break-all">{info.address || 'N/A'}</span>
              </div>
            </div>

            {/* Index */}
            <div className="bg-white border border-gray-300 rounded overflow-hidden">
              <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                <span className="text-sm font-semibold text-primary">index</span>
              </div>
              <div className="px-3 py-2">
                <span className="text-sm font-mono">{info.index ?? 'N/A'}</span>
              </div>
            </div>

            {/* Address Path */}
            <div className="bg-white border border-gray-300 rounded overflow-hidden">
              <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">addressPath</span>
                <CopyButton text={info.addressPath || ''} label="Copy" />
              </div>
              <div className="px-3 py-2">
                <span className="text-sm font-mono break-all">{info.addressPath || 'N/A'}</span>
              </div>
            </div>
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
      {/* Request Configuration */}
      <div className="card-primary mb-7.5">
        <h3 className="text-lg font-bold mb-3">Request Configuration</h3>

        {/* Type Selector */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-muted mb-2">
            Address Type
          </label>
          <Select
            value={requestType}
            onChange={(e) => onRequestTypeChange(e.target.value as AddressRequestType)}
          >
            <option value="first_empty">First Empty</option>
            <option value="index">By Index</option>
            <option value="client">Client</option>
          </Select>
          <p className="text-xs text-muted mt-1">
            {requestType === 'first_empty' && 'Returns the first unused address'}
            {requestType === 'index' && 'Returns the address at the specified index'}
            {requestType === 'client' && 'Returns the client-determined address'}
          </p>
        </div>

        {/* Index Input - Only visible when type is "index" */}
        {requestType === 'index' && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-muted mb-2">
              Address Index
            </label>
            <input
              type="number"
              min="0"
              value={indexValue}
              onChange={(e) => onIndexValueChange(parseInt(e.target.value) || 0)}
              className="input w-full"
              placeholder="Enter address index"
            />
            <p className="text-xs text-muted mt-1">
              The index of the address to retrieve (starting from 0)
            </p>
          </div>
        )}
      </div>

      {/* Execute Button */}
      <div className="card-primary mb-7.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Execute RPC Call</h3>
            <p className="text-sm text-muted mt-1">
              {isDryRun
                ? 'Generate request (will not be sent to RPC server)'
                : 'Send htr_getAddress request to RPC server'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <DryRunCheckbox />
            <button onClick={handleExecute} disabled={loading || disabled} className="btn-primary">
              {loading ? 'Loading...' : 'Execute'}
            </button>
          </div>
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
