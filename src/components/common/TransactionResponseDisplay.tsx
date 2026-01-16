/**
 * Transaction Response Display Component
 *
 * Reusable component for displaying transaction response data
 * with formatted sections for hash, metadata, inputs, outputs, etc.
 */

import React, { useState } from 'react';
import { ExplorerLink } from './ExplorerLink';
import type { NetworkType } from '../../constants/network';

/**
 * Helper function to safely stringify objects containing BigInt values
 */
const safeStringify = (obj: unknown, spaces = 0): string => {
  return JSON.stringify(
    obj,
    (_, value) => (typeof value === 'bigint' ? value.toString() : value),
    spaces
  );
};

export interface TransactionData {
  hash?: string;
  inputs?: Array<{
    hash: string;
    index: number;
    data?: { type: string; data: number[] };
  }>;
  outputs?: Array<{
    value: string;
    tokenData: number;
    script?: { type: string; data: number[] };
    decodedScript?: {
      address?: { base58: string };
      timelock?: number | null;
      data?: string;
    };
  }>;
  version?: number;
  weight?: number;
  nonce?: number;
  timestamp?: number;
  signalBits?: number;
  parents?: string[];
  tokens?: string[];
  nc_id?: string;
  nc_method?: string;
  nc_pubkey?: string;
}

export interface TransactionResponseDisplayProps {
  /** The transaction response data */
  response: unknown;
  /** Network type for explorer links */
  network: NetworkType;
  /** Optional: Show NC-specific fields like nc_id, nc_method */
  showNcFields?: boolean;
  /** Optional: Custom label for the hash (e.g., "Nano Contract ID" vs "Transaction Hash") */
  hashLabel?: string;
  /** Optional: Explorer page for the hash link (undefined = transaction, 'nc_detail', or 'token_detail') */
  hashExplorerPage?: 'nc_detail' | 'token_detail';
}

