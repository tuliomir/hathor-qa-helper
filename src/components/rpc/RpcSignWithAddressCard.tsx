/**
 * RPC Sign with Address Card Component
 *
 * Card for testing htr_signWithAddress RPC call
 */

import React, { useState, useEffect } from 'react';
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

export interface RpcSignWithAddressCardProps {
  onExecute: (message: string, addressIndex: number) => Promise<any>;
  disabled?: boolean;
  isDryRun?: boolean;
  // Persisted data from Redux
  initialRequest?: { method: string; params: any } | null;
  initialResponse?: any | null;
  initialError?: string | null;
}

export const RpcSignWithAddressCard: React.FC<RpcSignWithAddressCardProps> = ({
  onExecute,
  disabled = false,
  isDryRun = false,
  initialRequest = null,
  initialResponse = null,
  initialError = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: any } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const { showToast } = useToast();

  // Form state
  const [message, setMessage] = useState('Hello, Hathor!');
  const [addressIndex, setAddressIndex] = useState('0');

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
    const index = parseInt(addressIndex, 10);

    if (isNaN(index) || index < 0) {
      const errorMsg = 'Address index must be a valid non-negative number';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }

    if (!message.trim()) {
      const errorMsg = 'Message cannot be empty';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setRequestInfo(null);

    try {
      const { request, response } = await onExecute(message, index);

      // Store request and response separately
      setRequestInfo(request);
      setResult(response);
      setRequestExpanded(true);
      setExpanded(true);

      console.log(`[RPC Request] Sign with Address`, request);
      console.log(`[RPC Success] Sign with Address`, response);

      showToast(
        isDryRun ? 'Request generated (not sent to RPC)' : 'Message signed successfully',
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

      console.error(`[RPC Error] Sign with Address`, {
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

  // Check if result has the expected signature response structure
  const isSignatureResponse = (data: any) => {
    // Check if it's the full response with type field
    if (data && data.type === 1 && data.response) {
      const response = data.response;
      return response.message && response.signature && response.address;
    }
    // Or if it's just the response data directly
    return data && data.message && data.signature && data.address;
  };

  // Render formatted signature response
  const renderFormattedResponse = (parsedResult: any) => {
    if (!isSignatureResponse(parsedResult)) {
      return null;
    }

    // Extract the actual response data (handle both formats)
    const responseData = parsedResult.response || parsedResult;

    return (
      <div className="bg-green-50 border border-green-300 rounded p-4 mb-4">
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
          <span className="text-sm font-semibold">Message Signed Successfully</span>
        </div>

        <div className="space-y-3">
          {/* Message */}
          <div>
            <div className="text-xs text-muted mb-1 font-semibold">Message</div>
            <div className="bg-white border border-green-200 rounded p-2 font-mono text-sm break-words">
              {responseData.message}
            </div>
          </div>

          {/* Signature */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-muted font-semibold">Signature</div>
              <CopyButton text={responseData.signature} label="Copy signature" />
            </div>
            <div className="bg-white border border-green-200 rounded p-2 font-mono text-xs break-all">
              {responseData.signature}
            </div>
          </div>

          {/* Address Details */}
          <div>
            <div className="text-xs text-muted mb-2 font-semibold">Signed with Address</div>
            <div className="space-y-2">
              <div className="bg-white border border-green-200 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-muted">Address</div>
                  <CopyButton text={responseData.address.address} label="Copy address" />
                </div>
                <div className="font-mono text-xs break-all">{responseData.address.address}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-green-200 rounded p-2">
                  <div className="text-xs text-muted mb-1">Index</div>
                  <div className="font-mono text-sm">{responseData.address.index}</div>
                </div>
                <div className="bg-white border border-green-200 rounded p-2">
                  <div className="text-xs text-muted mb-1">Address Path</div>
                  <div className="font-mono text-xs">{responseData.address.addressPath}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render raw JSON view
  const renderRawJson = (data: any) => {
    try {
      const parsedResult = typeof data === 'string' ? JSON.parse(data) : data;
      const entries = Object.entries(parsedResult);

      return (
        <div className="space-y-3">
          {entries.map(([key, value]) => (
            <div key={key} className="border border-gray-300 rounded overflow-hidden">
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
          <pre className="text-sm font-mono">{String(data)}</pre>
        </div>
      );
    }
  };

  return (
    <>
      {/* Input Form */}
      <div className="card-primary mb-7.5">
        <h3 className="text-lg font-bold mb-1">Sign with Address</h3>
        <p className="text-sm text-muted mb-4">Sign a message using a specific address from your wallet</p>

        <div className="space-y-4">
          {/* Message Input */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              Message to Sign
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter the message you want to sign..."
              rows={4}
              className="input font-mono resize-y"
            />
            <p className="text-xs text-muted mt-1">
              Enter any text message that you want to sign with your wallet address
            </p>
          </div>

          {/* Address Index Input */}
          <div>
            <label htmlFor="addressIndex" className="block text-sm font-medium mb-2">
              Address Index
            </label>
            <input
              id="addressIndex"
              type="number"
              min="0"
              value={addressIndex}
              onChange={(e) => setAddressIndex(e.target.value)}
              placeholder="0"
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              Enter the address index (0 for first address, 1 for second, etc.)
            </p>
          </div>
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
                : 'Send htr_signWithAddress request to RPC server'}
            </p>
          </div>
          <button onClick={handleExecute} disabled={loading || disabled} className="btn-primary">
            {loading ? 'Signing...' : 'Sign Message'}
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
            <CopyButton text={safeStringify(requestInfo, 2)} label="Copy request" />
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
            <div className="flex items-center gap-2">
              {result && isSignatureResponse(typeof result === 'string' ? JSON.parse(result) : result) && (
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
                      {(() => {
                        try {
                          const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

                          // Show raw or formatted based on toggle
                          if (showRawResponse) {
                            return renderRawJson(result);
                          }

                          // Show formatted if it's a signature response
                          if (isSignatureResponse(parsedResult)) {
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
    </>
  );
};
