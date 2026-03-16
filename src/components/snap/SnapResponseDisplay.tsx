/**
 * Snap Response Display Component
 *
 * Formatted display for snap method responses, matching the RPC card style.
 * Detects response type via the {type, response} envelope and renders
 * specialized views for each snap method.
 */

import React from 'react';
import CopyButton from '../common/CopyButton';
import { ExplorerLink } from '../common/ExplorerLink';
import { TransactionResponseDisplay } from '../common/TransactionResponseDisplay';
import { safeStringify } from '../../utils/betHelpers';

/* ------------------------------------------------------------------ */
/*  JSON Syntax Highlighting                                          */
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

function parseResponse(data: unknown): unknown {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return data; }
  }
  return data;
}

interface EnvelopeResponse {
  type: number;
  response: unknown;
}

function isEnvelope(data: unknown): data is EnvelopeResponse {
  return !!(
    data &&
    typeof data === 'object' &&
    'type' in data &&
    typeof (data as Record<string, unknown>).type === 'number' &&
    'response' in data
  );
}

function isTransactionLike(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if ('hash' in obj && ('inputs' in obj || 'outputs' in obj)) return true;
  if ('type' in obj && 'response' in obj) return isTransactionLike(obj.response);
  return false;
}

/* ------------------------------------------------------------------ */
/*  Field Box (reusable labeled field, matches RPC card style)        */
/* ------------------------------------------------------------------ */

