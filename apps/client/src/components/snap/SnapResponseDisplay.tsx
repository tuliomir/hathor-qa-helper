/**
 * Snap Response Display Component
 *
 * Formatted view of snap method responses, used as the "Formatted" side of
 * MethodCard's response JsonPanel. Detects the response type via the
 * {type, response} envelope and renders a view per snap method; anything
 * unrecognised falls back to highlighted JSON.
 */

import React from 'react';
import CopyButton from '../common/CopyButton';
import { ExplorerLink } from '../common/ExplorerLink';
import { Identifier } from '../common/Identifier';
import { JsonHighlight } from '../common/JsonPanel';
import { TransactionResponseDisplay } from '../common/TransactionResponseDisplay';
import { Panel } from '../ui/Panel';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { StatusChip } from '../ui/StatusChip';
import { safeStringify } from '../../utils/betHelpers';
import { snapNetworkKey } from '../../utils/blueprints';
import { DEFAULT_NETWORK, type NetworkKey } from '../../constants/network';
import { useAppSelector } from '../../store/hooks';
import { RpcResponseType } from '../../constants/snap';
import {
  parseSnapResponse,
  isSnapEnvelope,
  isTransactionLike,
  safeDisplayValue,
} from '../../utils/snapResponseHelpers';

/** Explorer links in snap responses follow the snap's own network. */
function useSnapExplorerNetwork(): NetworkKey {
  return snapNetworkKey(useAppSelector((state) => state.snap.network)) ?? DEFAULT_NETWORK;
}

/* ------------------------------------------------------------------ */
/*  Field list                                                        */
/* ------------------------------------------------------------------ */

type FieldKind = 'text' | 'mono' | 'address' | 'xpub';

interface FieldSpec {
  label: string;
  value: unknown;
  kind?: FieldKind;
  /** Copy button for `mono` values (Identifier kinds always copy). */
  copy?: boolean;
  fallback?: string;
}

function FieldValue({ value, kind = 'mono', copy = false, fallback }: Omit<FieldSpec, 'label'>) {
  const text = safeDisplayValue(value, fallback);
  const isMissing = value === null || value === undefined || value === '';
  if (!isMissing && typeof value === 'string' && (kind === 'address' || kind === 'xpub')) {
    return <Identifier value={value} kind={kind} />;
  }
  if (kind === 'text') return <span className="text-body">{text}</span>;
  return (
    <span className="flex min-w-0 items-start gap-1">
      <code className="min-w-0 whitespace-pre-wrap font-mono text-data [overflow-wrap:anywhere]">{text}</code>
      {copy && !isMissing && <CopyButton text={text} />}
    </span>
  );
}

