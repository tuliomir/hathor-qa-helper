/**
 * Send to Hathor Next: moves HTR from the funding wallet on Next testnet
 * (testnet-juliet) to an address on its Hathor Next side chain, through the
 * Hathor Next backend, as the mobile wallet does. The backend builds the
 * burn; services/hathorNext checks it before the wallet signs.
 *
 * The funding wallet connects with keys from its own seed, so its Hathor Next
 * address is the one the mobile wallet shows for that seed.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { TxIdDisplay } from '../common/TxIdDisplay';
import { Identifier } from '../common/Identifier';
import { Panel } from '../ui/Panel';
import { Field } from '../ui/Field';
import { Callout } from '../ui/Callout';
import { useRequireFundingWallet, useRequireNetwork } from '../../hooks/useRequirements';
import { firstUnmetReason } from '../../utils/requirements';
import { NETWORK_CONFIG, WALLET_CONFIG } from '../../constants/network';
import { walletInstancesMap } from '../../store/slices/walletStoreSlice';
import { parseAmount } from '../../utils/amount';
import { formatBalance } from '../../utils/balanceUtils';
import { applyNetworkServices } from '../../services/networkServices';
import {
  connectNextWallet,
  FINAL_TRANSFER_STATUSES,
  type NextTransferStatus,
  type NextWalletSession,
} from '../../services/hathorNext/backend';
import { normalizeNextAddress } from '../../services/hathorNext/kit';

const NETWORK = 'NEXT_TESTNET' as const;
const POLL_MS = 5_000;

/** Sessions by wallet id: they hold keys, so they stay out of Redux. */
const sessions = new Map<string, NextWalletSession>();

function nextExplorerTxUrl(txId: string): string | null {
  const base = NETWORK_CONFIG[NETWORK].hathorNext?.explorerUrl;
  return base && /^[0-9a-f]{64}$/i.test(txId) ? `${base.replace(/\/+$/, '')}/tx/${txId.toLowerCase()}` : null;
}

