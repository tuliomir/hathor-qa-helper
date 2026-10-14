/**
 * RPC Get Balance Card — htr_getBalance for the test wallet's known tokens.
 */

import React from 'react';
import { MdRefresh } from 'react-icons/md';
import { DECIMAL_PLACES } from '@hathor/wallet-lib/lib/constants';
import { MethodCard, type MethodData } from '../common/MethodCard';
import { Identifier } from '../common/Identifier';
import { DataTable } from '../ui/DataTable';
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

export interface RpcGetBalanceCardProps {
  onExecute: () => Promise<unknown>;
  methodData: MethodData | null;
  isDryRun: boolean;
  disabledReason?: string | null;
  tokens: BalanceToken[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const RpcGetBalanceCard: React.FC<RpcGetBalanceCardProps> = ({
  onExecute,
  methodData,
  isDryRun,
  disabledReason = null,
  tokens,
  onRefresh,
  isRefreshing = false,
}) => (
  <MethodCard
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
      <p className="m-0 text-caption text-ink-muted">HTR plus the test wallet's custom tokens.</p>
      <DataTable<BalanceToken>
        caption="Tokens to query"
        rows={tokens}
        getRowKey={(t) => t.uid}
        columns={[
          { key: 'symbol', header: 'Symbol', value: (t) => t.symbol },
          { key: 'name', header: 'Name', value: (t) => t.name },
          { key: 'uid', header: 'UID', type: 'identifier', render: (t) => <Identifier value={t.uid} kind="token" /> },
        ]}
      />
    </div>
  </MethodCard>
);
