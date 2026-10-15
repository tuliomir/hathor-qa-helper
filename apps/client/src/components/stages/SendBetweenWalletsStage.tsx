/**
 * Send Between Wallets Stage
 *
 * Sends any token between the funding and test wallets. Lists the
 * transfers between the two seen this session (wallet events), so tokens
 * sent from the test wallet with the mobile, desktop or web wallet can be
 * sent back in one step. Which transfers were sent back is kept in
 * walletTransfersSlice for the session.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { TransactionTemplateBuilder } from '@hathor/wallet-lib';
import { DECIMAL_PLACES, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import type { IHistoryTx } from '@hathor/wallet-lib/lib/types';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useSendTransaction } from '../../hooks/useSendTransaction';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearSentBack, markSentBack } from '../../store/slices/walletTransfersSlice';
import { WALLET_CONFIG } from '../../constants/network';
import { useRequireFundingWallet, useRequireNetwork, useRequireTestWallet } from '../../hooks/useRequirements';
import { firstUnmetReason } from '../../utils/requirements';
import { formatAmount } from '../../utils/amount';
import { transferKey, transfersInTx, type TransferDirection, type WalletTransfer } from '../../utils/walletTransfers';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { AmountInput } from '../common/AmountInput';
import { Identifier } from '../common/Identifier';
import { ExplorerLink } from '../common/ExplorerLink';
import TxStatus from '../common/TxStatus';
import { Panel } from '../ui/Panel';
import { Field } from '../ui/Field';
import { Callout } from '../ui/Callout';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { SegmentedControl } from '../ui/SegmentedControl';

interface SourceToken {
  uid: string;
  symbol: string;
  balance: bigint;
}

const DIRECTION_LABEL: Record<TransferDirection, string> = {
  'funding-to-test': 'Funding → Test',
  'test-to-funding': 'Test → Funding',
};

const reverse = (d: TransferDirection): TransferDirection =>
  d === 'funding-to-test' ? 'test-to-funding' : 'funding-to-test';

const timeOf = (ms: number) => new Date(ms).toLocaleTimeString();

export default function SendBetweenWalletsStage() {
  const dispatch = useAppDispatch();
  const { getWallet } = useWalletStore();
  const { sendTransaction, isSending, error: sendError } = useSendTransaction();

  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const fundingEvents = useAppSelector((s) =>
    fundingWalletId ? s.walletStore.wallets[fundingWalletId]?.events : undefined
  );
  const testEvents = useAppSelector((s) => (testWalletId ? s.walletStore.wallets[testWalletId]?.events : undefined));
  const allTokens = useAppSelector((s) => s.tokens.tokens);
  const sentBack = useAppSelector((s) => s.walletTransfers.sentBack);

  const fundingWallet = fundingWalletId ? getWallet(fundingWalletId) : undefined;
  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;

  const fundingRequirement = useRequireFundingWallet();
  const testRequirement = useRequireTestWallet();
  const networkRequirement = useRequireNetwork(
    fundingWallet?.metadata.network ?? 'TESTNET',
    testWallet?.metadata.network ?? null
  );
  const requirements =
    fundingWallet && testWallet
      ? [fundingRequirement, testRequirement, networkRequirement]
      : [fundingRequirement, testRequirement];
  const blockedReason = firstUnmetReason(requirements);
  const ready = !blockedReason && fundingWallet?.status === 'ready' && testWallet?.status === 'ready';

  const symbolOf = (uid: string) =>
    uid === NATIVE_TOKEN_UID ? 'HTR' : (allTokens.find((t) => t.uid === uid)?.symbol ?? `${uid.slice(0, 8)}…`);

  // --- Transfers seen this session -------------------------------------------------
  const [transfers, setTransfers] = useState<WalletTransfer[]>([]);
  // getTxBalance per tx is async; remember results per wallet pair.
  const checked = useRef(new Map<string, WalletTransfer[]>());

  useEffect(() => {
    const funding = fundingWallet?.instance;
    const test = testWallet?.instance;
    if (!ready || !funding || !test) {
      setTransfers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      // Latest data per tx (update-tx may void it), first time it was seen.
      const txs = new Map<string, { tx: IHistoryTx; seenAt: number }>();
      for (const event of [...(fundingEvents ?? []), ...(testEvents ?? [])]) {
        if (event.eventType !== 'new-tx' && event.eventType !== 'update-tx') continue;
        const tx = event.data as IHistoryTx | undefined;
        if (!tx?.tx_id) continue;
        const seenAt = Math.min(txs.get(tx.tx_id)?.seenAt ?? Infinity, event.timestamp);
        txs.set(tx.tx_id, { tx, seenAt });
      }
      const found: WalletTransfer[] = [];
      for (const [txId, { tx, seenAt }] of txs) {
        if (tx.is_voided) continue;
        const key = `${fundingWalletId}:${testWalletId}:${txId}`;
        let list = checked.current.get(key);
        if (!list) {
          try {
            const [f, t] = await Promise.all([funding.getTxBalance(tx), test.getTxBalance(tx)]);
            list = transfersInTx({ txId, timestamp: seenAt }, f, t);
            checked.current.set(key, list);
          } catch (err) {
            console.warn(`Could not read the balance of ${txId}:`, err);
            continue;
          }
        }
        found.push(...list);
      }
      if (!cancelled) setTransfers(found.sort((a, b) => b.timestamp - a.timestamp));
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, fundingWallet?.instance, testWallet?.instance, fundingWalletId, testWalletId, fundingEvents, testEvents]);

  // --- Send form ---------------------------------------------------------------------
  const [direction, setDirection] = useState<TransferDirection>('funding-to-test');
  const [tokenUid, setTokenUid] = useState(NATIVE_TOKEN_UID);
  const [amount, setAmount] = useState('');
  const [returning, setReturning] = useState<WalletTransfer | null>(null);
  const [lastTx, setLastTx] = useState<{ hash: string; walletId: string } | null>(null);
  // The hook keeps its last error; hide it once the form is refilled.
  const [showSendError, setShowSendError] = useState(false);
  const [sourceTokens, setSourceTokens] = useState<SourceToken[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  const source = direction === 'funding-to-test' ? fundingWallet : testWallet;
  const destination = direction === 'funding-to-test' ? testWallet : fundingWallet;

  // Tokens the source wallet holds, HTR first. Reloads when its balance or token list changes.
  useEffect(() => {
    const instance = source?.instance;
    if (!ready || !instance) {
      setSourceTokens([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const uids = [NATIVE_TOKEN_UID, ...(source.tokenUids ?? []).filter((u) => u !== NATIVE_TOKEN_UID)];
      const loaded = await Promise.all(
        uids.map(async (uid) => {
          try {
            const [entry] = await instance.getBalance(uid);
            return { uid, symbol: symbolOf(uid), balance: entry?.balance?.unlocked ?? 0n };
          } catch {
            return null;
          }
        })
      );
      if (!cancelled) {
        setSourceTokens(loaded.filter((t): t is SourceToken => !!t && (t.uid === NATIVE_TOKEN_UID || t.balance > 0n)));
      }
    })();
    return () => {
      cancelled = true;
    };
    // symbolOf only reads allTokens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, source?.instance, source?.balance, source?.tokenUids, allTokens]);

  // A token being sent back stays selectable even if the source shows no balance for it yet.
  const tokenOptions = useMemo(() => {
    if (sourceTokens.some((t) => t.uid === tokenUid)) return sourceTokens;
    return [...sourceTokens, { uid: tokenUid, symbol: symbolOf(tokenUid), balance: 0n }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTokens, tokenUid, allTokens]);
  const selected = tokenOptions.find((t) => t.uid === tokenUid);

  const changeDirection = (next: TransferDirection) => {
    setDirection(next);
    setReturning(null);
    setShowSendError(false);
    setTokenUid(NATIVE_TOKEN_UID);
    setAmount('');
  };

  const sendBack = (transfer: WalletTransfer) => {
    setDirection(reverse(transfer.direction));
    setTokenUid(transfer.tokenUid);
    setAmount(transfer.amount);
    setReturning(transfer);
    setLastTx(null);
    setShowSendError(false);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sendButtonRef.current?.focus({ preventScroll: true });
  };

  const handleSend = async () => {
    if (!source?.instance || !destination?.instance || !amount) return;
    setShowSendError(true);
    setLastTx(null);
    try {
      const toAddress = await destination.instance.getAddressAtIndex(0);
      const changeAddress = await source.instance.getAddressAtIndex(0);
      const template = TransactionTemplateBuilder.new()
        .addSetVarAction({ name: 'recipientAddr', value: toAddress })
        .addSetVarAction({ name: 'changeAddr', value: changeAddress })
        .addTokenOutput({ address: '{recipientAddr}', amount: BigInt(amount), token: tokenUid })
        .addCompleteAction({ changeAddress: '{changeAddr}' })
        .build();
      const result = await sendTransaction(
        template,
        {
          fromWalletId: source.metadata.id,
          fromWallet: source,
          toAddress,
          amount: Number(amount),
          tokenUid,
          tokenSymbol: symbolOf(tokenUid),
        },
        WALLET_CONFIG.DEFAULT_PIN_CODE
      );
      if (result?.hash) {
        setLastTx({ hash: result.hash, walletId: source.metadata.id });
        if (returning) dispatch(markSentBack({ key: transferKey(returning), txHash: result.hash }));
        setReturning(null);
        setAmount('');
      }
    } catch (err) {
      // useSendTransaction already shows the error.
      console.error('Send between wallets failed:', err);
    }
  };

  const sendReason = blockedReason ?? (!amount ? 'Enter an amount' : null);

  const columns: DataTableColumn<WalletTransfer>[] = [
    { key: 'time', header: 'Seen', value: (t) => timeOf(t.timestamp) },
    { key: 'direction', header: 'Direction', value: (t) => DIRECTION_LABEL[t.direction] },
    {
      key: 'amount',
      header: 'Amount',
      type: 'amount',
      render: (t) => (
        <span className="whitespace-nowrap font-mono text-data tabular-nums">
          {formatAmount(t.amount, DECIMAL_PLACES)}{' '}
          <span className="font-sans text-ink-muted">{symbolOf(t.tokenUid)}</span>
        </span>
      ),
    },
    { key: 'tx', header: 'Transaction', type: 'identifier', render: (t) => <Identifier value={t.txId} kind="tx" /> },
    {
      key: 'action',
      header: <span className="sr-only">Action</span>,
      type: 'actions',
      hideLabelWhenStacked: true,
      render: (t) => {
        const returnHash = sentBack[transferKey(t)];
        return returnHash ? (
          <span className="flex items-center gap-1.5 text-caption text-ink-muted">
            Sent back <Identifier value={returnHash} kind="tx" />
          </span>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => sendBack(t)} disabled={!ready}>
            Send back
          </button>
        );
      },
    },
  ];

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="send-between-wallets" />
      <PreconditionStrip requirements={requirements} />

      <Panel
        title="Transfers this session"
        description="Transactions between the funding and test wallets since they started, including ones sent from another wallet app with the test wallet’s seed."
        actions={
          Object.keys(sentBack).length > 0 ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch(clearSentBack())}>
              Forget sent back
            </button>
          ) : undefined
        }
      >
        <DataTable
          columns={columns}
          rows={transfers}
          getRowKey={transferKey}
          caption="Transfers between the funding and test wallets"
          empty="No transfers between the two wallets yet. Use the form below to send any token."
        />
      </Panel>

      <div ref={formRef}>
        <Panel title="Send">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl<TransferDirection>
                aria-label="Direction"
                value={direction}
                onChange={changeDirection}
                options={[
                  { value: 'funding-to-test', label: DIRECTION_LABEL['funding-to-test'] },
                  { value: 'test-to-funding', label: DIRECTION_LABEL['test-to-funding'] },
                ]}
              />
              {source && destination && (
                <span className="text-caption text-ink-muted">
                  From {source.metadata.friendlyName} to {destination.metadata.friendlyName}
                </span>
              )}
            </div>

            {returning && (
              <Callout tone="info" title="Sending back a transfer">
                {formatAmount(returning.amount, DECIMAL_PLACES)} {symbolOf(returning.tokenUid)} seen at{' '}
                {timeOf(returning.timestamp)}.{' '}
                <button type="button" className="link link-primary" onClick={() => setReturning(null)}>
                  Send something else
                </button>
              </Callout>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Token" htmlFor="send-between-token">
                <select
                  className="select w-full"
                  value={tokenUid}
                  onChange={(e) => {
                    setTokenUid(e.target.value);
                    setReturning(null);
                  }}
                  disabled={!ready}
                >
                  {tokenOptions.map((t) => (
                    <option key={t.uid} value={t.uid}>
                      {t.symbol} · {formatAmount(t.balance, DECIMAL_PLACES)} available
                    </option>
                  ))}
                </select>
              </Field>
              <AmountInput
                value={amount}
                onChange={(v) => {
                  setAmount(v);
                  if (returning && v !== returning.amount) setReturning(null);
                }}
                token={{ uid: tokenUid, symbol: symbolOf(tokenUid) }}
                max={selected?.balance}
                balance={selected?.balance ?? null}
                disabled={!ready}
              />
            </div>

            {showSendError && sendError && (
              <Callout tone="error" title="The transaction failed" role="alert">
                {sendError}
              </Callout>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              {sendReason && <span className="text-caption text-ink-muted">{sendReason}</span>}
              <button
                ref={sendButtonRef}
                type="button"
                className="btn btn-primary"
                onClick={handleSend}
                disabled={!!sendReason || isSending}
              >
                {isSending && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
                {isSending
                  ? 'Sending…'
                  : `Send${amount ? ` ${formatAmount(amount, DECIMAL_PLACES)}` : ''} ${symbolOf(tokenUid)}`}
              </button>
            </div>

            {lastTx && (
              <Callout tone="success" title="Transaction sent">
                <span className="flex flex-wrap items-center gap-3">
                  <Identifier value={lastTx.hash} kind="tx" />
                  <TxStatus hash={lastTx.hash} walletId={lastTx.walletId} />
                  <ExplorerLink hash={lastTx.hash} network={source?.metadata.network} />
                </span>
              </Callout>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
