/**
 * QA server stage: server health, wallet sessions, starting a client
 * wallet on the server (its seed goes to the local server, never to the
 * screen) and funding a server wallet with a transparent HTR send from a
 * client wallet. The shielded network has no faucet, so funding is how QA
 * gets HTR onto the server.
 */

import { useEffect, useMemo, useState } from 'react';
import { MdRefresh, MdStop } from 'react-icons/md';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import type { WalletSession } from '@qa-helper/shared/serverApi';
import { QA_SERVER_PROXY_PREFIX } from '@qa-helper/shared/serverApi';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { ExecuteBar } from '../common/ExecuteBar';
import { Identifier } from '../common/Identifier';
import { TxIdDisplay } from '../common/TxIdDisplay';
import { AmountInput } from '../common/AmountInput';
import { CapabilityBadge } from '../common/CapabilityBadge';
import NetworkChip from '../common/NetworkChip';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { DataTable } from '../ui/DataTable';
import { StatusChip } from '../ui/StatusChip';
import {
  ClientWalletPicker,
  QaServerDownCallout,
  QaServerErrorCallout,
  SessionPicker,
} from '../shielded/QaServerParts';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  isSessionShieldedReady,
  sessionLabel,
  startServerSession,
  stopServerSession,
} from '../../store/slices/qaServerSlice';
import { useServerSessions } from '../../hooks/useServerSessions';
import { useRequireHelperServer } from '../../hooks/useRequirements';
import { useSendTransaction } from '../../hooks/useSendTransaction';
import { useWalletStore } from '../../hooks/useWalletStore';
import { toErrorInfo, type QaServerErrorInfo } from '../../services/qaServerClient';
import { WALLET_CONFIG, NETWORK_CONFIG } from '../../constants/network';
import { firstUnmetReason } from '../../utils/requirements';
import { fundRequirements } from '../../utils/shieldedFunding';
import { buildTransferTemplate } from '../../services/tokenTransfer';

const SERVER_WORD: Record<string, string> = {
  idle: 'Checking',
  connecting: 'Checking',
  online: 'Running',
  offline: 'Not running',
  error: 'Error',
  'local-only': 'Local only',
};

function ServerPanel() {
  const server = useAppSelector((s) => s.helperServer);
  const online = server.status === 'online';
  const url = `${globalThis.location?.origin ?? ''}${QA_SERVER_PROXY_PREFIX}`;
  return (
    <Panel
      title="Server"
      actions={
        <StatusChip
          status={online ? 'online' : server.status === 'local-only' ? 'off' : server.status}
          label={SERVER_WORD[server.status]}
        />
      }
    >
      {online ? (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
          <dt className="text-ink-muted">URL</dt>
          <dd className="m-0 font-mono text-data">{url}</dd>
          <dt className="text-ink-muted">Version</dt>
          <dd className="m-0 font-mono text-data">{server.version}</dd>
          <dt className="text-ink-muted">Networks</dt>
          <dd className="m-0">{server.networks.join(', ')}</dd>
          <dt className="text-ink-muted">Latency</dt>
          <dd className="m-0 font-mono text-data">{server.latencyMs !== null ? `${server.latencyMs} ms` : 'n/a'}</dd>
        </dl>
      ) : (
        <QaServerDownCallout />
      )}
    </Panel>
  );
}

