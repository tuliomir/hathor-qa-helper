/**
 * Snap Method Card Component
 *
 * Reusable card for snap method stages. Handles:
 * - Live request preview
 * - Execute button with dry-run support
 * - Response/error display with JSON syntax highlighting
 * - Transaction-like response detection and formatted display
 * - User rejection detection with toast + banner feedback
 */

import React, { useState } from 'react';
import CopyButton from '../common/CopyButton';
import DryRunCheckbox from '../common/DryRunCheckbox';
import { SnapResponseDisplay } from './SnapResponseDisplay';
import { safeStringify } from '../../utils/betHelpers';
import { extractErrorMessage } from '../../utils/errorUtils';
import { useToast } from '../../hooks/useToast';
import type { SnapMethodData } from '../../store/slices/snapMethodsSlice';

/* ------------------------------------------------------------------ */
/*  JSON Syntax Highlighting (for request preview only)               */
/* ------------------------------------------------------------------ */

const JSON_TOKEN_RE =
  /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function JsonHighlight({ json }: { json: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  const re = new RegExp(JSON_TOKEN_RE.source, 'g');
  let match = re.exec(json);
  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(json.slice(lastIndex, match.index));
    }

    const [full, key, str, bool, nil, num] = match;
    if (key !== undefined) {
      parts.push(<span key={match.index} className="text-indigo-600">{key}</span>);
      parts.push(':');
    } else if (str !== undefined) {
      parts.push(<span key={match.index} className="text-emerald-600">{full}</span>);
    } else if (bool !== undefined) {
      parts.push(<span key={match.index} className="text-amber-600">{full}</span>);
    } else if (nil !== undefined) {
      parts.push(<span key={match.index} className="text-gray-400">{full}</span>);
    } else if (num !== undefined) {
      parts.push(<span key={match.index} className="text-blue-600">{full}</span>);
    }

    lastIndex = match.index + full.length;
    match = re.exec(json);
  }

  if (lastIndex < json.length) {
    parts.push(json.slice(lastIndex));
  }

  return <>{parts}</>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

// Rejection detection moved to utils/snapErrors for testability
// Keeping this as a thin re-export wrapper for the component
import { isSnapUserRejection } from '../../utils/snapErrors';
const isUserRejection = isSnapUserRejection;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface SnapMethodCardProps {
  title: string;
  description: string;
  liveRequest: { method: string; params?: unknown } | null;
  methodData: SnapMethodData | null;
  isDryRun: boolean;
  onExecute: () => Promise<unknown>;
  disabled?: boolean;
  children: React.ReactNode;
}

