/**
 * RPC Create Token Card
 *
 * Card component for testing htr_createToken RPC method
 */

import React, { useState, useEffect } from 'react';
import CopyButton from '../common/CopyButton';
import { useToast } from '../../hooks/useToast';
import type { CreateTokenParams } from '../../services/rpcHandlers';

export interface RpcCreateTokenCardProps {
  onExecute: (params: CreateTokenParams) => Promise<{ request: any; response: any }>;
  disabled?: boolean;
  isDryRun?: boolean;
  initialRequest?: { method: string; params: unknown } | null;
  initialResponse?: unknown | null;
  initialError?: string | null;
}

export const RpcCreateTokenCard: React.FC<RpcCreateTokenCardProps> = ({
  onExecute,
  disabled = false,
  isDryRun = false,
  initialRequest = null,
  initialResponse = null,
  initialError = null,
}) => {
  const { showToast } = useToast();

  // Component state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(initialResponse);
  const [error, setError] = useState<string | null>(initialError);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: any } | null>(initialRequest);
  const [expanded, setExpanded] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);

  // Form state
  const [params, setParams] = useState<CreateTokenParams>({
    name: 'Test Token',
    symbol: 'TST',
    amount: '100',
    change_address: '',
    create_mint: true,
    mint_authority_address: '',
    allow_external_mint_authority_address: false,
    create_melt: true,
    melt_authority_address: '',
    allow_external_melt_authority_address: false,
    data: [],
  });

  // Sync with initial values from Redux
  useEffect(() => {
    if (initialRequest) setRequestInfo(initialRequest);
    if (initialResponse) {
      setResult(initialResponse);
      setExpanded(true);
    }
    if (initialError) {
      setError(initialError);
      setExpanded(true);
    }
  }, [initialRequest, initialResponse, initialError]);

  // Handler for simple field changes
  const handleFieldChange = (field: keyof CreateTokenParams, value: string | boolean) => {
    setParams({ ...params, [field]: value });
  };

  // Handler for data array
  const handleAddData = () => {
    setParams({
      ...params,
      data: [...params.data, ''],
    });
  };

  const handleRemoveData = (index: number) => {
    const newData = params.data.filter((_, i) => i !== index);
    setParams({ ...params, data: newData });
  };

  const handleDataChange = (index: number, value: string) => {
    const newData = [...params.data];
    newData[index] = value;
    setParams({ ...params, data: newData });
  };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRequestInfo(null);

    try {
      const { request, response } = await onExecute(params);

      // Store request and response separately
      setRequestInfo(request);
      setResult(response);
      setRequestExpanded(true);
      setExpanded(true);

      showToast({
        message: isDryRun ? 'Request generated (not sent to RPC)' : 'Token created successfully',
        type: 'success',
      });
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      setExpanded(true);

      // Capture request params from error if available
      if (err.requestParams) {
        setRequestInfo(err.requestParams);
        setRequestExpanded(true);
      }

      showToast({
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasResult = result !== null || error !== null;

  // Safe stringify helper for BigInt
  const safeStringify = (obj: any, spaces = 0): string => {
    return JSON.stringify(
      obj,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      spaces
    );
  };

  // Check if response is createToken response format
  const isCreateTokenResponse = (data: any): boolean => {
    // Check if it's the full response with type field
    if (data && data.type === 1 && data.response) {
      const response = data.response;
      return response.hash && response.tx;
    }
    // Or if it's just the response data directly
    return data && data.hash && data.tx;
  };

  // Render formatted response
  const renderFormattedResponse = (parsedResult: any) => {
    // Extract the actual response data (handle both formats)
    const responseData = parsedResult.response || parsedResult;

    if (!responseData.hash || !responseData.tx) {
      return renderRawJson(result);
    }

    return (
      <div className="space-y-3">
        {/* Transaction Hash */}
        <div className="bg-white border border-green-200 rounded overflow-hidden">
          <div className="bg-green-100 px-3 py-2 border-b border-green-200">
            <span className="text-sm font-semibold text-green-800">Transaction Hash</span>
          </div>
          <div className="px-3 py-2">
            <span className="text-sm font-mono text-gray-700 break-all">{responseData.hash}</span>
          </div>
        </div>

        {/* Token UID */}
        {responseData.tx?.tokens && responseData.tx.tokens.length > 0 && (
          <div className="bg-white border border-green-200 rounded overflow-hidden">
            <div className="bg-green-100 px-3 py-2 border-b border-green-200">
              <span className="text-sm font-semibold text-green-800">Token UID</span>
            </div>
            <div className="px-3 py-2">
              <span className="text-sm font-mono text-gray-700 break-all">
                {responseData.tx.tokens[0]}
              </span>
            </div>
          </div>
        )}

        {/* Full Transaction Object */}
        <div className="bg-white border border-green-200 rounded overflow-hidden">
          <div className="bg-green-100 px-3 py-2 border-b border-green-200">
            <span className="text-sm font-semibold text-green-800">Full Transaction</span>
          </div>
          <div className="max-h-64 overflow-y-auto px-3 py-2">
            <pre className="text-xs font-mono text-gray-700">
              {safeStringify(responseData.tx, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  // Render raw JSON
  const renderRawJson = (data: any) => {
    return (
      <div className="bg-white border border-green-200 rounded p-3 overflow-auto max-h-64">
        <pre className="text-sm font-mono text-gray-700">
          {safeStringify(data, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="card-primary mb-7.5">
      <div className="flex flex-col space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold m-0">Create Token</h3>
              {isDryRun && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300">
                  DRY RUN
                </span>
              )}
            </div>
            <p className="text-sm text-muted m-0">Create a new custom token with mint/melt authorities</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 pt-2">
          {/* Basic Token Info */}
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">Token Name</label>
            <input
              value={params.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Token Name (e.g., Test Token)"
              className="input"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">Token Symbol</label>
            <input
              value={params.symbol}
              onChange={(e) => handleFieldChange('symbol', e.target.value)}
              placeholder="Symbol (e.g., TST)"
              className="input"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              value={params.amount}
              onChange={(e) => handleFieldChange('amount', e.target.value)}
              placeholder="Amount (e.g., 100)"
              className="input"
            />
          </div>

          {/* Change Address */}
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">Change Address (optional)</label>
            <input
              value={params.change_address}
              onChange={(e) => handleFieldChange('change_address', e.target.value)}
              placeholder="Change address"
              className="input"
            />
          </div>

          {/* Mint Settings */}
          <div className="space-y-2 bg-gray-50 rounded p-3 border border-gray-200">
            <label className="block text-sm font-medium">Mint Settings</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={params.create_mint}
                onChange={(e) => handleFieldChange('create_mint', e.target.checked)}
                className="checkbox"
              />
              <span className="text-sm">Create Mint Authority</span>
            </div>
            {params.create_mint && (
              <>
                <input
                  value={params.mint_authority_address}
                  onChange={(e) => handleFieldChange('mint_authority_address', e.target.value)}
                  placeholder="Mint Authority Address (optional)"
                  className="input"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={params.allow_external_mint_authority_address}
                    onChange={(e) =>
                      handleFieldChange('allow_external_mint_authority_address', e.target.checked)
                    }
                    className="checkbox"
                  />
                  <span className="text-sm">Allow External Mint Authority</span>
                </div>
              </>
            )}
          </div>

          {/* Melt Settings */}
          <div className="space-y-2 bg-gray-50 rounded p-3 border border-gray-200">
            <label className="block text-sm font-medium">Melt Settings</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={params.create_melt}
                onChange={(e) => handleFieldChange('create_melt', e.target.checked)}
                className="checkbox"
              />
              <span className="text-sm">Create Melt Authority</span>
            </div>
            {params.create_melt && (
              <>
                <input
                  value={params.melt_authority_address}
                  onChange={(e) => handleFieldChange('melt_authority_address', e.target.value)}
                  placeholder="Melt Authority Address (optional)"
                  className="input"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={params.allow_external_melt_authority_address}
                    onChange={(e) =>
                      handleFieldChange('allow_external_melt_authority_address', e.target.checked)
                    }
                    className="checkbox"
                  />
                  <span className="text-sm">Allow External Melt Authority</span>
                </div>
              </>
            )}
          </div>

          {/* Data Array */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Data (optional)</label>
              <button
                onClick={handleAddData}
                className="btn-secondary py-1.5 px-3 text-sm"
              >
                + Add Data
              </button>
            </div>
            {params.data.length > 0 && (
              <div className="space-y-2">
                {params.data.map((dataItem, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={dataItem}
                      onChange={(e) => handleDataChange(index, e.target.value)}
                      placeholder="Data value"
                      className="input flex-1"
                    />
                    <button
                      onClick={() => handleRemoveData(index)}
                      className="btn-secondary py-2 px-3 text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Execute Button */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleExecute}
            disabled={loading || disabled}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Token'}
          </button>
        </div>

        {/* Request Section (Blue-themed) */}
        {requestInfo && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setRequestExpanded(!requestExpanded)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
              >
                {requestExpanded ? '▼' : '▶'} Request
              </button>
              <CopyButton text={safeStringify(requestInfo, 2)} label="Copy request" />
            </div>

            {requestExpanded && (
              <div className="bg-blue-50 border border-blue-300 rounded p-4">
                <div className="space-y-2">
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
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setExpanded(!expanded)}
                className={`text-sm font-medium flex items-center ${
                  error ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
                }`}
              >
                {expanded ? '▼' : '▶'} {error ? 'Error Details' : 'Response'}
              </button>
              <div className="flex items-center gap-2">
                {result && isCreateTokenResponse(typeof result === 'string' ? JSON.parse(result) : result) && (
                  <button
                    onClick={() => setShowRawResponse(!showRawResponse)}
                    className="btn-secondary py-1.5 px-3 text-sm"
                  >
                    {showRawResponse ? 'Show Formatted' : 'Show Raw'}
                  </button>
                )}
                <CopyButton text={result ? safeStringify(result, 2) : error || ''} label="Copy response" />
              </div>
            </div>

            {expanded && (
              <div className="relative">
                {isDryRun && result === null ? (
                  <div className="bg-purple-50 border border-purple-300 rounded p-4">
                    <div className="flex items-center gap-2 text-purple-700 mb-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm font-medium">Dry Run Mode</span>
                    </div>
                    <p className="text-sm text-purple-600">
                      The request was generated but not sent to the RPC. Check the Request section above to see the parameters that would be sent.
                    </p>
                  </div>
                ) : (
                  <>
                    {error ? (
                      <div className="flex items-start gap-2 p-4 bg-red-50 border border-danger rounded">
                        <svg className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900 mb-1">Error occurred</p>
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-300 rounded p-4">
                        <div className="flex items-center gap-2 text-green-700 mb-3">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">Success</span>
                        </div>
                        {(() => {
                          try {
                            const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

                            // Show raw or formatted based on toggle
                            if (showRawResponse) {
                              return renderRawJson(result);
                            }

                            // Show formatted if it's the expected response type
                            if (isCreateTokenResponse(parsedResult)) {
                              return renderFormattedResponse(parsedResult);
                            }

                            // Otherwise show raw
                            return renderRawJson(result);
                          } catch (e) {
                            return renderRawJson(result);
                          }
                        })()}
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
  );
};
