/**
 * Shielded transaction inspector: the fullnode's view of a transaction with
 * its shielded outputs highlighted, plus what a QA server wallet and a
 * browser wallet can unblind (`getShieldedUnblindingForTx`). Decrypted
 * values are merged into the output table.
 */

import { useState } from 'react';
import { MdLockOpen, MdSearch, MdVisibility } from 'react-icons/md';
import { DECIMAL_PLACES } from '@hathor/wallet-lib/lib/constants';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { TxIdDisplay } from '../common/TxIdDisplay';
import { Identifier } from '../common/Identifier';
import { JsonPanel } from '../common/JsonPanel';
import { ShieldedBadge } from '../common/ShieldedBadge';
import { HiddenAmount } from '../common/HiddenAmount';
import { CapabilityBadge } from '../common/CapabilityBadge';
import NetworkChip from '../common/NetworkChip';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { DataTable } from '../ui/DataTable';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { ClientWalletPicker, QaServerErrorCallout, SessionPicker } from '../shielded/QaServerParts';
import { useServerSessions } from '../../hooks/useServerSessions';
import { useAppSelector } from '../../store/hooks';
import { selectActiveNetwork } from '../../store/slices/networkSlice';
import { isSessionShieldedReady } from '../../store/slices/qaServerSlice';
import { walletInstancesMap } from '../../store/slices/walletStoreSlice';
import { qaServerClient, toErrorInfo, type QaServerErrorInfo } from '../../services/qaServerClient';
import { canCreateShieldedOutputs } from '../../services/shieldedCapability';
import { NETWORK_CONFIG, NETWORK_KEYS, type NetworkKey } from '../../constants/network';
import { formatAmount } from '../../utils/amount';
import {
  inspectFullnodeTx,
  normalizeOpenings,
  type Decrypter,
  type FullnodeTx,
  type InspectedInput,
  type InspectedOutput,
  type Openings,
} from '../../utils/shieldedTx';
import type { Requirement } from '../../utils/requirements';

const TX_ID_RE = /^[0-9a-f]{64}$/i;

interface Fetched {
  tx: FullnodeTx;
  meta: Record<string, unknown> | null;
  network: NetworkKey;
}

function PrivacyCell({ privacy }: { privacy: InspectedOutput['privacy'] }) {
  if (privacy === 'TRANSPARENT') return <span className="text-caption text-ink-muted">Transparent</span>;
  return <ShieldedBadge variant={privacy === 'FULLY_SHIELDED' ? 'full' : 'amount'} />;
}

const DECRYPTER_WORD: Record<Decrypter, string> = { server: 'server', client: 'browser' };

function ValueCell({ value, token, by }: { value: bigint | null; token: string | null; by: Decrypter[] }) {
  if (value === null) return <HiddenAmount />;
  const text = formatAmount(value, DECIMAL_PLACES, { grouping: true });
  return (
    <span className="inline-flex items-center gap-1">
      {text}
      {token === '00' && <span className="font-sans text-caption text-ink-muted">HTR</span>}
      {by.length > 0 && (
        <MdVisibility
          className="text-accent"
          aria-label={`Decrypted by the ${by.map((b) => DECRYPTER_WORD[b]).join(' and ')} wallet`}
          title={`Decrypted by the ${by.map((b) => DECRYPTER_WORD[b]).join(' and ')} wallet`}
        />
      )}
    </span>
  );
}

function TokenCell({ token }: { token: string | null }) {
  if (token === null) return <HiddenAmount title="Token hidden (fully shielded)" />;
  if (token === '00') return <span className="font-sans">HTR</span>;
  return <Identifier value={token} kind="token" />;
}

