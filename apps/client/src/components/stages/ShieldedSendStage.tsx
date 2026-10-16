/**
 * Shielded send: transparent, amount-shielded and fully shielded outputs
 * from a wallet on a shielded network. The browser can't create shielded
 * outputs, so the wallet's signer on the QA server sends them
 * (`POST /wallets/:id/send`); signers follow their wallets, so QA only
 * picks the wallet. Rows map onto the contract through `toSendOutputs`.
 */

import { useEffect, useMemo, useState } from 'react';
import type { SendRequest, SendResponse } from '@qa-helper/shared/serverApi';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { MethodCard, type MethodData } from '../common/MethodCard';
import { OutputEditor } from '../common/OutputEditor';
import { Panel } from '../ui/Panel';
import { Field } from '../ui/Field';
import { SegmentedControl } from '../ui/SegmentedControl';
import { QaServerDownCallout, QaServerErrorCallout } from '../shielded/QaServerParts';
import { ShieldedWalletSelect } from '../shielded/ShieldedWalletSelect';
import { useSigner } from '../../hooks/useSigner';
import { deriveWalletAddress } from '../../hooks/useWalletAddress';
import { useRequireHelperServer, useRequireSigner } from '../../hooks/useRequirements';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { refreshWalletTokens, walletInstancesMap } from '../../store/slices/walletStoreSlice';
import { qaServerClient, toErrorInfo } from '../../services/qaServerClient';
import { newOutputRow, type OutputRow } from '../../utils/outputRows';
import {
  CHANGE_MODE_OPTIONS,
  SHIELDED_PRESETS,
  applyShieldedPreset,
  buildShieldedSendRequest,
  type ChangeModeChoice,
  type ShieldedPresetId,
} from '../../utils/shieldedSend';
import { firstUnmetReason } from '../../utils/requirements';
import { walletTokenOptions } from '../../utils/walletTokenOptions';

const EMPTY_METHOD: MethodData = {
  request: null,
  response: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
};
const DEFAULT_PRESET_VALUE = '100';

