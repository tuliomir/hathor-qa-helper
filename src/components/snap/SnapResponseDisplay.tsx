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
import { RpcResponseType } from '../../constants/snap';
import {
  parseSnapResponse,
  isSnapEnvelope,
  isTransactionLike,
  safeDisplayValue,
} from '../../utils/snapResponseHelpers';

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
      parts.push(
        <span key={match.index} className="text-indigo-600">
          {key}
        </span>
      );
      parts.push(':');
    } else if (str !== undefined) {
      parts.push(
        <span key={match.index} className="text-emerald-600">
          {full}
        </span>
      );
    } else if (bool !== undefined) {
      parts.push(
        <span key={match.index} className="text-amber-600">
          {full}
        </span>
      );
    } else if (nil !== undefined) {
      parts.push(
        <span key={match.index} className="text-gray-400">
          {full}
        </span>
      );
    } else if (num !== undefined) {
      parts.push(
        <span key={match.index} className="text-blue-600">
          {full}
        </span>
      );
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
/*  Helpers (parseSnapResponse, isSnapEnvelope, isTransactionLike,    */
/*  safeDisplayValue imported from utils/snapResponseHelpers)         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Field Box (reusable labeled field, matches RPC card style)        */
/* ------------------------------------------------------------------ */

function FieldBox({
  label,
  value,
  copyable = false,
  mono = true,
}: {
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-300 rounded overflow-hidden">
      <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">{label}</span>
        {copyable && typeof value === 'string' && <CopyButton text={value} label="Copy" />}
      </div>
      <div className="px-3 py-2">
        <span className={`text-sm break-all ${mono ? 'font-mono' : ''}`}>{value ?? 'N/A'}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Type-specific renderers                                           */
/* ------------------------------------------------------------------ */

/** type 2 - htr_getAddress */
function RenderGetAddress({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <FieldBox label="address" value={safeDisplayValue(data.address)} copyable />
      <FieldBox label="index" value={safeDisplayValue(data.index)} />
      <FieldBox label="addressPath" value={safeDisplayValue(data.addressPath)} copyable />
    </div>
  );
}

/** type 3 - htr_getBalance */
function RenderGetBalance({
  data,
}: {
  data: Array<{
    token: { id?: string; name: string; symbol: string; version?: number };
    balance: { unlocked: number | string; locked: number | string };
    tokenAuthorities?: {
      unlocked?: { mint: boolean | number; melt: boolean | number };
      locked?: { mint: boolean | number; melt: boolean | number };
    };
    transactions?: number;
    lockExpires?: number | null;
  }>;
}) {
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
            <p className="text-xs text-muted font-mono mt-1 mb-0 break-all">{item.token?.id || 'Unknown ID'}</p>
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
                <div className="text-base font-semibold">{safeDisplayValue(item.transactions, '0')}</div>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">Lock Expires</div>
                <div className="text-base font-semibold">{item.lockExpires ? String(item.lockExpires) : 'N/A'}</div>
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
function RenderGetNetwork({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <FieldBox label="network" value={safeDisplayValue(data.network)} />
      {data.genesisHash !== undefined && (
        <FieldBox
          label="genesisHash"
          value={safeDisplayValue(data.genesisHash, '(empty)')}
          copyable={!!data.genesisHash}
        />
      )}
    </div>
  );
}

/** type 5 - htr_getUtxos */
function RenderGetUtxos({ data }: { data: Record<string, unknown> }) {
  const utxos = Array.isArray(data.utxos) ? (data.utxos as Record<string, unknown>[]) : [];
  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-300 rounded p-3">
          <p className="text-xs text-muted mb-1">Total Amount Available</p>
          <p className="text-lg font-bold font-mono m-0">{safeDisplayValue(data.total_amount_available, '0')}</p>
        </div>
        <div className="bg-white border border-gray-300 rounded p-3">
          <p className="text-xs text-muted mb-1">Total UTXOs Available</p>
          <p className="text-lg font-bold font-mono m-0">{safeDisplayValue(data.total_utxos_available, '0')}</p>
        </div>
        <div className="bg-white border border-gray-300 rounded p-3">
          <p className="text-xs text-muted mb-1">Total Amount Locked</p>
          <p className="text-lg font-bold font-mono m-0">{safeDisplayValue(data.total_amount_locked, '0')}</p>
        </div>
        <div className="bg-white border border-gray-300 rounded p-3">
          <p className="text-xs text-muted mb-1">Total UTXOs Locked</p>
          <p className="text-lg font-bold font-mono m-0">{safeDisplayValue(data.total_utxos_locked, '0')}</p>
        </div>
      </div>

      {/* UTXOs List */}
      {utxos.length > 0 && (
        <div className="bg-white border border-gray-300 rounded overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
            <span className="text-sm font-semibold text-primary">UTXOs ({utxos.length})</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {utxos.map((utxo, index) => (
              <div
                key={`${safeDisplayValue(utxo.tx_id, index.toString())}-${safeDisplayValue(utxo.index, '0')}`}
                className={`p-3 ${index > 0 ? 'border-t border-gray-200' : ''}`}
              >
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted">Address:</span>
                    <p className="font-mono text-2xs break-all mt-1 mb-0">{safeDisplayValue(utxo.address)}</p>
                  </div>
                  <div>
                    <span className="text-muted">Amount:</span>
                    <p className="font-mono font-semibold mt-1 mb-0">{safeDisplayValue(utxo.amount, '0')}</p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-muted">TX ID:</span>
                        <p className="font-mono text-2xs break-all mt-1 mb-0">{safeDisplayValue(utxo.tx_id)}</p>
                      </div>
                      {typeof utxo.tx_id === 'string' && <ExplorerLink hash={utxo.tx_id} network="testnet" />}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted">Index:</span>
                    <p className="font-mono mt-1 mb-0">{safeDisplayValue(utxo.index)}</p>
                  </div>
                  <div>
                    <span className="text-muted">Status:</span>
                    <p className="mt-1 mb-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          utxo.locked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
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

      {utxos.length === 0 && (
        <div className="bg-gray-50 border border-gray-300 rounded p-4 text-center">
          <p className="text-muted m-0">No UTXOs found</p>
        </div>
      )}
    </div>
  );
}

/** type 10 - htr_changeNetwork */
function RenderChangeNetwork({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <FieldBox label="newNetwork" value={safeDisplayValue(data.newNetwork)} />
    </div>
  );
}

/** type 11 - htr_getXpub */
function RenderGetXpub({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <FieldBox label="xpub" value={safeDisplayValue(data.xpub)} copyable />
    </div>
  );
}

/** type 12 - htr_getWalletInformation */
function RenderGetWalletInformation({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <FieldBox label="network" value={safeDisplayValue(data.network)} />
      <FieldBox label="address0" value={safeDisplayValue(data.address0)} copyable />
    </div>
  );
}

/** type 1 - htr_signWithAddress */
function RenderSignWithAddress({ data }: { data: Record<string, unknown> }) {
  // The snap may return address as an object {address, index, addressPath} or a string
  const addressVal =
    data.address && typeof data.address === 'object' ? (data.address as Record<string, unknown>).address : data.address;
  return (
    <div className="space-y-3">
      {data.signature ? <FieldBox label="signature" value={safeDisplayValue(data.signature)} copyable /> : null}
      {addressVal ? <FieldBox label="address" value={safeDisplayValue(addressVal)} copyable /> : null}
      {data.message ? <FieldBox label="message" value={safeDisplayValue(data.message)} /> : null}
    </div>
  );
}

/** type 7 - htr_signOracleData */
function RenderSignOracleData({ data }: { data: Record<string, unknown> }) {
  const signedData =
    data.signedData && typeof data.signedData === 'object' ? (data.signedData as Record<string, unknown>) : null;

  return (
    <div className="space-y-3">
      <FieldBox label="data" value={safeDisplayValue(data.data)} />
      <FieldBox label="oracle" value={safeDisplayValue(data.oracle)} copyable />

      {signedData && (
        <div className="border border-gray-300 rounded overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
            <span className="text-sm font-semibold text-primary">Signed Data</span>
          </div>
          <div className="p-3 space-y-3">
            <FieldBox label="type" value={safeDisplayValue(signedData.type)} />
            <FieldBox label="value" value={safeDisplayValue(signedData.value)} />
            <FieldBox label="signature" value={safeDisplayValue(signedData.signature)} copyable />
          </div>
        </div>
      )}

      {!signedData && data.signature ? (
        <FieldBox label="signature" value={safeDisplayValue(data.signature)} copyable />
      ) : null}
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

export const SnapResponseDisplay: React.FC<SnapResponseDisplayProps> = ({ response, showRaw = false }) => {
  const parsed = parseSnapResponse(response);

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
  if (isSnapEnvelope(parsed)) {
    const { type, response: inner } = parsed;
    let formatted: React.ReactNode = null;

    switch (type) {
      case RpcResponseType.GetAddress:
        if (inner && typeof inner === 'object') {
          formatted = <RenderGetAddress data={inner as Record<string, unknown>} />;
        }
        break;

      case RpcResponseType.GetBalance:
        if (Array.isArray(inner)) {
          formatted = <RenderGetBalance data={inner} />;
        }
        break;

      case RpcResponseType.GetConnectedNetwork:
        if (inner && typeof inner === 'object') {
          formatted = <RenderGetNetwork data={inner as Record<string, unknown>} />;
        }
        break;

      case RpcResponseType.GetUtxos:
        if (inner && typeof inner === 'object') {
          formatted = <RenderGetUtxos data={inner as Record<string, unknown>} />;
        }
        break;

      case RpcResponseType.SignWithAddress:
        if (inner && typeof inner === 'object') {
          formatted = <RenderSignWithAddress data={inner as Record<string, unknown>} />;
        }
        break;

      case RpcResponseType.SignOracleData:
        if (inner && typeof inner === 'object') {
          formatted = <RenderSignOracleData data={inner as Record<string, unknown>} />;
        }
        break;

      case RpcResponseType.ChangeNetwork:
        if (inner && typeof inner === 'object') {
          formatted = <RenderChangeNetwork data={inner as Record<string, unknown>} />;
        }
        break;

      case RpcResponseType.GetXpub:
        if (inner && typeof inner === 'object') {
          formatted = <RenderGetXpub data={inner as Record<string, unknown>} />;
        }
        break;

      case RpcResponseType.GetWalletInformation:
        if (inner && typeof inner === 'object') {
          formatted = <RenderGetWalletInformation data={inner as Record<string, unknown>} />;
        }
        break;

      default:
        // Transaction-like responses (sendTransaction, createToken,
        // sendNanoContractTx, createNanoContractCreateTokenTx)
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
