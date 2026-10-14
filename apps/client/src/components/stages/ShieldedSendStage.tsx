/**
 * Shielded send: build outputs (transparent, amount shielded, fully
 * shielded) and send them from a QA server wallet, which has the native
 * prover. Requests go to `POST /wallets/:id/send`; rows map onto the
 * contract through `toSendOutputs`.
 */

import { useEffect, useMemo, useState } from 'react';
import type { SendRequest, SendResponse } from '@qa-helper/shared/serverApi';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { MethodCard, type MethodData } from '../common/MethodCard';
import { OutputEditor, type OutputTokenOption } from '../common/OutputEditor';
import { Panel } from '../ui/Panel';
import { Field } from '../ui/Field';
import { SegmentedControl } from '../ui/SegmentedControl';
import { QaServerDownCallout, QaServerErrorCallout, SessionPicker } from '../shielded/QaServerParts';
import { useServerSessions } from '../../hooks/useServerSessions';
import { useRequireHelperServer, useRequireServerSession } from '../../hooks/useRequirements';
import { useShieldedAddressBook } from '../../hooks/useShieldedAddressBook';
import { useAppSelector } from '../../store/hooks';
import { qaServerClient, toErrorInfo } from '../../services/qaServerClient';
import { NETWORK_CONFIG } from '../../constants/network';
import { newOutputRow, type OutputRow } from '../../utils/outputRows';
import {
  CHANGE_MODE_OPTIONS,
  SHIELDED_PRESETS,
  applyShieldedPreset,
  buildShieldedSendRequest,
  type ChangeModeChoice,
  type ShieldedPresetId,
} from '../../utils/shieldedSend';
import { firstUnmetReason, type Requirement } from '../../utils/requirements';

const HTR: OutputTokenOption = { uid: '00', symbol: 'HTR', name: 'Hathor' };
const EMPTY_METHOD: MethodData = {
  request: null,
  response: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
};
const DEFAULT_PRESET_VALUE = '100';

export function ShieldedSendStage() {
  const { sessions, labels } = useServerSessions();
  const isDryRun = useAppSelector((s) => s.rpc.isDryRun);
  const addressBook = useShieldedAddressBook();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rows, setRows] = useState<OutputRow[]>(() => [newOutputRow({ privacy: 'AMOUNT_SHIELDED' })]);
  const [changeMode, setChangeMode] = useState<ChangeModeChoice>('AUTO');
  const [methodData, setMethodData] = useState<MethodData>(EMPTY_METHOD);
  const [balance, setBalance] = useState<string | undefined>(undefined);

  const readySessions = sessions.filter((s) => s.state === 'ready');
  const session = sessions.find((s) => s.id === sessionId) ?? null;

  // Pick the only ready session automatically.
  useEffect(() => {
    if (!sessionId && readySessions.length === 1) setSessionId(readySessions[0].id);
  }, [sessionId, readySessions]);

  // Available balance for the above-balance warning and the Max button.
  useEffect(() => {
    setBalance(undefined);
    if (!session || session.state !== 'ready') return;
    let cancelled = false;
    qaServerClient
      .getBalance(session.id)
      .then((b) => !cancelled && setBalance(b.unlocked))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const server = useRequireHelperServer();
  const sessionReq = useRequireServerSession(session);
  const shieldedNetwork = session ? NETWORK_CONFIG[session.network].supportsShielded : false;
  const requirements: Requirement[] = [server, sessionReq];
  if (session) {
    requirements.push(
      shieldedNetwork
        ? {
            id: 'network',
            short: 'Shielded network',
            met: true,
            label: `Session on ${NETWORK_CONFIG[session.network].label}`,
          }
        : {
            id: 'network',
            short: 'Shielded network',
            met: false,
            label: `Session on ${NETWORK_CONFIG[session.network].label}: transparent outputs only`,
          }
    );
  }

  const built = useMemo((): { request: SendRequest | null; error: string | null } => {
    try {
      return { request: buildShieldedSendRequest(rows, changeMode), error: null };
    } catch (err) {
      return { request: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [rows, changeMode]);

  const path = `POST /wallets/${session ? session.id : ':id'}/send`;
  const liveRequest = built.request ? { method: path, params: built.request } : null;

  const preconditionReason = firstUnmetReason([server, sessionReq]);
  const disabledReason = preconditionReason ?? built.error;

  const applyPreset = (id: ShieldedPresetId) => {
    const value = rows.find((r) => /^\d+$/.test(r.value) && r.value !== '0')?.value ?? DEFAULT_PRESET_VALUE;
    const preset = applyShieldedPreset(id, {
      legacyAddress: session?.legacyAddress0 ?? null,
      shieldedAddress: session?.shieldedAddress0 ?? null,
      value,
    });
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
    if (!session) throw new Error('Choose a ready server wallet');
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
      qaServerClient
        .getBalance(session.id)
        .then((b) => setBalance(b.unlocked))
        .catch(() => {});
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
        description="Common QA flows. Recipients default to the chosen server wallet's own addresses; change them with Fill from."
      >
        <div className="flex flex-wrap gap-2">
          {SHIELDED_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="btn btn-secondary btn-sm"
              title={p.description}
              onClick={() => applyPreset(p.id)}
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
      </Panel>

      <MethodCard
        title="Send from the server wallet"
        actionLabel="Send transaction"
        description="Outputs are sent by the QA server's wallet-lib with the native prover."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={execute}
        disabledReason={disabledReason}
        isMainnet={session?.network === 'MAINNET'}
        getTxHash={(r) => (r as SendResponse | null)?.txId ?? null}
        explorerNetwork={session?.network}
        successToast="Transaction sent"
        renderError={(err) => <QaServerErrorCallout error={toErrorInfo(err)} title={undefined} />}
      >
        <SessionPicker
          sessions={sessions}
          labels={labels}
          value={sessionId}
          onChange={setSessionId}
          label="Send from server wallet"
          onlyReady
        />
        <OutputEditor
          value={rows}
          onChange={setRows}
          tokens={[HTR]}
          customAddressSources={addressBook}
          network={session?.network}
          allowData={false}
          allowTimelock={false}
          privacy={
            session && !shieldedNetwork ? `Shielded outputs need ${NETWORK_CONFIG.SHIELDED_TESTNET.label}` : true
          }
          balances={balance !== undefined ? { '00': balance } : undefined}
          getMax={balance !== undefined ? async () => balance : undefined}
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
              disabled: !!session && !shieldedNetwork && o.value !== 'AUTO' && o.value !== 'TRANSPARENT',
              reason: 'Needs a shielded network',
            }))}
          />
        </Field>
      </MethodCard>
    </div>
  );
}

export default ShieldedSendStage;