export const TransactionResponseDisplay: React.FC<TransactionResponseDisplayProps> = ({
  response,
  network,
  showNcFields = false,
  hashLabel = 'Transaction Hash',
  hashExplorerPage,
}) => {
  const [fullTxExpanded, setFullTxExpanded] = useState(false);

  // Render Buffer object
  const renderBuffer = (buffer: { type: string; data: number[] }) => {
    if (buffer.type !== 'Buffer' || !Array.isArray(buffer.data)) {
      return JSON.stringify(buffer);
    }
    // Show first few bytes and indicate if there are more
    const preview = buffer.data.slice(0, 20).join(', ');
    const remaining = buffer.data.length - 20;
    return `[${preview}${remaining > 0 ? `, ... (${remaining} more bytes)` : ''}]`;
  };

  // Extract the actual transaction data from response wrapper if needed
  const extractTxData = (data: unknown): TransactionData | null => {
    if (!data || typeof data !== 'object') return null;

    // Check for type: X and response object pattern
    if ('type' in data && 'response' in data) {
      const innerResponse = (data as { response?: unknown }).response;
      if (innerResponse && typeof innerResponse === 'object') {
        return innerResponse as TransactionData;
      }
    }

    // Check if it's the transaction object directly
    if ('hash' in data || 'inputs' in data || 'outputs' in data) {
      return data as TransactionData;
    }

    return null;
  };

  // Check if response is hex string (push_tx = false)
  const isHexStringResponse = (data: unknown): boolean => {
    if (typeof data === 'string') {
      return /^[0-9a-fA-F]+$/.test(data);
    }
    if (data && typeof data === 'object' && 'type' in data && 'response' in data) {
      const innerResponse = (data as { response?: unknown }).response;
      return typeof innerResponse === 'string' && /^[0-9a-fA-F]+$/.test(innerResponse);
    }
    return false;
  };

  // Check if response is transaction object
  const isTransactionResponse = (data: unknown): boolean => {
    const tx = extractTxData(data);
    return tx !== null;
  };

  // Render hex string response
  const renderHexResponse = (data: unknown): React.ReactElement => {
    const hexString = typeof data === 'string'
      ? data
      : (data as { response?: string }).response;

    return (
      <div className="bg-white border border-green-200 rounded overflow-hidden">
        <div className="bg-green-100 px-3 py-2 border-b border-green-200">
          <span className="text-sm font-semibold text-green-800">Transaction Hex</span>
        </div>
        <div className="px-3 py-2 max-h-64 overflow-y-auto">
          <pre className="text-xs font-mono text-gray-700 text-left break-all whitespace-pre-wrap">
            {hexString}
          </pre>
        </div>
      </div>
    );
  };

  // Render transaction response
  const renderTransactionResponse = (data: unknown): React.ReactElement => {
    const tx = extractTxData(data);

    if (!tx) {
      return renderRawJson(data);
    }

    return (
      <div className="space-y-3">
        {/* Transaction/NC Hash */}
        {tx.hash && (
          <div className="bg-white border border-green-200 rounded overflow-hidden">
            <div className="bg-green-100 px-3 py-2 border-b border-green-200">
              <span className="text-sm font-semibold text-green-800">{hashLabel}</span>
            </div>
            <div className="px-3 py-2">
              <ExplorerLink hash={tx.hash} network={network} specificPage={hashExplorerPage} />
            </div>
          </div>
        )}

        {/* NC-specific fields */}
        {showNcFields && (tx.nc_id || tx.nc_method || tx.nc_pubkey) && (
          <div className="bg-white border border-green-200 rounded overflow-hidden">
            <div className="bg-green-100 px-3 py-2 border-b border-green-200">
              <span className="text-sm font-semibold text-green-800">Nano Contract Details</span>
            </div>
            <div className="px-3 py-2 space-y-1 text-sm">
              {tx.nc_id && <div><strong>NC ID:</strong> <ExplorerLink hash={tx.nc_id} network={network} specificPage="nc_detail" /></div>}
              {tx.nc_method && <div><strong>Method:</strong> {tx.nc_method}</div>}
              {tx.nc_pubkey && <div><strong>Public Key:</strong> <span className="font-mono text-xs">{tx.nc_pubkey}</span></div>}
            </div>
          </div>
        )}

        {/* Transaction Metadata */}
        {(tx.version !== undefined || tx.weight !== undefined || tx.nonce !== undefined ||
          tx.timestamp !== undefined || tx.signalBits !== undefined) && (
          <div className="bg-white border border-green-200 rounded overflow-hidden">
            <div className="bg-green-100 px-3 py-2 border-b border-green-200">
              <span className="text-sm font-semibold text-green-800">Transaction Metadata</span>
            </div>
            <div className="px-3 py-2 space-y-1 text-sm">
              {tx.version !== undefined && <div><strong>Version:</strong> {tx.version}</div>}
              {tx.weight !== undefined && <div><strong>Weight:</strong> {typeof tx.weight === 'number' ? tx.weight.toFixed(2) : tx.weight}</div>}
              {tx.nonce !== undefined && <div><strong>Nonce:</strong> {tx.nonce}</div>}
              {tx.timestamp !== undefined && <div><strong>Timestamp:</strong> {tx.timestamp}</div>}
              {tx.signalBits !== undefined && <div><strong>Signal Bits:</strong> {tx.signalBits}</div>}
            </div>
          </div>
        )}

        {/* Inputs */}
        {tx.inputs && tx.inputs.length > 0 && (
          <div className="bg-white border border-green-200 rounded overflow-hidden">
            <div className="bg-green-100 px-3 py-2 border-b border-green-200">
              <span className="text-sm font-semibold text-green-800">
                Inputs ({tx.inputs.length})
              </span>
            </div>
            <div className="px-3 py-2 space-y-2 max-h-48 overflow-y-auto">
              {tx.inputs.map((input, idx) => (
                <div key={idx} className="text-xs border-b border-gray-200 last:border-0 pb-2">
                  <div className="font-semibold mb-1">Input {idx}</div>
                  <div><strong>Hash:</strong> <ExplorerLink hash={input.hash} network={network} /></div>
                  <div><strong>Index:</strong> {input.index}</div>
                  {input.data && (
                    <div className="mt-1">
                      <strong>Data:</strong>
                      <pre className="text-xs mt-1 bg-gray-50 p-1 rounded overflow-x-auto">
                        {renderBuffer(input.data)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outputs */}
        {tx.outputs && tx.outputs.length > 0 && (
          <div className="bg-white border border-green-200 rounded overflow-hidden">
            <div className="bg-green-100 px-3 py-2 border-b border-green-200">
              <span className="text-sm font-semibold text-green-800">
                Outputs ({tx.outputs.length})
              </span>
            </div>
            <div className="px-3 py-2 space-y-2 max-h-48 overflow-y-auto">
              {tx.outputs.map((output, idx) => {
                const isDataOutput = output.decodedScript?.data !== undefined;
                return (
                  <div key={idx} className="text-xs border-b border-gray-200 last:border-0 pb-2">
                    <div className="font-semibold mb-1">
                      Output {idx}
                      {isDataOutput && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
                          DATA
                        </span>
                      )}
                    </div>
                    <div><strong>Value:</strong> {output.value}</div>
                    <div><strong>Token Data:</strong> {output.tokenData}</div>
                    {output.decodedScript?.address?.base58 && (
                      <div><strong>Address:</strong> {output.decodedScript.address.base58}</div>
                    )}
                    {output.decodedScript?.data !== undefined && (
                      <div className="mt-1">
                        <strong>Data:</strong>
                        <pre className="mt-1 p-2 bg-purple-50 border border-purple-200 rounded text-xs font-mono whitespace-pre-wrap break-all">
                          {output.decodedScript.data}
                        </pre>
                      </div>
                    )}
                    {output.decodedScript?.timelock !== undefined && output.decodedScript.timelock !== null && (
                      <div><strong>Timelock:</strong> {output.decodedScript.timelock}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Parents */}
        {tx.parents && tx.parents.length > 0 && (
          <div className="bg-white border border-green-200 rounded overflow-hidden">
            <div className="bg-green-100 px-3 py-2 border-b border-green-200">
              <span className="text-sm font-semibold text-green-800">
                Parents ({tx.parents.length})
              </span>
            </div>
            <div className="px-3 py-2 space-y-1">
              {tx.parents.map((parent, idx) => (
                <div key={idx} className="text-xs">
                  <ExplorerLink hash={parent} network={network} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tokens */}
        {tx.tokens && tx.tokens.length > 0 && (
          <div className="bg-white border border-green-200 rounded overflow-hidden">
            <div className="bg-green-100 px-3 py-2 border-b border-green-200">
              <span className="text-sm font-semibold text-green-800">
                Tokens ({tx.tokens.length})
              </span>
            </div>
            <div className="px-3 py-2 space-y-1">
              {tx.tokens.map((token, idx) => (
                <div key={idx} className="text-xs">
                  <ExplorerLink hash={token} specificPage="token_detail" network={network} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Transaction Object - Collapsible */}
        <div className="bg-white border border-green-200 rounded overflow-hidden">
          <button
            onClick={() => setFullTxExpanded(!fullTxExpanded)}
            className="w-full bg-green-100 px-3 py-2 border-b border-green-200 flex items-center justify-between hover:bg-green-200 transition-colors"
          >
            <span className="text-sm font-semibold text-green-800">Full Transaction Object</span>
            <span className="text-green-800">{fullTxExpanded ? '▼' : '▶'}</span>
          </button>
          {fullTxExpanded && (
            <div className="max-h-64 overflow-y-auto px-3 py-2">
              <pre className="text-xs font-mono text-gray-700 text-left">
                {safeStringify(tx, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render raw JSON
  const renderRawJson = (data: unknown): React.ReactElement => {
    return (
      <div className="bg-white border border-green-200 rounded p-3 overflow-auto max-h-64">
        <pre className="text-sm font-mono text-gray-700 text-left">
          {safeStringify(data, 2)}
        </pre>
      </div>
    );
  };

  // Determine which renderer to use
  if (isHexStringResponse(response)) {
    return renderHexResponse(response);
  }

  if (isTransactionResponse(response)) {
    return renderTransactionResponse(response);
  }

  return renderRawJson(response);
};

export default TransactionResponseDisplay;