function FieldBox({ label, value, copyable = false, mono = true }: {
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-300 rounded overflow-hidden">
      <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">{label}</span>
        {copyable && typeof value === 'string' && (
          <CopyButton text={value} label="Copy" />
        )}
      </div>
      <div className="px-3 py-2">
        <span className={`text-sm break-all ${mono ? 'font-mono' : ''}`}>
          {value ?? 'N/A'}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Type-specific renderers                                           */
/* ------------------------------------------------------------------ */

/** type 2 - htr_getAddress */
function RenderGetAddress({ data }: { data: { address?: string; index?: number; addressPath?: string } }) {
  return (
    <div className="space-y-3">
      <FieldBox label="address" value={data.address || 'N/A'} copyable />
      <FieldBox label="index" value={String(data.index ?? 'N/A')} />
      <FieldBox label="addressPath" value={data.addressPath || 'N/A'} copyable />
    </div>
  );
}

/** type 3 - htr_getBalance */
function RenderGetBalance({ data }: { data: Array<{
  token: { id?: string; name: string; symbol: string; version?: number };
  balance: { unlocked: number | string; locked: number | string };
  tokenAuthorities?: {
    unlocked?: { mint: boolean | number; melt: boolean | number };
    locked?: { mint: boolean | number; melt: boolean | number };
  };
  transactions?: number;
  lockExpires?: number | null;
}> }) {
  if (data.length === 0) {
    return <div className="text-sm text-muted italic p-3">No balance data</div>;
  }

  return (
    <div className="space-y-4">
      {data.map((item, idx) => (
        <div key={idx} className="border border-gray-300 rounded overflow-hidden">
          {/* Token Header */}
          <div className="bg-primary/10 px-4 py-3 border-b border-gray-300">
            <h4 className="text-lg font-bold text-primary m-0">
              {item.token?.name || 'Unknown Token'} ({item.token?.symbol || 'N/A'})
            </h4>
            <p className="text-xs text-muted font-mono mt-1 mb-0 break-all">
              {item.token?.id || 'Unknown ID'}
            </p>
          </div>

          <div className="px-4 py-3 bg-white">
            {/* Balance Grid */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-xs text-muted mb-1">Unlocked Balance</div>
                <div className="text-xl font-bold text-green-700">{String(item.balance?.unlocked ?? '0')}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="text-xs text-muted mb-1">Locked Balance</div>
                <div className="text-xl font-bold text-gray-700">{String(item.balance?.locked ?? '0')}</div>
              </div>
            </div>

            {/* Transactions and Lock Expires */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-muted mb-1">Transactions</div>
                <div className="text-base font-semibold">{item.transactions ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">Lock Expires</div>
                <div className="text-base font-semibold">
                  {item.lockExpires ? String(item.lockExpires) : 'N/A'}
                </div>
              </div>
            </div>

            {/* Token Authorities */}
            {item.tokenAuthorities && (
              <div className="border-t border-gray-200 pt-3">
                <div className="text-xs text-muted mb-2 font-semibold">Token Authorities</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="text-xs font-semibold text-blue-800 mb-1">Unlocked</div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted">Mint:</span>
                        <span className="font-mono">{String(item.tokenAuthorities.unlocked?.mint ?? '0')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Melt:</span>
                        <span className="font-mono">{String(item.tokenAuthorities.unlocked?.melt ?? '0')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-2">
                    <div className="text-xs font-semibold text-gray-800 mb-1">Locked</div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted">Mint:</span>
                        <span className="font-mono">{String(item.tokenAuthorities.locked?.mint ?? '0')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Melt:</span>
                        <span className="font-mono">{String(item.tokenAuthorities.locked?.melt ?? '0')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** type 4 - htr_getConnectedNetwork */
function RenderGetNetwork({ data }: { data: { network?: string; genesisHash?: string } }) {
  return (
    <div className="space-y-3">
      <FieldBox label="network" value={data.network || 'N/A'} />
      {data.genesisHash !== undefined && (
        <FieldBox label="genesisHash" value={data.genesisHash || '(empty)'} copyable={!!data.genesisHash} />
      )}
    </div>
  );
}

/** type 5 - htr_getUtxos */
function RenderGetUtxos({ data }: { data: {
  total_amount_available: number;
  total_utxos_available: number;
  total_amount_locked: number;
  total_utxos_locked: number;
  utxos: Array<{
    address: string;
    amount: number;
    tx_id: string;
    locked: boolean;
    index: number;
  }>;
} }) {
  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-300 rounded p-3">
          <p className="text-xs text-muted mb-1">Total Amount Available</p>
          <p className="text-lg font-bold font-mono m-0">{data.total_amount_available}</p>
        </div>
        <div className="bg-white border border-gray-300 rounded p-3">
          <p className="text-xs text-muted mb-1">Total UTXOs Available</p>
          <p className="text-lg font-bold font-mono m-0">{data.total_utxos_available}</p>
        </div>
        <div className="bg-white border border-gray-300 rounded p-3">
          <p className="text-xs text-muted mb-1">Total Amount Locked</p>
          <p className="text-lg font-bold font-mono m-0">{data.total_amount_locked}</p>
        </div>
        <div className="bg-white border border-gray-300 rounded p-3">
          <p className="text-xs text-muted mb-1">Total UTXOs Locked</p>
          <p className="text-lg font-bold font-mono m-0">{data.total_utxos_locked}</p>
        </div>
      </div>

      {/* UTXOs List */}
      {data.utxos && data.utxos.length > 0 && (
        <div className="bg-white border border-gray-300 rounded overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
            <span className="text-sm font-semibold text-primary">UTXOs ({data.utxos.length})</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.utxos.map((utxo, index) => (
              <div
                key={`${utxo.tx_id}-${utxo.index}`}
                className={`p-3 ${index > 0 ? 'border-t border-gray-200' : ''}`}
              >
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted">Address:</span>
                    <p className="font-mono text-2xs break-all mt-1 mb-0">{utxo.address}</p>
                  </div>
                  <div>
                    <span className="text-muted">Amount:</span>
                    <p className="font-mono font-semibold mt-1 mb-0">{utxo.amount}</p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-muted">TX ID:</span>
                        <p className="font-mono text-2xs break-all mt-1 mb-0">{utxo.tx_id}</p>
                      </div>
                      <ExplorerLink hash={utxo.tx_id} network="testnet" />
                    </div>
                  </div>
                  <div>
                    <span className="text-muted">Index:</span>
                    <p className="font-mono mt-1 mb-0">{utxo.index}</p>
                  </div>
                  <div>
                    <span className="text-muted">Status:</span>
                    <p className="mt-1 mb-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        utxo.locked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {utxo.locked ? 'Locked' : 'Available'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.utxos && data.utxos.length === 0 && (
        <div className="bg-gray-50 border border-gray-300 rounded p-4 text-center">
          <p className="text-muted m-0">No UTXOs found</p>
        </div>
      )}
    </div>
  );
}

/** type 10 - htr_changeNetwork */
function RenderChangeNetwork({ data }: { data: { newNetwork?: string } }) {
  return (
    <div className="space-y-3">
      <FieldBox label="newNetwork" value={data.newNetwork || 'N/A'} />
    </div>
  );
}

/** type 8 - htr_signWithAddress */
function RenderSignWithAddress({ data }: { data: { signature?: string; address?: string; message?: string } }) {
  return (
    <div className="space-y-3">
      {data.signature && <FieldBox label="signature" value={data.signature} copyable />}
      {data.address && <FieldBox label="address" value={data.address} copyable />}
      {data.message && <FieldBox label="message" value={data.message} />}
    </div>
  );
}

/** type 9 - htr_signOracleData */
function RenderSignOracleData({ data }: { data: Record<string, unknown> }) {
  const { signature, oracle_data, ...rest } = data;
  return (
    <div className="space-y-3">
      {signature && <FieldBox label="signature" value={String(signature)} copyable />}
      {oracle_data && <FieldBox label="oracle_data" value={String(oracle_data)} copyable />}
      {Object.entries(rest).map(([k, v]) => (
        <FieldBox key={k} label={k} value={typeof v === 'object' ? safeStringify(v, 2) as string : String(v)} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fallback: generic highlighted JSON                                */
/* ------------------------------------------------------------------ */

function RenderGenericObject({ data }: { data: unknown }) {
  const json = safeStringify(data, 2) as string;
  return (
    <div className="border border-gray-300 rounded overflow-auto max-h-96 bg-slate-50 text-left">
      <pre className="text-sm font-mono whitespace-pre-wrap break-words m-0 p-3">
        <JsonHighlight json={json} />
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

interface SnapResponseDisplayProps {
  response: unknown;
  showRaw?: boolean;
}

export const SnapResponseDisplay: React.FC<SnapResponseDisplayProps> = ({
  response,
  showRaw = false,
}) => {
  const parsed = parseResponse(response);

  // Raw mode: highlighted JSON
  if (showRaw) {
    return <RenderGenericObject data={parsed} />;
  }

  // Check for transaction-like responses (sendTransaction, createToken, nano contract tx)
  if (isTransactionLike(parsed)) {
    return (
      <div className="space-y-3">
        <TransactionResponseDisplay response={parsed} network="testnet" />
      </div>
    );
  }

  // Check for {type, response} envelope
  if (isEnvelope(parsed)) {
    const { type, response: inner } = parsed;
    let formatted: React.ReactNode = null;

    switch (type) {
      case 2: // getAddress
        if (inner && typeof inner === 'object') {
          formatted = <RenderGetAddress data={inner as Parameters<typeof RenderGetAddress>[0]['data']} />;
        }
        break;

      case 3: // getBalance
        if (Array.isArray(inner)) {
          formatted = <RenderGetBalance data={inner} />;
        }
        break;

      case 4: // getConnectedNetwork
        if (inner && typeof inner === 'object') {
          formatted = <RenderGetNetwork data={inner as Parameters<typeof RenderGetNetwork>[0]['data']} />;
        }
        break;

      case 5: // getUtxos
        if (inner && typeof inner === 'object') {
          formatted = <RenderGetUtxos data={inner as Parameters<typeof RenderGetUtxos>[0]['data']} />;
        }
        break;

      case 8: // signWithAddress
        if (inner && typeof inner === 'object') {
          formatted = <RenderSignWithAddress data={inner as Parameters<typeof RenderSignWithAddress>[0]['data']} />;
        }
        break;

      case 9: // signOracleData
        if (inner && typeof inner === 'object') {
          formatted = <RenderSignOracleData data={inner as Record<string, unknown>} />;
        }
        break;

      case 10: // changeNetwork
        if (inner && typeof inner === 'object') {
          formatted = <RenderChangeNetwork data={inner as Parameters<typeof RenderChangeNetwork>[0]['data']} />;
        }
        break;

      default:
        // For envelope types we don't specifically handle,
        // check if the inner response is transaction-like
        if (isTransactionLike(inner)) {
          formatted = <TransactionResponseDisplay response={inner} network="testnet" />;
        }
        break;
    }

    if (formatted) {
      return formatted;
    }
  }

  // Fallback: highlighted JSON for any unrecognized shape
  return <RenderGenericObject data={parsed} />;
};