/** Unlocked balance per token of the browser wallet; the signer runs the same seed, so it sees the same funds. */
function useUnlockedBalances(walletId: string | null, tokenUids: string[]): Record<string, string> | undefined {
  const status = useAppSelector((s) => (walletId ? s.walletStore.wallets[walletId]?.status : undefined));
  const lastEvent = useAppSelector((s) => {
    const events = walletId ? s.walletStore.wallets[walletId]?.events : undefined;
    return events && events.length > 0 ? events[events.length - 1].id : null;
  });
  const uidsKey = tokenUids.join(',');
  const [balances, setBalances] = useState<Record<string, string> | undefined>(undefined);
  useEffect(() => {
    setBalances(undefined);
    const instance = walletId && status === 'ready' ? walletInstancesMap.get(walletId) : null;
    if (!instance) return;
    let cancelled = false;
    const uids = uidsKey.split(',');
    Promise.all(
      uids.map(async (uid) => {
        const b = await instance.getBalance(uid);
        return [uid, (b[0]?.balance.unlocked ?? 0n).toString()] as const;
      })
    )
      .then((entries) => !cancelled && setBalances(Object.fromEntries(entries)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [walletId, status, lastEvent, uidsKey]);
  return balances;
}

export function ShieldedSendStage() {
  const isDryRun = useAppSelector((s) => s.rpc.isDryRun);
  const wallets = useAppSelector((s) => s.walletStore.wallets);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [rows, setRows] = useState<OutputRow[]>(() => [newOutputRow({ privacy: 'AMOUNT_SHIELDED' })]);
  const [changeMode, setChangeMode] = useState<ChangeModeChoice>('AUTO');
  const [methodData, setMethodData] = useState<MethodData>(EMPTY_METHOD);
  const [presetError, setPresetError] = useState<string | null>(null);

  const wallet = walletId ? wallets[walletId] : undefined;
  const signer = useSigner(walletId);
  const session = signer?.state === 'ready' ? signer.session : null;
  const dispatch = useAppDispatch();
  const registry = useAppSelector((s) => s.tokens.tokens);
  // tokenUids is read once at start; tokens received since then appear only after a refresh.
  const walletReady = wallet?.status === 'ready';
  useEffect(() => {
    if (walletId && walletReady) void dispatch(refreshWalletTokens(walletId));
  }, [dispatch, walletId, walletReady]);
  const tokens = useMemo(() => walletTokenOptions(wallet?.tokenUids, registry), [wallet?.tokenUids, registry]);
  const balances = useUnlockedBalances(
    walletId,
    tokens.map((t) => t.uid)
  );

  const server = useRequireHelperServer();
  const signerReq = useRequireSigner(wallet?.metadata.friendlyName ?? null, signer);
  const requirements = [server, signerReq];

  const built = useMemo((): { request: SendRequest | null; error: string | null } => {
    try {
      return { request: buildShieldedSendRequest(rows, changeMode), error: null };
    } catch (err) {
      return { request: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [rows, changeMode]);

  const path = `POST /wallets/${session ? session.id : ':id'}/send`;
  const liveRequest = built.request ? { method: path, params: built.request } : null;
  const disabledReason = firstUnmetReason(requirements) ?? built.error;

  /** Presets send to the wallet's own address 0, a self-send; Fill from changes the recipient. */
  const applyPreset = async (id: ShieldedPresetId) => {
    setPresetError(null);
    const value = rows.find((r) => /^\d+$/.test(r.value) && r.value !== '0')?.value ?? DEFAULT_PRESET_VALUE;
    let own = { legacyAddress: null as string | null, shieldedAddress: null as string | null };
    if (walletId && wallet?.status === 'ready') {
      try {
        own = {
          legacyAddress: await deriveWalletAddress(walletId, 0, 'transparent'),
          shieldedAddress: await deriveWalletAddress(walletId, 0, 'shielded'),
        };
      } catch (err) {
        setPresetError(`Own addresses unavailable: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    const preset = applyShieldedPreset(id, { ...own, value });
    setRows(preset.rows);
    setChangeMode(preset.changeMode);
  };

  const execute = async () => {
    const request = built.request;
    if (!request) throw new Error(built.error ?? 'Invalid outputs');
    const sent = { method: liveRequest!.method, params: request };
    if (isDryRun) {
      setMethodData({ ...EMPTY_METHOD, request: sent, isDryRun: true, timestamp: Date.now() });
      return;
    }
    if (!session) throw new Error('The wallet cannot sign yet');
    const started = performance.now();
    setMethodData({ ...EMPTY_METHOD, request: sent });
    try {
      const response = await qaServerClient.send(session.id, request);
      setMethodData({
        ...EMPTY_METHOD,
        request: sent,
        response,
        timestamp: Date.now(),
        duration: Math.round(performance.now() - started),
      });
      return response;
    } catch (err) {
      setMethodData({
        ...EMPTY_METHOD,
        request: sent,
        error: toErrorInfo(err).message,
        timestamp: Date.now(),
        duration: Math.round(performance.now() - started),
      });
      throw err;
    }
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="shielded-send" method="POST /wallets/:id/send" />
      <PreconditionStrip requirements={requirements} />
      <QaServerDownCallout />

      <Panel
        title="Presets"
        description="Common QA flows. Recipients default to the sending wallet's own address 0; change them with Fill from."
      >
        <div className="flex flex-wrap gap-2">
          {SHIELDED_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="btn btn-secondary btn-sm"
              title={p.description}
              onClick={() => void applyPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <ul className="m-0 list-disc pl-5 text-caption text-ink-muted">
          {SHIELDED_PRESETS.map((p) => (
            <li key={p.id}>
              <span className="font-semibold">{p.label}:</span> {p.description}.
            </li>
          ))}
        </ul>
        {presetError && <span className="text-caption text-error">{presetError}</span>}
      </Panel>

      <MethodCard
        title="Send"
        actionLabel="Send transaction"
        description="The wallet's signer on the QA server builds and sends the transaction with the native prover."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={execute}
        disabledReason={disabledReason}
        isMainnet={wallet?.metadata.network === 'MAINNET'}
        getTxHash={(r) => (r as SendResponse | null)?.txId ?? null}
        explorerNetwork={wallet?.metadata.network}
        successToast="Transaction sent"
        renderError={(err) => <QaServerErrorCallout error={toErrorInfo(err)} title={undefined} />}
      >
        <ShieldedWalletSelect value={walletId} onChange={setWalletId} label="From" />
        <OutputEditor
          value={rows}
          onChange={setRows}
          tokens={tokens}
          walletAddressPicker
          network={wallet?.metadata.network}
          allowData={false}
          allowTimelock={false}
          privacy
          balances={balances}
          getMax={balances ? async (token) => balances[token] ?? '0' : undefined}
        />
        <Field
          label="Change"
          hint={CHANGE_MODE_OPTIONS.find((o) => o.value === changeMode)?.hint}
          wireControl={false}
          htmlFor="change-mode"
        >
          <SegmentedControl<ChangeModeChoice>
            aria-label="Change privacy"
            value={changeMode}
            onChange={setChangeMode}
            options={CHANGE_MODE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
              tone: o.value === 'AMOUNT_SHIELDED' || o.value === 'FULLY_SHIELDED' ? 'shielded' : 'default',
            }))}
          />
        </Field>
      </MethodCard>
    </div>
  );
}

export default ShieldedSendStage;
