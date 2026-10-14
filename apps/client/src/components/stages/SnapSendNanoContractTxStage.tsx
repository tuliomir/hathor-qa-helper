/**
 * Snap Send Nano Contract TX Stage
 *
 * Tests htr_sendNanoContractTx via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { MdAdd, MdClose } from 'react-icons/md';
import { useRequireSnap } from '../../hooks/useRequirements';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Panel } from '../ui/Panel';
import { Field } from '../ui/Field';
import { SegmentedControl } from '../ui/SegmentedControl';
import { firstUnmetReason } from '../../utils/requirements';

interface NcAction {
  type: 'deposit' | 'withdrawal';
  token: string;
  amount: string;
  address: string;
}

const emptyAction = (): NcAction => ({
  type: 'deposit',
  token: '00',
  amount: '',
  address: '',
});

const ACTION_TYPES = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
] as const;

const MONO_INPUT = 'input w-full font-mono text-data';

export const SnapSendNanoContractTxStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('sendNanoContractTx');
  const snapRequirement = useRequireSnap();

  const [ncId, setNcId] = useState('');
  const [blueprintId, setBlueprintId] = useState('');
  const [method, setMethod] = useState('initialize');
  const [actions, setActions] = useState<NcAction[]>([]);
  const [argsText, setArgsText] = useState('');
  const [maxFee, setMaxFee] = useState('');
  const [contractPaysFees, setContractPaysFees] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, unknown> = { method };

    if (ncId.trim()) p.nc_id = ncId;
    if (blueprintId.trim()) p.blueprint_id = blueprintId;

    p.actions = actions.map((a) => {
      const action: Record<string, string> = { type: a.type, token: a.token, amount: a.amount };
      if (a.type === 'deposit') {
        action.changeAddress = a.address;
      } else {
        action.address = a.address;
      }
      return action;
    });

    try {
      p.args = argsText.trim() ? JSON.parse(argsText) : [];
    } catch {
      p.args = argsText.trim() ? [argsText] : [];
    }

    if (maxFee.trim()) p.max_fee = maxFee;
    if (contractPaysFees) p.contract_pays_fees = true;

    return p;
  }, [ncId, blueprintId, method, actions, argsText, maxFee, contractPaysFees]);

  const liveRequest = useMemo(() => ({ method: 'htr_sendNanoContractTx', params }), [params]);

  const handleExecute = () => execute((h) => h.sendNanoContractTx(params));

  const addAction = () => setActions([...actions, emptyAction()]);
  const removeAction = (i: number) => setActions(actions.filter((_, idx) => idx !== i));
  const updateAction = (i: number, field: keyof NcAction, value: string) =>
    setActions(actions.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-send-nano-contract-tx"
        description="Send a nano contract transaction (initialize, bet, withdraw…) from the snap wallet."
        method="htr_sendNanoContractTx"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Send nano contract tx"
        description="Use the NC ID for existing contracts, the blueprint ID to initialize one."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <Field label="NC ID" hint="For existing contracts.">
          <input
            type="text"
            value={ncId}
            onChange={(e) => setNcId(e.target.value)}
            placeholder="Nano contract ID"
            className={MONO_INPUT}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <Field label="Blueprint ID" hint="For initialization.">
            <input
              type="text"
              value={blueprintId}
              onChange={(e) => setBlueprintId(e.target.value)}
              placeholder="Blueprint ID"
              className={MONO_INPUT}
            />
          </Field>
          <Field label="Method">
            <input
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="initialize"
              className={MONO_INPUT}
            />
          </Field>
        </div>

        <section className="flex flex-col gap-3 border-t border-base-300 pt-4" aria-labelledby="snap-nctx-actions">
          <h3 id="snap-nctx-actions" className="m-0 text-body font-semibold">
            Actions
          </h3>
          {actions.map((action, i) => (
            <Panel
              key={i}
              variant="inset"
              title={`Action ${i + 1}`}
              actions={
                <>
                  <SegmentedControl
                    size="sm"
                    aria-label={`Action ${i + 1} type`}
                    options={ACTION_TYPES}
                    value={action.type}
                    onChange={(v) => updateAction(i, 'type', v)}
                  />
                  <button
                    type="button"
                    onClick={() => removeAction(i)}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label={`Remove action ${i + 1}`}
                  >
                    <MdClose aria-hidden="true" />
                  </button>
                </>
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <Field label="Token UID">
                  <input
                    type="text"
                    value={action.token}
                    onChange={(e) => updateAction(i, 'token', e.target.value)}
                    placeholder="00"
                    className={MONO_INPUT}
                  />
                </Field>
                <Field label="Amount">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={action.amount}
                    onChange={(e) => updateAction(i, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="input w-full text-right font-mono text-data tabular-nums"
                  />
                </Field>
              </div>
              <Field label={action.type === 'deposit' ? 'Change address' : 'Withdrawal address'}>
                <input
                  type="text"
                  value={action.address}
                  onChange={(e) => updateAction(i, 'address', e.target.value)}
                  placeholder={action.type === 'deposit' ? 'Change address' : 'Withdrawal address'}
                  className={MONO_INPUT}
                />
              </Field>
            </Panel>
          ))}
          <button type="button" onClick={addAction} className="btn btn-secondary btn-sm self-start">
            <MdAdd aria-hidden="true" />
            Add action
          </button>
        </section>

        <section className="flex flex-col gap-3 border-t border-base-300 pt-4" aria-labelledby="snap-nctx-args">
          <h3 id="snap-nctx-args" className="m-0 text-body font-semibold">
            Arguments and fees
          </h3>
          <Field label="Args" hint="JSON array of arguments for the method; anything else is sent as a single value.">
            <textarea
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              placeholder='["arg1", "arg2"]'
              className="textarea min-h-20 w-full font-mono text-data"
              rows={3}
            />
          </Field>
          <Field label="Max fee" hint="Optional. Highest fee to pay, as a string." className="max-w-60">
            <input
              type="text"
              value={maxFee}
              onChange={(e) => setMaxFee(e.target.value)}
              placeholder="100"
              className={MONO_INPUT}
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-body">
            <input
              type="checkbox"
              checked={contractPaysFees}
              onChange={(e) => setContractPaysFees(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            Contract pays fees
          </label>
        </section>
      </SnapMethodCard>
    </div>
  );
};