function StartPanel({ online }: { online: boolean }) {
  const dispatch = useAppDispatch();
  const wallets = useAppSelector((s) => s.walletStore.wallets);
  const labels = useAppSelector((s) => s.qaServer.labels);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<QaServerErrorInfo | null>(null);
  const [started, setStarted] = useState<WalletSession | null>(null);
  const wallet = walletId ? wallets[walletId] : undefined;
  const network = wallet?.metadata.network ?? null;

  const reason = !online ? 'Start the QA server first' : !wallet ? 'Choose a client wallet' : null;

  const start = async () => {
    if (!walletId) return;
    setRunning(true);
    setError(null);
    setStarted(null);
    try {
      setStarted(await dispatch(startServerSession(walletId)).unwrap());
    } catch (err) {
      setError(toErrorInfo(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Panel
      title="Start a wallet on the server"
      description="Runs a client wallet on the QA server with the native prover, so it can create shielded outputs."
      footer={
        <ExecuteBar
          label="Start on server"
          showDryRun={false}
          onExecute={start}
          running={running}
          runningLabel="Starting on the server…"
          disabledReason={reason}
          isMainnet={network === 'MAINNET'}
          mainnetLabel="Start on server with a mainnet seed"
        />
      }
    >
      <Callout tone="warning" title="This sends the wallet's seed to the local QA server">
        The seed phrase goes to the QA server on this machine (127.0.0.1), which keeps it in memory until you stop the
        session or the server. It is never shown here, logged or returned. Use test wallets only.
      </Callout>
      <ClientWalletPicker
        value={walletId}
        onChange={setWalletId}
        hint="Any wallet from Wallet initialization (test or funding); it does not need to be started here."
      />
      {network && !NETWORK_CONFIG[network].supportsShielded && (
        <Callout tone="info">
          {NETWORK_CONFIG[network].label} has no shielded outputs. The session will run, but it can only send
          transparent outputs.
        </Callout>
      )}
      {error && <QaServerErrorCallout error={error} title="Could not start the wallet on the server" />}
      {started?.state === 'error' && (
        <QaServerErrorCallout
          title="The server wallet failed to start"
          error={{ status: 0, code: 'LIB_ERROR', message: started.error ?? 'Unknown error' }}
        />
      )}
      {started?.state === 'ready' && (
        <div data-result="success">
          <Callout tone="success" title="Server wallet ready">
            {sessionLabel(started, labels)} is running on {NETWORK_CONFIG[started.network].label}.
          </Callout>
        </div>
      )}
    </Panel>
  );
}

function SessionsPanel({ onFund }: { onFund: (id: string) => void }) {
  const dispatch = useAppDispatch();
  const { sessions, labels, status, error, online, refresh } = useServerSessions();
  const [stopping, setStopping] = useState<string | null>(null);
  const [stopError, setStopError] = useState<QaServerErrorInfo | null>(null);

  const stop = async (id: string) => {
    setStopping(id);
    setStopError(null);
    try {
      await dispatch(stopServerSession(id)).unwrap();
    } catch (err) {
      setStopError(toErrorInfo(err));
    } finally {
      setStopping(null);
    }
  };

  return (
    <Panel
      title="Sessions"
      description="Wallets running on the QA server. A session is keyed by the wallet's legacy address 0."
      actions={
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void refresh()}
          disabled={!online || status === 'loading'}
        >
          <MdRefresh aria-hidden="true" />
          Refresh
        </button>
      }
    >
      {stopError && <QaServerErrorCallout error={stopError} title="Could not stop the session" />}
      <DataTable<WalletSession>
        caption="QA server sessions"
        rows={online ? sessions : []}
        loading={online && status === 'loading' && sessions.length === 0}
        error={
          online && error && sessions.length === 0
            ? {
                message: 'Could not list the sessions',
                detail: `${error.code}: ${error.message}`,
                onRetry: () => void refresh(),
              }
            : null
        }
        empty={
          online
            ? 'Sessions you start appear here. Choose a client wallet above and start it on the server.'
            : 'Sessions appear here once the QA server is running.'
        }
        getRowKey={(s) => s.id}
        columns={[
          { key: 'wallet', header: 'Wallet', render: (s) => sessionLabel(s, labels) },
          {
            key: 'network',
            header: 'Network',
            render: (s) => <NetworkChip network={s.network} size="sm" label="short" />,
          },
          {
            key: 'state',
            header: 'State',
            render: (s) => (
              <span className="flex flex-col items-start gap-0.5">
                <StatusChip status={s.state} />
                {s.error && <span className="text-caption text-error">{s.error}</span>}
              </span>
            ),
          },
          {
            key: 'capability',
            header: 'Capability',
            render: (s) => (
              <CapabilityBadge level={s.capability?.level} canCreateShieldedOutputs={isSessionShieldedReady(s)} />
            ),
          },
          {
            key: 'legacy',
            header: 'Legacy addr 0',
            type: 'identifier',
            render: (s) => <Identifier value={s.legacyAddress0} kind="address" walletTag={false} />,
          },
          {
            key: 'shielded',
            header: 'Shielded addr 0',
            type: 'identifier',
            render: (s) =>
              s.shieldedAddress0 ? (
                <Identifier value={s.shieldedAddress0} kind="shielded-address" walletTag={false} />
              ) : (
                <span className="font-sans text-caption text-ink-muted">none</span>
              ),
          },
          {
            key: 'actions',
            header: 'Actions',
            type: 'actions',
            render: (s) => (
              <span className="inline-flex gap-1">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  disabled={s.state !== 'ready'}
                  onClick={() => onFund(s.id)}
                >
                  Fund
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  disabled={stopping === s.id}
                  onClick={() => void stop(s.id)}
                  aria-label={`Stop session ${sessionLabel(s, labels)}`}
                >
                  <MdStop aria-hidden="true" />
                  Stop
                </button>
              </span>
            ),
          },
        ]}
      />
    </Panel>
  );
}

function FundPanel({
  sessionId,
  onSessionChange,
}: {
  sessionId: string | null;
  onSessionChange: (id: string | null) => void;
}) {
  const { sessions, labels, online } = useServerSessions();
  const wallets = useAppSelector((s) => s.walletStore.wallets);
  const { sendTransaction, isSending } = useSendTransaction();
  const { getWallet } = useWalletStore();
  const [fromId, setFromId] = useState<string | null>(null);
  const [amount, setAmount] = useState('100');
  const [txId, setTxId] = useState<{ hash: string; walletId: string; network: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const session = sessions.find((s) => s.id === sessionId) ?? null;
  const from = fromId ? wallets[fromId] : undefined;

  const sessionNetwork = session?.network ?? null;
  const fromNetwork = from?.metadata.network ?? null;
  const requirements = useMemo(
    () =>
      fundRequirements({
        online,
        session: sessionNetwork ? { network: sessionNetwork } : null,
        from: fromNetwork ? { network: fromNetwork } : null,
        amount,
      }),
    [online, sessionNetwork, fromNetwork, amount]
  );

  // The picker only lists wallets on the session's network; drop a choice
  // made for another network so it can't linger unseen.
  useEffect(() => {
    if (sessionNetwork && fromNetwork && sessionNetwork !== fromNetwork) setFromId(null);
  }, [sessionNetwork, fromNetwork]);

  const send = async () => {
    if (!session || !from || !fromId || firstUnmetReason(requirements)) return;
    const fromWallet = getWallet(fromId);
    const instance = fromWallet?.instance;
    if (!fromWallet || !instance) {
      setError('The client wallet is not started');
      return;
    }
    setError(null);
    setTxId(null);
    try {
      const change = await instance.getAddressAtIndex(0);
      const template = buildTransferTemplate([{ address: session.legacyAddress0, amount: BigInt(amount) }], change);
      const result = await sendTransaction(
        template,
        {
          fromWalletId: fromId,
          fromWallet,
          toAddress: session.legacyAddress0,
          amount: Number(amount),
          tokenUid: NATIVE_TOKEN_UID,
          tokenSymbol: 'HTR',
        },
        WALLET_CONFIG.DEFAULT_PIN_CODE
      );
      if (result) setTxId({ hash: result.hash, walletId: fromId, network: from.metadata.network });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Panel
      title="Fund server wallet"
      description="A transparent HTR send from a client wallet to the server wallet's legacy address 0. The shielded network has no faucet."
      footer={
        <ExecuteBar
          label="Send to server wallet"
          showDryRun={false}
          onExecute={send}
          running={isSending}
          runningLabel="Sending…"
          disabledReason={firstUnmetReason(requirements)}
          isMainnet={from?.metadata.network === 'MAINNET'}
        />
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SessionPicker
          sessions={sessions}
          labels={labels}
          value={sessionId}
          onChange={onSessionChange}
          label="Server wallet (recipient)"
          onlyReady
        />
        <ClientWalletPicker
          value={fromId}
          onChange={setFromId}
          label="From client wallet"
          onlyReady
          network={session?.network ?? null}
        />
      </div>
      {session && (
        <p className="m-0 flex flex-wrap items-center gap-2 text-body text-ink-muted">
          Recipient <Identifier value={session.legacyAddress0} kind="address" walletTag={false} />
        </p>
      )}
      <AmountInput value={amount} onChange={setAmount} label="Amount" />
      {error && (
        <div data-result="error">
          <Callout tone="error" title="The funding send failed" role="alert">
            <pre className="m-0 whitespace-pre-wrap break-words font-mono text-data-sm">{error}</pre>
          </Callout>
        </div>
      )}
      {txId && (
        <div data-result="success" className="flex flex-col gap-1.5">
          <span className="text-caption font-semibold text-success">Funding transaction sent</span>
          <TxIdDisplay hash={txId.hash} walletId={txId.walletId} network={txId.network} />
        </div>
      )}
    </Panel>
  );
}

export function ShieldedQaServerStage() {
  const server = useRequireHelperServer();
  const { online } = useServerSessions();
  const [fundSessionId, setFundSessionId] = useState<string | null>(null);

  const selectForFunding = (id: string) => {
    setFundSessionId(id);
    document.getElementById('fund-server-wallet')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="shielded-qa-server" />
      <PreconditionStrip requirements={[server]} />
      <ServerPanel />
      <StartPanel online={online} />
      <SessionsPanel onFund={selectForFunding} />
      <div id="fund-server-wallet" className="scroll-mt-4">
        <FundPanel sessionId={fundSessionId} onSessionChange={setFundSessionId} />
      </div>
    </div>
  );
}

export default ShieldedQaServerStage;
