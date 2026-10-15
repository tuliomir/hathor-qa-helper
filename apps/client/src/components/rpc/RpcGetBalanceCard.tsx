/**
 * RPC Get Balance Card — htr_getBalance for the test wallet's known tokens.
 */

import React, { useState } from 'react';
import { MdAdd, MdClose, MdRefresh } from 'react-icons/md';
import { DECIMAL_PLACES, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import type { MethodData } from '../common/MethodCard';
import { RpcMethodCard } from './RpcMethodCard';
import { Identifier } from '../common/Identifier';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { Field } from '../ui/Field';
import { formatAmount } from '../../utils/amount';
import { buildGetBalanceRequest, unwrapResponse } from '../../utils/rpcCoreRequests';

export interface BalanceToken {
  uid: string;
  name: string;
  symbol: string;
}

interface BalanceRow {
  token?: { id?: string; uid?: string; name?: string; symbol?: string };
  balance?: { unlocked?: string | number; locked?: string | number };
  transactions?: number;
  tokenAuthorities?: { unlocked?: { mint?: number | boolean; melt?: number | boolean } };
}

function amount(v: string | number | undefined) {
  if (v === undefined || v === null) return null;
  const s = String(v);
  return /^-?\d+$/.test(s) ? formatAmount(s, DECIMAL_PLACES) : s;
}

function BalanceTable({ rows }: { rows: BalanceRow[] }) {
  return (
    <DataTable<BalanceRow>
      caption="Balances"
      rows={rows}
      getRowKey={(r, i) => r.token?.id ?? r.token?.uid ?? String(i)}
      empty="The wallet returned no balances."
      columns={[
        { key: 'symbol', header: 'Token', value: (r) => r.token?.symbol ?? r.token?.name },
        {
          key: 'uid',
          header: 'UID',
          type: 'identifier',
          render: (r) => {
            const id = r.token?.id ?? r.token?.uid;
            return id ? <Identifier value={id} kind="token" /> : null;
          },
        },
        { key: 'unlocked', header: 'Unlocked', type: 'amount', value: (r) => amount(r.balance?.unlocked) },
        { key: 'locked', header: 'Locked', type: 'amount', value: (r) => amount(r.balance?.locked) },
        { key: 'txs', header: 'Txs', type: 'amount', value: (r) => r.transactions ?? null },
        {
          key: 'auth',
          header: 'Mint / melt',
          value: (r) => {
            const a = r.tokenAuthorities?.unlocked;
            return a ? `${Number(a.mint ?? 0)} / ${Number(a.melt ?? 0)}` : null;
          },
        },
      ]}
    />
  );
}

/** Adds a token by UID or configuration string; `onAdd` returns an error message or null. */
function AddTokenField({ onAdd }: { onAdd: (input: string) => string | null }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    const problem = onAdd(value);
    setError(problem);
    if (!problem) setValue('');
  };
  return (
    <Field
      label="Add a token"
      htmlFor="get-balance-add-token"
      hint="A token UID or a configuration string, e.g. [Name:SYMBOL:uid:checksum]."
      error={error ?? undefined}
      wireControl={false}
    >
      <div className="flex gap-2">
        <input
          id="get-balance-add-token"
          aria-describedby="get-balance-add-token-hint"
          aria-invalid={error ? true : undefined}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && add()}
          placeholder="Token UID or configuration string"
          autoComplete="off"
          spellCheck={false}
          className={`input w-full font-mono text-data ${error ? 'input-error' : ''}`}
        />
        <button type="button" className="btn btn-secondary" onClick={add} disabled={!value.trim()}>
          <MdAdd aria-hidden="true" />
          Add
        </button>
      </div>
    </Field>
  );
}

export interface RpcGetBalanceCardProps {
  onExecute: () => Promise<unknown>;
  methodData: MethodData | null;
  isDryRun: boolean;
  disabledReason?: string | null;
  tokens: BalanceToken[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /**
   * For test wallets that can't list their own tokens (address-only): adds
   * a token from user input and returns an error message or null.
   */
  onAddToken?: (input: string) => string | null;
  onRemoveToken?: (uid: string) => void;
}

export const RpcGetBalanceCard: React.FC<RpcGetBalanceCardProps> = ({
  onExecute,
  methodData,
  isDryRun,
  disabledReason = null,
  tokens,
  onRefresh,
  isRefreshing = false,
  onAddToken,
  onRemoveToken,
}) => {
  const columns: DataTableColumn<BalanceToken>[] = [
    { key: 'symbol', header: 'Symbol', value: (t) => t.symbol },
    { key: 'name', header: 'Name', value: (t) => t.name },
    { key: 'uid', header: 'UID', type: 'identifier', render: (t) => <Identifier value={t.uid} kind="token" /> },
  ];
  if (onRemoveToken) {
    columns.push({
      key: 'remove',
      header: <span className="sr-only">Remove</span>,
      type: 'actions',
      hideLabelWhenStacked: true,
      render: (t) =>
        t.uid === NATIVE_TOKEN_UID ? null : (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square"
            onClick={() => onRemoveToken(t.uid)}
            aria-label={`Remove ${t.symbol}`}
            title="Remove"
          >
            <MdClose aria-hidden="true" />
          </button>
        ),
    });
  }
  return (
    <RpcMethodCard
      title="Get balance"
      liveRequest={buildGetBalanceRequest(tokens.map((t) => t.uid))}
      methodData={methodData}
      isDryRun={isDryRun}
      onExecute={onExecute}
      disabledReason={disabledReason}
      successToast="Balance received"
      renderResponse={(response) => {
        const rows = unwrapResponse<BalanceRow[]>(response);
        return Array.isArray(rows) ? <BalanceTable rows={rows} /> : undefined;
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-body font-medium">Tokens to query</h3>
          {onRefresh && (
            <button type="button" className="btn btn-ghost btn-xs ml-auto" onClick={onRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              ) : (
                <MdRefresh aria-hidden="true" />
              )}
              Refresh tokens
            </button>
          )}
        </div>
        <p className="m-0 text-caption text-ink-muted">
          {onAddToken
            ? 'HTR plus the tokens you add: an address-only test wallet can’t list its own.'
            : "HTR plus the test wallet's custom tokens."}
        </p>
        <DataTable<BalanceToken> caption="Tokens to query" rows={tokens} getRowKey={(t) => t.uid} columns={columns} />
        {onAddToken && <AddTokenField onAdd={onAddToken} />}
      </div>
    </RpcMethodCard>
  );
};
