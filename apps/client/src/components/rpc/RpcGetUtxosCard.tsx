/**
 * RPC Get UTXOs Card — htr_getUtxos for one token, with count and amount
 * filters.
 */

import React from 'react';
import { DECIMAL_PLACES } from '@hathor/wallet-lib/lib/constants';
import type { GetUtxosResponse, UtxoData } from '../../store/slices/getUtxosSlice';
import { MethodCard, type MethodData } from '../common/MethodCard';
import { Identifier } from '../common/Identifier';
import { ExplorerLink } from '../common/ExplorerLink';
import { AmountInput } from '../common/AmountInput';
import { Field } from '../ui/Field';
import { DataTable } from '../ui/DataTable';
import { StatusChip } from '../ui/StatusChip';
import { formatAmount } from '../../utils/amount';
import { buildGetUtxosRequest, unwrapResponse, type UtxoFilters } from '../../utils/rpcCoreRequests';

const fmt = (v: string | number | undefined) =>
  v === undefined || v === null
    ? null
    : /^-?\d+$/.test(String(v))
      ? formatAmount(String(v), DECIMAL_PLACES)
      : String(v);

function UtxoResponse({ data }: { data: GetUtxosResponse }) {
  const totals = [
    { label: 'Available', amount: data.total_amount_available, count: data.total_utxos_available },
    { label: 'Locked', amount: data.total_amount_locked, count: data.total_utxos_locked },
  ];
  return (
    <div className="flex flex-col gap-3">
      <dl className="m-0 grid grid-cols-2 gap-3">
        {totals.map((t) => (
          <div key={t.label} className="flex flex-col gap-0.5 rounded-box bg-base-200 p-3">
            <dt className="text-caption text-ink-muted">{t.label}</dt>
            <dd className="m-0 font-mono text-data tabular-nums">
              {fmt(t.amount) ?? 'n/a'} <span className="font-sans text-ink-muted">in {t.count ?? 0} UTXOs</span>
            </dd>
          </div>
        ))}
      </dl>
      <DataTable<UtxoData>
        caption="UTXOs"
        rows={data.utxos ?? []}
        getRowKey={(u) => `${u.tx_id}-${u.index}`}
        empty="No UTXOs match these filters."
        maxHeight="24rem"
        columns={[
          {
            key: 'tx',
            header: 'Transaction',
            type: 'identifier',
            render: (u) => (
              <span className="inline-flex items-center gap-2">
                <Identifier value={u.tx_id} kind="tx" />
                <ExplorerLink hash={u.tx_id} />
              </span>
            ),
          },
          { key: 'index', header: 'Index', type: 'amount', value: (u) => u.index },
          {
            key: 'address',
            header: 'Address',
            type: 'identifier',
            render: (u) => <Identifier value={u.address} kind="address" />,
          },
          { key: 'amount', header: 'Amount', type: 'amount', value: (u) => fmt(u.amount) },
          {
            key: 'status',
            header: 'Status',
            type: 'status',
            render: (u) => (
              <StatusChip
                status={u.locked ? 'locked' : 'ready'}
                label={u.locked ? 'Locked' : 'Available'}
                tone={u.locked ? 'idle' : 'success'}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

export interface UtxoToken {
  uid: string;
  name: string;
  symbol: string;
}

export interface RpcGetUtxosCardProps {
  onExecute: () => Promise<unknown>;
  methodData: MethodData | null;
  isDryRun: boolean;
  disabledReason?: string | null;
  filters: UtxoFilters;
  onFiltersChange: (next: UtxoFilters) => void;
  tokens: UtxoToken[];
  isLoadingTokens?: boolean;
}

export const RpcGetUtxosCard: React.FC<RpcGetUtxosCardProps> = ({
  onExecute,
  methodData,
  isDryRun,
  disabledReason = null,
  filters,
  onFiltersChange,
  tokens,
  isLoadingTokens = false,
}) => {
  const set = (patch: Partial<UtxoFilters>) => onFiltersChange({ ...filters, ...patch });
  const token = tokens.find((t) => t.uid === filters.tokenUid);
  const amountToken = { uid: filters.tokenUid, symbol: token?.symbol ?? 'HTR' };

  return (
    <MethodCard
      title="Get UTXOs"
      liveRequest={buildGetUtxosRequest(filters)}
      methodData={methodData}
      isDryRun={isDryRun}
      onExecute={onExecute}
      disabledReason={disabledReason}
      successToast="UTXOs received"
      renderResponse={(response) => {
        const data = unwrapResponse<GetUtxosResponse>(response);
        return data && Array.isArray(data.utxos) ? <UtxoResponse data={data} /> : undefined;
      }}
    >
      <Field label="Token" hint="Tokens with an unlocked balance in the test wallet.">
        <select
          className="select w-full"
          value={filters.tokenUid}
          onChange={(e) => set({ tokenUid: e.target.value })}
          disabled={isLoadingTokens || tokens.length === 0}
        >
          {isLoadingTokens ? (
            <option>Loading tokens…</option>
          ) : tokens.length === 0 ? (
            <option>No tokens with balance</option>
          ) : (
            tokens.map((t) => (
              <option key={t.uid} value={t.uid}>
                {t.symbol} ({t.name})
              </option>
            ))
          )}
        </select>
      </Field>
      <Field label="Max UTXOs">
        <input
          type="number"
          min={1}
          step={1}
          value={filters.maxUtxos}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val > 0) set({ maxUtxos: val });
          }}
          className="input w-40 font-mono"
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AmountInput
          label="Amount smaller than"
          value={filters.amountSmallerThan}
          onChange={(v) => set({ amountSmallerThan: v })}
          token={amountToken}
          allowZero
          hint="Optional; empty means no filter."
        />
        <AmountInput
          label="Amount bigger than"
          value={filters.amountBiggerThan}
          onChange={(v) => set({ amountBiggerThan: v })}
          token={amountToken}
          allowZero
          hint="Optional; empty means no filter."
        />
      </div>
    </MethodCard>
  );
};
