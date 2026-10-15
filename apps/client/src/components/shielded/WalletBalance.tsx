/**
 * A wallet's HTR balance split into transparent and shielded UTXOs, as the
 * browser decodes it. wallet-lib counts both in one balance, so the split
 * comes from the UTXO lists (`utils/shieldedBalances.ts`). Reloads when the
 * wallet sees a transaction, so a payment shows up on its own.
 */

import { useCallback, useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { DECIMAL_PLACES } from '@hathor/wallet-lib/lib/constants';
import { Identifier } from '../common/Identifier';
import { ShieldedBadge } from '../common/ShieldedBadge';
import { Callout } from '../ui/Callout';
import { DataTable } from '../ui/DataTable';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { VEIL_STRIP } from '../ui/veil';
import { useAppSelector } from '../../store/hooks';
import { walletInstancesMap } from '../../store/slices/walletStoreSlice';
import { formatAmount } from '../../utils/amount';
import { clientBreakdown, type BalanceBreakdown } from '../../utils/shieldedBalances';

interface UtxoRow {
  txId: string;
  index: number;
  address: string;
  value: bigint;
  shielded: boolean;
  locked: boolean;
}

interface Loaded {
  breakdown: BalanceBreakdown;
  utxos: UtxoRow[];
  at: number;
}

const htr = (v: bigint) => `${formatAmount(v, DECIMAL_PLACES, { grouping: true })} HTR`;

function Amount({ value }: { value: bigint }) {
  return <span className="font-mono text-data tabular-nums">{htr(value)}</span>;
}

function BreakdownView({ data, showUtxos }: { data: Loaded; showUtxos: boolean }) {
  const b = data.breakdown;
  return (
    <div className="flex flex-col gap-3">
      <dl className="m-0 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1 text-body">
        <dt className="text-ink-muted">Balance</dt>
        <dd className="m-0" data-testid="balance-total">
          <Amount value={b.total} />
          {b.locked > 0n && (
            <span className="text-caption text-ink-muted">
              {' '}
              ({htr(b.unlocked)} unlocked, {htr(b.locked)} locked)
            </span>
          )}
        </dd>
        <dt className="text-ink-muted">Transparent UTXOs</dt>
        <dd className="m-0">
          <Amount value={b.transparent.amount} />
          <span className="text-caption text-ink-muted"> in {b.transparent.count}</span>
        </dd>
        <dt className="text-ink-muted">Shielded UTXOs</dt>
        <dd className="m-0" data-testid="balance-shielded">
          <Amount value={b.shielded.amount} />
          <span className="text-caption text-ink-muted"> in {b.shielded.count}</span>
        </dd>
        <dt className="text-ink-muted">Shielded share</dt>
        <dd className="m-0 flex items-center gap-2">
          {b.shieldedSharePct === null ? (
            <span className="text-ink-muted">no UTXOs</span>
          ) : (
            <>
              <span className="relative h-2 w-32 overflow-hidden rounded-full bg-base-300" aria-hidden="true">
                <span
                  className={`absolute inset-y-0 left-0 ${VEIL_STRIP}`}
                  style={{ width: `${b.shieldedSharePct}%` }}
                />
              </span>
              <span className="font-mono text-data">{b.shieldedSharePct}%</span>
            </>
          )}
        </dd>
      </dl>
      {b.unaccounted !== 0n && (
        <Callout tone="warning" title="Balance and UTXOs disagree">
          The balance differs from the listed UTXOs by {htr(b.unaccounted)}. Unconfirmed spends or undecoded shielded
          outputs can cause this.
        </Callout>
      )}
      {showUtxos && (
        <DataTable<UtxoRow>
          caption="UTXOs"
          rows={data.utxos}
          getRowKey={(u) => `${u.txId}:${u.index}`}
          empty="No UTXOs for HTR."
          maxHeight="20rem"
          columns={[
            {
              key: 'kind',
              header: 'Privacy',
              render: (u) =>
                u.shielded ? <ShieldedBadge /> : <span className="text-caption text-ink-muted">Transparent</span>,
            },
            {
              key: 'tx',
              header: 'Output',
              type: 'identifier',
              render: (u) => (
                <span className="inline-flex items-center gap-1">
                  <Identifier value={u.txId} kind="tx" />
                  <span className="text-ink-muted">:{u.index}</span>
                </span>
              ),
            },
            {
              key: 'address',
              header: 'Address',
              type: 'identifier',
              render: (u) => <Identifier value={u.address} kind="address" />,
            },
            { key: 'value', header: 'Amount', type: 'amount', render: (u) => htr(u.value) },
            { key: 'locked', header: 'Locked', value: (u) => (u.locked ? 'locked' : '') },
          ]}
        />
      )}
      <p className="m-0 text-caption text-ink-muted">
        Loaded {new Date(data.at).toLocaleTimeString([], { hour12: false })}
      </p>
    </div>
  );
}

export function WalletBalance({ walletId, showUtxos = true }: { walletId: string | null; showUtxos?: boolean }) {
  const status = useAppSelector((s) => (walletId ? s.walletStore.wallets[walletId]?.status : undefined));
  const lastEvent = useAppSelector((s) => {
    const events = walletId ? s.walletStore.wallets[walletId]?.events : undefined;
    return events && events.length > 0 ? events[events.length - 1].id : null;
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const instance = walletId ? walletInstancesMap.get(walletId) : null;
    if (!instance) return;
    setLoading(true);
    setError(null);
    try {
      const [balance, transparent, shielded] = await Promise.all([
        instance.getBalance('00'),
        instance.getUtxos({ token: '00', shielded: false }),
        instance.getUtxos({ token: '00', shielded: true }),
      ]);
      const toRows = (list: typeof transparent.utxos, shieldedFlag: boolean): UtxoRow[] =>
        list.map((u) => ({
          txId: u.tx_id,
          index: u.index,
          address: u.address,
          value: u.amount,
          locked: u.locked,
          shielded: shieldedFlag,
        }));
      setData({
        breakdown: clientBreakdown(balance, transparent, shielded),
        utxos: [...toRows(shielded.utxos, true), ...toRows(transparent.utxos, false)],
        at: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [walletId]);

  useEffect(() => {
    setData(null);
    setError(null);
  }, [walletId]);

  useEffect(() => {
    if (status === 'ready') void load();
  }, [status, lastEvent, load]);

  if (!walletId) return <EmptyState>Choose a wallet to see its balance.</EmptyState>;
  if (status !== 'ready') return <EmptyState>Start the wallet to see its balance.</EmptyState>;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <span className="loading loading-spinner loading-xs" aria-hidden="true" />
          ) : (
            <MdRefresh aria-hidden="true" />
          )}
          Reload
        </button>
      </div>
      {error && <ErrorState message="Could not load the balance" detail={error} onRetry={() => void load()} />}
      {loading && !data && <span className="skeleton block h-24 w-full" />}
      {data && <BreakdownView data={data} showUtxos={showUtxos} />}
    </div>
  );
}