function TxView({ fetched, openings }: { fetched: Fetched; openings: Partial<Record<Decrypter, Openings>> }) {
  const inspected = inspectFullnodeTx(fetched.tx, openings);
  const ts = fetched.tx.timestamp ? new Date(fetched.tx.timestamp * 1000) : null;
  const firstBlock = typeof fetched.meta?.first_block === 'string' ? fetched.meta.first_block : null;
  const shieldedOutputs = inspected.outputs.filter((o) => o.commitment);

  return (
    <>
      <Panel
        title="Summary"
        actions={
          inspected.shieldedCount > 0 ? (
            <ShieldedBadge variant="count" count={inspected.shieldedCount} total={inspected.outputCount} />
          ) : (
            <span className="text-caption text-ink-muted">No shielded outputs</span>
          )
        }
      >
        <TxIdDisplay hash={inspected.hash} network={fetched.network} />
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
          <dt className="text-ink-muted">Network</dt>
          <dd className="m-0">
            <NetworkChip network={fetched.network} size="sm" />
          </dd>
          {ts && (
            <>
              <dt className="text-ink-muted">Timestamp</dt>
              <dd className="m-0 font-mono text-data">{ts.toLocaleString([], { hour12: false })}</dd>
            </>
          )}
          <dt className="text-ink-muted">First block</dt>
          <dd className="m-0">
            {firstBlock ? (
              <Identifier value={firstBlock} kind="tx" />
            ) : (
              <span className="text-ink-muted">not confirmed yet</span>
            )}
          </dd>
        </dl>
        {inspected.hiddenCount > 0 && (
          <Callout tone="shielded">
            {inspected.hiddenCount} {inspected.hiddenCount === 1 ? 'amount is' : 'amounts are'} hidden. Unblind with a
            server or browser wallet that received or spent them (below) to see the values.
          </Callout>
        )}
      </Panel>

      <Panel title="Outputs" description={`${inspected.outputCount} outputs, ${inspected.shieldedCount} shielded`}>
        <DataTable<InspectedOutput>
          caption="Outputs"
          rows={inspected.outputs}
          getRowKey={(o) => String(o.index)}
          rowClassName={(o) => (o.privacy === 'TRANSPARENT' ? '' : 'bg-tint-shielded')}
          columns={[
            { key: 'index', header: '#', value: (o) => o.index },
            { key: 'privacy', header: 'Privacy', render: (o) => <PrivacyCell privacy={o.privacy} /> },
            {
              key: 'recipient',
              header: 'Recipient',
              type: 'identifier',
              render: (o) => (o.address ? <Identifier value={o.address} kind="address" /> : null),
            },
            { key: 'token', header: 'Token', render: (o) => <TokenCell token={o.token} /> },
            {
              key: 'amount',
              header: 'Amount',
              type: 'amount',
              render: (o) => <ValueCell value={o.value} token={o.token} by={o.decryptedBy} />,
            },
          ]}
        />
        {shieldedOutputs.map((o) => (
          <JsonPanel
            key={o.index}
            title={`Commitment, output #${o.index}`}
            value={o.commitment}
            collapsible
            defaultCollapsed
          />
        ))}
      </Panel>

      <Panel title="Inputs" description={`${inspected.inputs.length} input${inspected.inputs.length === 1 ? '' : 's'}`}>
        <DataTable<InspectedInput>
          caption="Inputs"
          rows={inspected.inputs}
          getRowKey={(i) => String(i.index)}
          empty="No inputs."
          columns={[
            { key: 'index', header: '#', value: (i) => i.index },
            {
              key: 'spent',
              header: 'Spent output',
              type: 'identifier',
              render: (i) => (
                <span className="inline-flex items-center gap-1">
                  <Identifier value={i.spent.txId} kind="tx" />
                  <span className="text-ink-muted">:{i.spent.index}</span>
                </span>
              ),
            },
            {
              key: 'privacy',
              header: 'Privacy',
              render: (i) =>
                i.shielded ? <ShieldedBadge /> : <span className="text-caption text-ink-muted">Transparent</span>,
            },
            {
              key: 'address',
              header: 'Address',
              type: 'identifier',
              render: (i) => (i.address ? <Identifier value={i.address} kind="address" /> : null),
            },
            {
              key: 'amount',
              header: 'Amount',
              type: 'amount',
              render: (i) => <ValueCell value={i.value} token={i.token} by={i.decryptedBy} />,
            },
          ]}
        />
      </Panel>

      <JsonPanel
        title="Fullnode response"
        value={{ tx: fetched.tx, meta: fetched.meta }}
        collapsible
        defaultCollapsed
      />
    </>
  );
}

type UnblindState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; raw: unknown; openings: Openings }
  | { kind: 'server-error'; error: QaServerErrorInfo }
  | { kind: 'error'; message: string };

