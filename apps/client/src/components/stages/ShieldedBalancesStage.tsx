/**
 * Shielded balances: the HTR balance split into transparent and shielded
 * UTXOs, as the QA server decodes it (native provider) and as the browser
 * decodes it (WASM, receive and view only), side by side.
 */

import { useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { DECIMAL_PLACES } from '@hathor/wallet-lib/lib/constants';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { CapabilityBadge } from '../common/CapabilityBadge';
import { Identifier } from '../common/Identifier';
import { ShieldedBadge } from '../common/ShieldedBadge';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { DataTable } from '../ui/DataTable';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { VEIL_STRIP } from '../ui/veil';
import {
  ClientWalletPicker,
  QaServerDownCallout,
  QaServerErrorCallout,
  SessionPicker,
} from '../shielded/QaServerParts';
import { useServerSessions } from '../../hooks/useServerSessions';
import { useRequireHelperServer } from '../../hooks/useRequirements';
import { useAppSelector } from '../../store/hooks';
import { isSessionShieldedReady } from '../../store/slices/qaServerSlice';
import { walletInstancesMap } from '../../store/slices/walletStoreSlice';
import { qaServerClient, toErrorInfo, type QaServerErrorInfo } from '../../services/qaServerClient';
import { canCreateShieldedOutputs } from '../../services/shieldedCapability';
import { NETWORK_CONFIG } from '../../constants/network';
import { formatAmount } from '../../utils/amount';
import { clientBreakdown, serverBreakdown, type BalanceBreakdown } from '../../utils/shieldedBalances';

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

function BreakdownView({ data }: { data: Loaded }) {
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
      <p className="m-0 text-caption text-ink-muted">
        Loaded {new Date(data.at).toLocaleTimeString([], { hour12: false })}
      </p>
    </div>
  );
}

function ServerSide() {
  const { sessions, labels, online } = useServerSessions();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<QaServerErrorInfo | null>(null);
  const session = sessions.find((s) => s.id === sessionId) ?? null;
  const ready = sessions.filter((s) => s.state === 'ready');

  useEffect(() => {
    if (!sessionId && ready.length === 1) setSessionId(ready[0].id);
  }, [sessionId, ready]);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const [balance, transparent, shielded] = await Promise.all([
        qaServerClient.getBalance(session.id),
        qaServerClient.getUtxos(session.id, { shielded: false }),
        qaServerClient.getUtxos(session.id, { shielded: true }),
      ]);
      setData({
        breakdown: serverBreakdown(balance, transparent.utxos, shielded.utxos),
        utxos: [...shielded.utxos, ...transparent.utxos].map((u) => ({ ...u, value: BigInt(u.value) })),
        at: Date.now(),
      });
    } catch (err) {
      setError(toErrorInfo(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
    setError(null);
    if (session?.state === 'ready') void load();
  }, [session?.id, session?.state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Panel
      title="QA server"
      description="Native provider: decodes and can spend shielded outputs."
      actions={
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void load()}
          disabled={!session || session.state !== 'ready' || loading}
        >
          {loading ? (
            <span className="loading loading-spinner loading-xs" aria-hidden="true" />
          ) : (
            <MdRefresh aria-hidden="true" />
          )}
          Reload
        </button>
      }
    >
      {!online ? (
        <EmptyState>The server side appears once the QA server is running.</EmptyState>
      ) : (
        <>
          <SessionPicker sessions={sessions} labels={labels} value={sessionId} onChange={setSessionId} onlyReady />
          {session && (
            <p className="m-0 flex items-center gap-2 text-caption text-ink-muted">
              Capability
              <CapabilityBadge
                level={session.capability?.level}
                canCreateShieldedOutputs={isSessionShieldedReady(session)}
              />
            </p>
          )}
          {error && <QaServerErrorCallout error={error} title="Could not load the server balance" />}
          {loading && !data && <span className="skeleton block h-24 w-full" />}
          {data && <BreakdownView data={data} />}
          {!session && <EmptyState>Choose a ready server wallet to load its balance.</EmptyState>}
        </>
      )}
    </Panel>
  );
}

function ClientSide() {
  const wallets = useAppSelector((s) => s.walletStore.wallets);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wallet = walletId ? wallets[walletId] : undefined;
  const supportsShielded = wallet ? NETWORK_CONFIG[wallet.metadata.network].supportsShielded : false;

  const load = async () => {
    const instance = walletId ? walletInstancesMap.get(walletId) : null;
    if (!instance) return;
    setLoading(true);
    setError(null);
    try {
      const [balance, transparent, shielded] = await Promise.all([
        instance.getBalance('00'),
        instance.getUtxos({ token: '00', shielded: false }),
        supportsShielded ? instance.getUtxos({ token: '00', shielded: true }) : Promise.resolve(null),
      ]);
      const shieldedUtxos = shielded?.utxos ?? [];
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
        breakdown: clientBreakdown(balance, transparent, { utxos: shieldedUtxos }),
        utxos: [...toRows(shieldedUtxos, true), ...toRows(transparent.utxos, false)],
        at: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
    setError(null);
    if (wallet?.status === 'ready') void load();
  }, [walletId, wallet?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Panel
      title="Browser"
      description="WASM provider: receives and decrypts shielded outputs, cannot spend them."
      actions={
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void load()}
          disabled={wallet?.status !== 'ready' || loading}
        >
          {loading ? (
            <span className="loading loading-spinner loading-xs" aria-hidden="true" />
          ) : (
            <MdRefresh aria-hidden="true" />
          )}
          Reload
        </button>
      }
    >
      <ClientWalletPicker value={walletId} onChange={setWalletId} onlyReady />
      {wallet && (
        <p className="m-0 flex items-center gap-2 text-caption text-ink-muted">
          Capability
          <CapabilityBadge
            level={wallet.shieldedCapability?.level ?? 'none'}
            canCreateShieldedOutputs={canCreateShieldedOutputs(wallet.shieldedCapability)}
          />
        </p>
      )}
      {wallet && !supportsShielded && (
        <Callout tone="info">
          {NETWORK_CONFIG[wallet.metadata.network].label} has no shielded outputs; only transparent UTXOs are listed.
        </Callout>
      )}
      {error && <ErrorState message="Could not load the browser balance" detail={error} onRetry={() => void load()} />}
      {loading && !data && <span className="skeleton block h-24 w-full" />}
      {data && <BreakdownView data={data} />}
      {!wallet && <EmptyState>Choose a started client wallet to load its balance.</EmptyState>}
    </Panel>
  );
}

export function ShieldedBalancesStage() {
  const server = useRequireHelperServer();
  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="shielded-balances" />
      <PreconditionStrip requirements={[server]} />
      <QaServerDownCallout />
      <Callout tone="shielded">
        wallet-lib counts shielded outputs in the token balance with no split, so the shielded share comes from the
        UTXOs: <code className="font-mono text-data-sm">getUtxos(&#123; shielded: true &#125;)</code> lists shielded
        UTXOs only, and the default lists transparent ones only. Load the same wallet on both sides to compare what each
        decodes.
      </Callout>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <ServerSide />
        <ClientSide />
      </div>
    </div>
  );
}

export default ShieldedBalancesStage;