function TransferRow({ transfer }: { transfer: NextTransferStatus }) {
  const mintUrl = transfer.mint_tx_id ? nextExplorerTxUrl(transfer.mint_tx_id) : null;
  return (
    <div className="flex flex-col gap-2 rounded-box border border-line p-3 text-data">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{transfer.status}</span>
        {transfer.amount && <span className="font-mono tabular-nums">{formatBalance(transfer.amount)} HTR</span>}
        {transfer.needed !== undefined && (
          <span className="text-ink-muted">
            {transfer.confirmations ?? 0}/{transfer.needed} confirmations
          </span>
        )}
      </div>
      {transfer.reason && <span className="text-error">{transfer.reason}</span>}
      {transfer.burn_tx_id && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink-muted">Burn</span>
          <TxIdDisplay hash={transfer.burn_tx_id} network={NETWORK} />
        </div>
      )}
      {transfer.mint_tx_id && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink-muted">Mint</span>
          <Identifier value={transfer.mint_tx_id} kind="tx" />
          {mintUrl && (
            <a className="link text-caption" href={mintUrl} target="_blank" rel="noreferrer">
              Hathor Next explorer
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function HathorNextTransferStage() {
  const fundingRequirement = useRequireFundingWallet();
  const fundingWallet = useSelector((s: RootState) => {
    const id = s.walletSelection.fundingWalletId;
    return id ? s.walletStore.wallets[id] : undefined;
  });
  const testWallet = useSelector((s: RootState) => {
    const id = s.walletSelection.testWalletId;
    return id ? s.walletStore.wallets[id] : undefined;
  });
  const networkRequirement = useRequireNetwork(NETWORK, fundingWallet?.metadata.network ?? null);
  const requirements = [fundingRequirement, networkRequirement];
  const blocked = firstUnmetReason(requirements);

  const config = NETWORK_CONFIG[NETWORK];
  const chain = config.hathorNext!;
  const walletId = fundingWallet?.metadata.id ?? null;

  const [session, setSession] = useState<NextWalletSession | null>(() =>
    walletId ? (sessions.get(walletId) ?? null) : null
  );
  const [testNextAddress, setTestNextAddress] = useState<string | null>(null);
  const [destination, setDestination] = useState('');
  const [amountText, setAmountText] = useState('0.01');
  const [busy, setBusy] = useState<'connect' | 'transfer' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<NextTransferStatus | null>(null);
  const [history, setHistory] = useState<NextTransferStatus[]>([]);

  useEffect(() => {
    setSession(walletId ? (sessions.get(walletId) ?? null) : null);
    setCurrent(null);
    setHistory([]);
  }, [walletId]);

  const amount = useMemo(() => parseAmount(amountText, 2), [amountText]);
  const normalized = useMemo(() => (destination.trim() ? normalizeNextAddress(destination) : null), [destination]);

  const connect = async () => {
    if (!fundingWallet || !walletId) return;
    setBusy('connect');
    setError(null);
    try {
      const params = { chain, backendUrl: config.hathorNextBackendUrl!, nodeNetwork: config.nodeNetwork! };
      const opened = await connectNextWallet({ ...params, seedWords: fundingWallet.metadata.seedWords });
      sessions.set(walletId, opened);
      setSession(opened);
      setDestination((d) => d || opened.address);
      setHistory(await opened.getTransfers());
      // The test wallet's Hathor Next address, for quick fill: registering it is idempotent.
      if (testWallet?.metadata.seedWords && testWallet.metadata.network === NETWORK) {
        const test = await connectNextWallet({ ...params, seedWords: testWallet.metadata.seedWords });
        setTestNextAddress(test.address);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const transfer = async () => {
    if (!session || !walletId || !normalized || 'error' in normalized || !amount.ok) return;
    const wallet = walletInstancesMap.get(walletId);
    if (!wallet) {
      setError('The funding wallet is not started.');
      return;
    }
    setBusy('transfer');
    setError(null);
    setCurrent(null);
    try {
      applyNetworkServices(NETWORK);
      const status = await session.transfer({
        wallet,
        amount: amount.value,
        destination: normalized.address,
        pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
      });
      setCurrent(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  // Follow the transfer until it arrives or fails.
  useEffect(() => {
    if (!session || !current || FINAL_TRANSFER_STATUSES.has(current.status)) return;
    const timer = setTimeout(async () => {
      try {
        setCurrent(await session.getTransfer(current.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [session, current]);

  const amountError = amount.ok ? null : amount.message;
  const addressError = normalized && 'error' in normalized ? normalized.error : null;
  const canTransfer = Boolean(session && normalized && !addressError && !amountError) && busy === null && !blocked;

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="hathor-next-transfer" />
      <PreconditionStrip requirements={requirements} />

      <Panel
        title={chain.label}
        description={`HTR burned on ${config.nodeNetwork} arrives as ${chain.nativeTokenSymbol === 'USDT' ? 'nHTR' : 'HTR'} after ${chain.confirmations} confirmations. The backend builds the burn; this screen checks it before signing.`}
      >
        <div className="flex flex-col gap-3">
          {session ? (
            <div className="flex flex-col gap-1 text-data">
              <span className="text-ink-muted">Funding wallet on Hathor Next</span>
              <Identifier value={session.address} kind="address" walletTag={false} />
              {session.sweeping && (
                <span className="text-caption text-ink-muted">The backend is still scanning its history.</span>
              )}
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={Boolean(blocked) || busy !== null}
                onClick={connect}
                title={blocked ?? undefined}
              >
                {busy === 'connect' ? 'Connecting…' : 'Connect funding wallet'}
              </button>
            </div>
          )}
        </div>
      </Panel>

      {session && (
        <Panel title="Transfer" description="Burns the amount plus 0.01 HTR for the burn's data output.">
          <div className="flex flex-col gap-4">
            <Field
              label="Hathor Next address"
              htmlFor="next-destination"
              error={addressError ?? undefined}
              trailing={
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setDestination(session.address)}
                  >
                    Funding wallet
                  </button>
                  {testNextAddress && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setDestination(testNextAddress)}
                    >
                      Test wallet
                    </button>
                  )}
                </span>
              }
            >
              <input
                id="next-destination"
                className="input w-full font-mono text-data"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="samba1…"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field label="Amount (HTR)" htmlFor="next-amount" error={amountError ?? undefined}>
              <input
                id="next-amount"
                className="input w-40 font-mono text-data"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <div>
              <button type="button" className="btn btn-primary btn-sm" disabled={!canTransfer} onClick={transfer}>
                {busy === 'transfer' ? 'Burning…' : 'Transfer to Hathor Next'}
              </button>
            </div>
          </div>
        </Panel>
      )}

      {error && (
        <Callout tone="error" title="Failed" role="alert">
          {error}
        </Callout>
      )}

      {current && (
        <Panel title="This transfer">
          <TransferRow transfer={current} />
        </Panel>
      )}

      {history.length > 0 && (
        <Panel title="Earlier transfers">
          <div className="flex flex-col gap-2">
            {history.map((t) => (
              <TransferRow key={t.id} transfer={t} />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

export default HathorNextTransferStage;