function UnblindResult({ state, who }: { state: UnblindState; who: string }) {
  switch (state.kind) {
    case 'idle':
      return null;
    case 'loading':
      return <span className="skeleton block h-16 w-full" />;
    case 'server-error':
      return <QaServerErrorCallout error={state.error} title={`Unblinding on the ${who} failed`} />;
    case 'error':
      return <ErrorState message={`Unblinding in the ${who} failed`} detail={state.message} />;
    case 'done': {
      const n = state.openings.outputs.length + state.openings.inputs.length;
      return (
        <div data-result="success" className="flex flex-col gap-2">
          {n === 0 ? (
            <Callout tone="info" title="Nothing to unblind">
              This wallet holds no unblinding data for this transaction: none of its shielded outputs or inputs are this
              wallet's.
            </Callout>
          ) : (
            <p className="m-0 text-caption">
              <span className="font-semibold text-success">
                Unblinded {state.openings.outputs.length} output{state.openings.outputs.length === 1 ? '' : 's'} and{' '}
                {state.openings.inputs.length} input{state.openings.inputs.length === 1 ? '' : 's'}
              </span>
              <span className="text-ink-muted">; values are merged into the tables above.</span>
            </p>
          )}
          <JsonPanel title="getShieldedUnblindingForTx" value={state.raw} collapsible defaultCollapsed={n === 0} />
        </div>
      );
    }
  }
}

function ServerUnblind({
  txId,
  state,
  setState,
}: {
  txId: string | null;
  state: UnblindState;
  setState: (s: UnblindState) => void;
}) {
  const { sessions, labels, online } = useServerSessions();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const session = sessions.find((s) => s.id === sessionId) ?? null;

  let unavailable: string | null = null;
  if (!online) unavailable = 'Not available: the QA server is not running.';
  else if (!txId) unavailable = 'Inspect a transaction first.';
  else if (!session) unavailable = 'Choose a ready server wallet.';

  const run = async () => {
    if (!session || !txId) return;
    setState({ kind: 'loading' });
    try {
      const raw = await qaServerClient.getUnblinding(session.id, txId);
      setState({ kind: 'done', raw, openings: normalizeOpenings(raw) });
    } catch (err) {
      setState({ kind: 'server-error', error: toErrorInfo(err) });
    }
  };

  return (
    <Panel
      title="Server unblinding"
      description="GET /wallets/:id/tx/:txId/unblinding on a QA server wallet."
      footer={
        <>
          {unavailable && <span className="text-caption text-ink-muted">{unavailable}</span>}
          <button
            type="button"
            className="btn btn-secondary btn-sm ml-auto"
            disabled={!!unavailable || state.kind === 'loading'}
            onClick={() => void run()}
          >
            <MdLockOpen aria-hidden="true" />
            Unblind on server
          </button>
        </>
      }
    >
      {online ? (
        <SessionPicker sessions={sessions} labels={labels} value={sessionId} onChange={setSessionId} onlyReady />
      ) : (
        <EmptyState>Not available: start the QA server to unblind with a server wallet.</EmptyState>
      )}
      {session && (
        <p className="m-0 flex items-center gap-2 text-caption text-ink-muted">
          Decrypting with
          <CapabilityBadge
            level={session.capability?.level}
            canCreateShieldedOutputs={isSessionShieldedReady(session)}
          />
        </p>
      )}
      <UnblindResult state={state} who="server" />
    </Panel>
  );
}