export const SnapMethodCard: React.FC<SnapMethodCardProps> = ({
  title,
  description,
  liveRequest,
  methodData,
  isDryRun,
  onExecute,
  disabled = false,
  children,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(true);
  const [responseExpanded, setResponseExpanded] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);

  const handleExecute = async () => {
    setLoading(true);
    setLocalError(null);
    setRejected(false);
    try {
      await onExecute();
      setResponseExpanded(true);
      showToast(
        isDryRun ? 'Dry run complete — request generated' : `${title} executed successfully`,
        'success',
      );
    } catch (err) {
      console.error(`[SnapMethodCard:${title}] Caught error:`, err);
      if (isUserRejection(err)) {
        setRejected(true);
        showToast('Request rejected in MetaMask', 'warning', { duration: 4000 });
      } else {
        const msg = extractErrorMessage(err);
        setLocalError(msg);
        showToast(msg, 'error', { duration: 4000 });
      }
      setResponseExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  const error = localError || methodData?.error || null;
  const response = methodData?.response ?? null;

  const hasResult = response !== null || error !== null || rejected;

  return (
    <>
      {/* Input Fields Card */}
      <div className="card-primary mb-7.5 relative">
        {/* Loading overlay — blocks form interaction while waiting for snap */}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 rounded-lg backdrop-blur-[1px]">
            <svg className="animate-spin h-8 w-8 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-medium text-primary m-0">Waiting for MetaMask...</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-sm text-muted mt-1">{description}</p>
          </div>
          {isDryRun && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-300">
              DRY RUN
            </span>
          )}
        </div>

        <div className="space-y-4">{children}</div>

        <div className="mt-6 flex items-center gap-4">
          <DryRunCheckbox />
          <button
            onClick={handleExecute}
            disabled={loading || disabled}
            className="btn-primary"
          >
            {loading ? 'Executing...' : `Execute ${title}`}
          </button>
        </div>
      </div>

      {/* Live Request Preview */}
      {liveRequest && (
        <div className="card-primary mb-7.5">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setRequestExpanded(!requestExpanded)}
              className="text-base font-bold text-primary hover:text-primary-dark flex items-center gap-2"
            >
              <span>{requestExpanded ? '▼' : '▶'}</span>
              Request {methodData?.request ? '(Sent)' : '(Preview)'}
            </button>
            <CopyButton
              text={safeStringify(liveRequest, 2) as string}
              label="Copy request"
            />
          </div>

          {requestExpanded && (
            <div className="bg-blue-50 border border-blue-300 rounded p-4">
              {!methodData?.request && (
                <p className="text-sm text-blue-800 mb-3">
                  Live preview — updates as you change inputs above.
                </p>
              )}
              <div className="space-y-3">
                <div className="bg-white border border-blue-200 rounded overflow-hidden">
                  <div className="bg-blue-100 px-3 py-2 border-b border-blue-200">
                    <span className="text-sm font-semibold text-blue-800">method</span>
                  </div>
                  <div className="px-3 py-2">
                    <span className="text-sm font-mono text-blue-900">
                      {liveRequest.method}
                    </span>
                  </div>
                </div>
                {liveRequest.params !== undefined && (
                  <div className="bg-white border border-blue-200 rounded overflow-hidden">
                    <div className="bg-blue-100 px-3 py-2 border-b border-blue-200">
                      <span className="text-sm font-semibold text-blue-800">params</span>
                    </div>
                    <div className="px-3 py-2 max-h-64 overflow-y-auto">
                      <pre className="text-sm font-mono text-left whitespace-pre-wrap break-words m-0">
                        <JsonHighlight json={safeStringify(liveRequest.params, 2) as string} />
                      </pre>
                    </div>
                  </div>
                )}
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
              onClick={() => setResponseExpanded(!responseExpanded)}
              className="text-base font-bold text-primary hover:text-primary-dark flex items-center gap-2"
            >
              <span>{responseExpanded ? '▼' : '▶'}</span>
              {rejected ? 'Request Rejected' : error ? 'Error Details' : 'Response'}
            </button>
            <div className="flex items-center gap-2">
              {response && !error && !rejected && (
                <button
                  onClick={() => setShowRawResponse(!showRawResponse)}
                  className="btn-secondary py-1.5 px-3 text-sm"
                >
                  {showRawResponse ? 'Show Formatted' : 'Show Raw'}
                </button>
              )}
              {(response || error) && (
                <CopyButton
                  text={
                    response
                      ? (safeStringify(response, 2) as string)
                      : error || ''
                  }
                  label="Copy response"
                />
              )}
            </div>
          </div>

          {responseExpanded && (
            <div className="relative">
              {/* Rejection banner */}
              {rejected ? (
                <div className="bg-amber-50 border border-amber-300 rounded p-4">
                  <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-amber-800 m-0">Request Rejected</p>
                      <p className="text-sm text-amber-700 mt-1 mb-0">
                        You declined the prompt in MetaMask. No transaction was sent.
                      </p>
                    </div>
                  </div>
                </div>
              ) : isDryRun && response === null && !error ? (
                <div className="bg-purple-50 border border-purple-300 rounded p-4">
                  <div className="flex items-center gap-2 text-purple-700 mb-2">
                    <span className="text-sm font-medium">Dry Run Mode</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    The request was generated but not sent to the Snap. Check the
                    Request section above.
                  </p>
                </div>
              ) : error ? (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-danger rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-900 break-words m-0">{error}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-success">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Success</span>
                  </div>
                  <SnapResponseDisplay response={response} showRaw={showRawResponse} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Duration info */}
      {methodData?.timestamp && methodData.duration !== null && (
        <div className="card-primary mb-7.5 bg-green-50 border border-success">
          <p className="text-sm text-green-800 m-0">
            Last request took {methodData.duration}ms
          </p>
        </div>
      )}
    </>
  );
};