function FieldList({ fields }: { fields: FieldSpec[] }) {
  return (
    <dl className="m-0 flex flex-col gap-2 text-left">
      {fields.map(({ label, ...rest }) => (
        <div key={label} className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <dt className="w-32 flex-none font-mono text-data-sm text-ink-muted">{label}</dt>
          <dd className="m-0 min-w-0">
            <FieldValue {...rest} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/*  Type-specific renderers                                           */
/* ------------------------------------------------------------------ */

/** type 2 - htr_getAddress */
function RenderGetAddress({ data }: { data: Record<string, unknown> }) {
  return (
    <FieldList
      fields={[
        { label: 'address', value: data.address, kind: 'address' },
        { label: 'index', value: data.index },
        { label: 'addressPath', value: data.addressPath, copy: true },
      ]}
    />
  );
}

interface BalanceItem {
  token: { id?: string; name: string; symbol: string; version?: number };
  balance: { unlocked: number | string; locked: number | string };
  tokenAuthorities?: {
    unlocked?: { mint: boolean | number; melt: boolean | number };
    locked?: { mint: boolean | number; melt: boolean | number };
  };
  transactions?: number;
  lockExpires?: number | null;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="m-0 min-w-0">{children}</dd>
    </div>
  );
}

/** type 3 - htr_getBalance */
function RenderGetBalance({ data }: { data: BalanceItem[] }) {
  if (data.length === 0) {
    return <p className="m-0 text-body text-ink-muted">The snap returned no balances.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((item, idx) => (
        <Panel
          key={idx}
          variant="inset"
          title={`${item.token?.name || 'Unknown token'} (${item.token?.symbol || 'N/A'})`}
          actions={item.token?.id ? <Identifier value={item.token.id} kind="token" /> : undefined}
        >
          <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat label="Unlocked">
              <span className="font-mono text-title-sm tabular-nums">{String(item.balance?.unlocked ?? '0')}</span>
            </Stat>
            <Stat label="Locked">
              <span className="font-mono text-title-sm tabular-nums text-ink-muted">
                {String(item.balance?.locked ?? '0')}
              </span>
            </Stat>
            <Stat label="Transactions">
              <span className="font-mono text-data tabular-nums">{safeDisplayValue(item.transactions, '0')}</span>
            </Stat>
            <Stat label="Lock expires">
              <span className="text-body">
                {item.lockExpires ? new Date(item.lockExpires * 1000).toLocaleString() : 'N/A'}
              </span>
            </Stat>
          </dl>

          {item.tokenAuthorities && (
            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-base-300 pt-2 sm:grid-cols-4">
              <Stat label="Unlocked mint">
                <span className="font-mono text-data">{String(item.tokenAuthorities.unlocked?.mint ?? '0')}</span>
              </Stat>
              <Stat label="Unlocked melt">
                <span className="font-mono text-data">{String(item.tokenAuthorities.unlocked?.melt ?? '0')}</span>
              </Stat>
              <Stat label="Locked mint">
                <span className="font-mono text-data">{String(item.tokenAuthorities.locked?.mint ?? '0')}</span>
              </Stat>
              <Stat label="Locked melt">
                <span className="font-mono text-data">{String(item.tokenAuthorities.locked?.melt ?? '0')}</span>
              </Stat>
            </dl>
          )}
        </Panel>
      ))}
    </div>
  );
}

/** type 4 - htr_getConnectedNetwork */
function RenderGetNetwork({ data }: { data: Record<string, unknown> }) {
  const fields: FieldSpec[] = [{ label: 'network', value: data.network }];
  if (data.genesisHash !== undefined) {
    fields.push({ label: 'genesisHash', value: data.genesisHash, fallback: '(empty)', copy: !!data.genesisHash });
  }
  return <FieldList fields={fields} />;
}

/** type 5 - htr_getUtxos */
function RenderGetUtxos({ data }: { data: Record<string, unknown> }) {
  const network = useSnapExplorerNetwork();
  const utxos = Array.isArray(data.utxos) ? (data.utxos as Record<string, unknown>[]) : [];

  const columns: DataTableColumn<Record<string, unknown>>[] = [
    {
      key: 'tx',
      header: 'Transaction',
      type: 'identifier',
      render: (u) =>
        typeof u.tx_id === 'string' ? (
          <span className="inline-flex items-center gap-2">
            <Identifier value={u.tx_id} kind="tx" />
            <ExplorerLink hash={u.tx_id} network={network} />
          </span>
        ) : (
          safeDisplayValue(u.tx_id)
        ),
    },
    { key: 'index', header: 'Index', type: 'amount', value: (u) => safeDisplayValue(u.index) },
    {
      key: 'address',
      header: 'Address',
      type: 'identifier',
      render: (u) =>
        typeof u.address === 'string' && u.address ? (
          <Identifier value={u.address} kind="address" />
        ) : (
          safeDisplayValue(u.address)
        ),
    },
    { key: 'amount', header: 'Amount', type: 'amount', value: (u) => safeDisplayValue(u.amount, '0') },
    {
      key: 'status',
      header: 'Status',
      type: 'status',
      render: (u) =>
        u.locked ? (
          <StatusChip status="locked" label="Locked" tone="idle" />
        ) : (
          <StatusChip status="available" label="Available" tone="success" />
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <Stat label="Amount available">
          <span className="font-mono text-data tabular-nums">{safeDisplayValue(data.total_amount_available, '0')}</span>
        </Stat>
        <Stat label="UTXOs available">
          <span className="font-mono text-data tabular-nums">{safeDisplayValue(data.total_utxos_available, '0')}</span>
        </Stat>
        <Stat label="Amount locked">
          <span className="font-mono text-data tabular-nums">{safeDisplayValue(data.total_amount_locked, '0')}</span>
        </Stat>
        <Stat label="UTXOs locked">
          <span className="font-mono text-data tabular-nums">{safeDisplayValue(data.total_utxos_locked, '0')}</span>
        </Stat>
      </dl>
      <DataTable
        caption={`UTXOs (${utxos.length})`}
        columns={columns}
        rows={utxos}
        getRowKey={(u, i) => `${safeDisplayValue(u.tx_id, i.toString())}-${safeDisplayValue(u.index, '0')}`}
        empty="No UTXOs match these filters."
        maxHeight="24rem"
      />
    </div>
  );
}

/** type 10 - htr_changeNetwork */
function RenderChangeNetwork({ data }: { data: Record<string, unknown> }) {
  return <FieldList fields={[{ label: 'newNetwork', value: data.newNetwork }]} />;
}

/** type 11 - htr_getXpub */
function RenderGetXpub({ data }: { data: Record<string, unknown> }) {
  return <FieldList fields={[{ label: 'xpub', value: data.xpub, kind: 'xpub' }]} />;
}

/** type 12 - htr_getWalletInformation */
function RenderGetWalletInformation({ data }: { data: Record<string, unknown> }) {
  return (
    <FieldList
      fields={[
        { label: 'network', value: data.network },
        { label: 'address0', value: data.address0, kind: 'address' },
      ]}
    />
  );
}

/** type 1 - htr_signWithAddress */
function RenderSignWithAddress({ data }: { data: Record<string, unknown> }) {
  // The snap may return address as an object {address, index, addressPath} or a string
  const addressVal =
    data.address && typeof data.address === 'object' ? (data.address as Record<string, unknown>).address : data.address;
  const fields: FieldSpec[] = [];
  if (data.signature) fields.push({ label: 'signature', value: data.signature, copy: true });
  if (addressVal) fields.push({ label: 'address', value: addressVal, kind: 'address' });
  if (data.message) fields.push({ label: 'message', value: data.message, kind: 'text' });
  return <FieldList fields={fields} />;
}

/** type 7 - htr_signOracleData */
function RenderSignOracleData({ data }: { data: Record<string, unknown> }) {
  const signedData =
    data.signedData && typeof data.signedData === 'object' ? (data.signedData as Record<string, unknown>) : null;

  return (
    <div className="flex flex-col gap-3">
      <FieldList
        fields={[
          { label: 'data', value: data.data },
          { label: 'oracle', value: data.oracle, copy: true },
        ]}
      />

      {signedData && (
        <section className="flex flex-col gap-2 border-t border-base-300 pt-3" aria-label="Signed data">
          <h4 className="m-0 text-body font-semibold">Signed data</h4>
          <FieldList
            fields={[
              { label: 'type', value: signedData.type },
              { label: 'value', value: signedData.value },
              { label: 'signature', value: signedData.signature, copy: true },
            ]}
          />
        </section>
      )}

      {!signedData && data.signature ? (
        <FieldList fields={[{ label: 'signature', value: data.signature, copy: true }]} />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fallback: generic highlighted JSON                                */
/* ------------------------------------------------------------------ */

function RenderGenericObject({ data }: { data: unknown }) {
  const json = (safeStringify(data, 2) as string | undefined) ?? String(data);
  return (
    <pre className="m-0 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-field bg-base-200 p-3 text-left font-mono text-data">
      <JsonHighlight json={json} />
    </pre>
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
  const network = useSnapExplorerNetwork();
  const parsed = parseSnapResponse(response);

  // Raw mode: highlighted JSON
  if (showRaw) {
    return <RenderGenericObject data={parsed} />;
  }

  // Check for transaction-like responses (sendTransaction, createToken, nano contract tx)
  if (isTransactionLike(parsed)) {
    return <TransactionResponseDisplay response={parsed} network={network} />;
  }

  // Check for {type, response} envelope
  if (isSnapEnvelope(parsed)) {
    const { type, response: inner } = parsed;
    const obj = inner && typeof inner === 'object' ? (inner as Record<string, unknown>) : null;
    let formatted: React.ReactNode = null;

    switch (type) {
      case RpcResponseType.GetAddress:
        if (obj) formatted = <RenderGetAddress data={obj} />;
        break;

      case RpcResponseType.GetBalance:
        if (Array.isArray(inner)) formatted = <RenderGetBalance data={inner as BalanceItem[]} />;
        break;

      case RpcResponseType.GetConnectedNetwork:
        if (obj) formatted = <RenderGetNetwork data={obj} />;
        break;

      case RpcResponseType.GetUtxos:
        if (obj) formatted = <RenderGetUtxos data={obj} />;
        break;

      case RpcResponseType.SignWithAddress:
        if (obj) formatted = <RenderSignWithAddress data={obj} />;
        break;

      case RpcResponseType.SignOracleData:
        if (obj) formatted = <RenderSignOracleData data={obj} />;
        break;

      case RpcResponseType.ChangeNetwork:
        if (obj) formatted = <RenderChangeNetwork data={obj} />;
        break;

      case RpcResponseType.GetXpub:
        if (obj) formatted = <RenderGetXpub data={obj} />;
        break;

      case RpcResponseType.GetWalletInformation:
        if (obj) formatted = <RenderGetWalletInformation data={obj} />;
        break;

      default:
        // Transaction-like responses (sendTransaction, createToken,
        // sendNanoContractTx, createNanoContractCreateTokenTx)
        if (isTransactionLike(inner)) {
          formatted = <TransactionResponseDisplay response={inner} network={network} />;
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
