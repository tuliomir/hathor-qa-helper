/**
 * RPC Request Preview Component
 *
 * Reusable blue-themed request section for RPC cards. Shows:
 * - Live preview (from form state) before execution
 * - Sent request (from execution result) after execution
 *
 * Replaces the duplicated request section across all RPC cards.
 */

import React, { useState } from 'react';
import CopyButton from '../common/CopyButton';
import SendToRawEditorButton from '../common/SendToRawEditorButton';

const safeStringify = (obj: unknown, space?: number): string => {
  return JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), space);
};

interface RpcRequestPreviewProps {
  /** Live request built from current form state — always shown */
  liveRequest: { method: string; params: unknown } | null;
  /** Actual sent request after execution — overrides live preview when present */
  sentRequest?: { method: string; params: unknown } | null;
  /** Start expanded (default: true for live preview visibility) */
  defaultExpanded?: boolean;
}

export const RpcRequestPreview: React.FC<RpcRequestPreviewProps> = ({
  liveRequest,
  sentRequest = null,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Show sent request if available, otherwise live preview
  const displayRequest = sentRequest || liveRequest;
  if (!displayRequest) return null;

  const isSent = !!sentRequest;
  const requestJson = safeStringify(displayRequest, 2);

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
        >
          {expanded ? '▼' : '▶'} Request {isSent ? '(Sent)' : '(Preview)'}
        </button>
        <div className="flex items-center gap-3">
          <SendToRawEditorButton requestJson={requestJson} />
          <CopyButton text={requestJson} label="Copy request" />
        </div>
      </div>

      {expanded && (
        <div className="bg-blue-50 border border-blue-300 rounded p-4">
          {!isSent && <p className="text-sm text-blue-800 mb-3">Live preview — updates as you change inputs above.</p>}
          <div className="space-y-2">
            <div className="bg-white border border-blue-200 rounded overflow-hidden">
              <div className="bg-blue-100 px-3 py-2 border-b border-blue-200">
                <span className="text-sm font-semibold text-blue-800">method</span>
              </div>
              <div className="px-3 py-2">
                <span className="text-sm font-mono text-blue-900">{displayRequest.method}</span>
              </div>
            </div>
            <div className="bg-white border border-blue-200 rounded overflow-hidden">
              <div className="bg-blue-100 px-3 py-2 border-b border-blue-200">
                <span className="text-sm font-semibold text-blue-800">params</span>
              </div>
              <div className="px-3 py-2 max-h-64 overflow-y-auto">
                <pre className="text-sm font-mono text-blue-900 text-left whitespace-pre-wrap break-words m-0">
                  {safeStringify(displayRequest.params, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