function ClientUnblind({
  txId,
  state,
  setState,
}: {
  txId: string | null;
  state: UnblindState;
  setState: (s: UnblindState) => void;
}) {
  const wallets = useAppSelector((s) => s.walletStore.wallets);
  const [walletId, setWalletId] = useState<string | null>(null);
  const wallet = walletId ? wallets[walletId] : undefined;
  const supportsShielded = wallet ? NETWORK_CONFIG[wallet.metadata.network].supportsShielded : false;

  let unavailable: string | null = null;
  if (!txId) unavailable = 'Inspect a transaction first.';
  else if (!wallet) unavailable = 'Choose a started client wallet.';
  else if (!supportsShielded)
    unavailable = `Not available: ${NETWORK_CONFIG[wallet.metadata.network].label} has no shielded outputs.`;

  const run = async () => {
    const instance = walletId ? walletInstancesMap.get(walletId) : null;
    if (!instance || !txId) return;
    setState({ kind: 'loading' });
    try {
      const raw = await instance.getShieldedUnblindingForTx(txId);
      setState({ kind: 'done', raw, openings: normalizeOpenings(raw) });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <Panel
      title="Browser unblinding"
      description="getShieldedUnblindingForTx on a client wallet (WASM provider)."
      footer={
        <>
          {unavailable && <span className="text-caption text-ink-muted">{unavailable}</span>}
          <button
            type="button"
            className="btn btn-secondary btn-sm ml-auto"
            disabled={!!unavailable || state.kind === 'loading'}
            onClick={() => void run()}
          >
            <MdLockOpen aria-hidden="true" />
            Unblind in browser
          </button>
        </>
      }
    >
      <ClientWalletPicker value={walletId} onChange={setWalletId} onlyReady />
      {wallet && (
        <p className="m-0 flex items-center gap-2 text-caption text-ink-muted">
          Decrypting with
          <CapabilityBadge
            level={wallet.shieldedCapability?.level ?? 'none'}
            canCreateShieldedOutputs={canCreateShieldedOutputs(wallet.shieldedCapability)}
          />
        </p>
      )}
      <UnblindResult state={state} who="browser" />
    </Panel>
  );
}

export function ShieldedInspectorStage() {
  const activeNetwork = useAppSelector(selectActiveNetwork);
  const [network, setNetwork] = useState<NetworkKey | null>(null);
  const [txInput, setTxInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [server, setServer] = useState<UnblindState>({ kind: 'idle' });
  const [client, setClient] = useState<UnblindState>({ kind: 'idle' });

  // Default to the active network when it has shielded outputs, else Shielded testnet.
  const chosenNetwork =
    network ?? (NETWORK_CONFIG[activeNetwork].supportsShielded ? activeNetwork : 'SHIELDED_TESTNET');
  const txId = txInput.trim();
  const validTx = TX_ID_RE.test(txId);

  const inspect = async () => {
    if (!validTx) return;
    setLoading(true);
    setFetchError(null);
    setFetched(null);
    setServer({ kind: 'idle' });
    setClient({ kind: 'idle' });
    try {
      const res = await fetch(`${NETWORK_CONFIG[chosenNetwork].fullNodeUrl}transaction?id=${txId}`);
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        tx?: FullnodeTx;
        meta?: Record<string, unknown>;
      } | null;
      if (!res.ok || !body?.success || !body.tx) {
        throw new Error(body?.message ?? `The fullnode answered HTTP ${res.status}`);
      }
      setFetched({ tx: body.tx, meta: body.meta ?? null, network: chosenNetwork });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const openings: Partial<Record<Decrypter, Openings>> = {};
  if (server.kind === 'done') openings.server = server.openings;
  if (client.kind === 'done') openings.client = client.openings;

  const requirements: Requirement[] = [
    NETWORK_CONFIG[chosenNetwork].supportsShielded
      ? {
          id: 'network',
          short: 'Shielded network',
          met: true,
          label: `Looking up on ${NETWORK_CONFIG[chosenNetwork].label}`,
        }
      : {
          id: 'network',
          short: 'Shielded network',
          met: false,
          label: `${NETWORK_CONFIG[chosenNetwork].label} has no shielded outputs`,
          action: 'Choose Shielded testnet',
        },
  ];

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="shielded-inspector" />
      <PreconditionStrip requirements={requirements} />

      <Panel title="Transaction" description="Any transaction on the chosen network's fullnode.">
        <form
          className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            void inspect();
          }}
        >
          <Field label="Transaction id" error={txId && !validTx ? '64 hex characters expected' : undefined}>
            <input
              className="input w-full font-mono text-data"
              value={txInput}
              onChange={(e) => setTxInput(e.target.value)}
              placeholder="0000a3f1…"
              spellCheck={false}
              autoComplete="off"
            />
          </Field>
          <Field label="Network">
            <select
              className="select w-full"
              value={chosenNetwork}
              onChange={(e) => setNetwork(e.target.value as NetworkKey)}
            >
              {NETWORK_KEYS.map((k) => (
                <option key={k} value={k}>
                  {NETWORK_CONFIG[k].label}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" className="btn btn-primary" disabled={!validTx || loading}>
            {loading ? (
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
            ) : (
              <MdSearch aria-hidden="true" />
            )}
            Inspect
          </button>
        </form>
      </Panel>

      {fetchError && (
        <div data-result="error">
          <ErrorState
            message="Could not load the transaction from the fullnode"
            detail={fetchError}
            onRetry={() => void inspect()}
          />
        </div>
      )}
      {loading && <span className="skeleton block h-32 w-full rounded-box" />}
      {fetched ? (
        <TxView fetched={fetched} openings={openings} />
      ) : (
        !loading &&
        !fetchError && (
          <Panel>
            <EmptyState>
              The transaction, its shielded outputs and their unblinding appear here. Enter a transaction id.
            </EmptyState>
          </Panel>
        )
      )}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <ServerUnblind txId={fetched ? fetched.tx.hash : null} state={server} setState={setServer} />
        <ClientUnblind txId={fetched ? fetched.tx.hash : null} state={client} setState={setClient} />
      </div>
    </div>
  );
}

export default ShieldedInspectorStage;
