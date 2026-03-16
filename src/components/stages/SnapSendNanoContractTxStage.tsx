/**
 * Snap Send Nano Contract TX Stage
 *
 * Tests htr_sendNanoContractTx via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import Select from '../common/Select';

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

export const SnapSendNanoContractTxStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('sendNanoContractTx');

  const [ncId, setNcId] = useState('');
  const [blueprintId, setBlueprintId] = useState('');
  const [method, setMethod] = useState('initialize');
  const [actions, setActions] = useState<NcAction[]>([]);
  const [argsText, setArgsText] = useState('');
  const [maxFee, setMaxFee] = useState('');
  const [contractPaysFees, setContractPaysFees] = useState(false);
  const [pushTx, setPushTx] = useState(true);

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
    if (!pushTx) p.push_tx = false;

    return p;
  }, [ncId, blueprintId, method, actions, argsText, maxFee, contractPaysFees, pushTx]);

  const liveRequest = useMemo(
    () => ({ method: 'htr_sendNanoContractTx', params }),
    [params],
  );

  const handleExecute = () => execute((h) => h.sendNanoContractTx(params));

  const addAction = () => setActions([...actions, emptyAction()]);
  const removeAction = (i: number) => setActions(actions.filter((_, idx) => idx !== i));
  const updateAction = (i: number, field: keyof NcAction, value: string) =>
    setActions(actions.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Nano Contract TX (Snap)</h1>
      <p className="text-muted mb-7.5">
        Send a nano contract transaction via MetaMask Snap
      </p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Nano Contract TX"
          description="Send nano contract transactions (initialize, bet, withdraw, etc.)"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">NC ID (for existing contracts)</label>
            <input type="text" value={ncId} onChange={(e) => setNcId(e.target.value)} placeholder="Nano contract ID" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Blueprint ID (for initialization)</label>
            <input type="text" value={blueprintId} onChange={(e) => setBlueprintId(e.target.value)} placeholder="Blueprint ID" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Method</label>
            <input type="text" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="initialize" className="input" />
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Actions</label>
            {actions.map((action, i) => (
              <div key={i} className="border border-gray-200 rounded p-3 mb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Action {i + 1}</span>
                  <button onClick={() => removeAction(i)} className="btn-secondary py-1 px-2 text-xs">Remove</button>
                </div>
                <Select value={action.type} onChange={(e) => updateAction(i, 'type', e.target.value)}>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </Select>
                <input type="text" value={action.token} onChange={(e) => updateAction(i, 'token', e.target.value)} placeholder="Token UID" className="input" />
                <input type="text" value={action.amount} onChange={(e) => updateAction(i, 'amount', e.target.value)} placeholder="Amount" className="input" />
                <input type="text" value={action.address} onChange={(e) => updateAction(i, 'address', e.target.value)} placeholder={action.type === 'deposit' ? 'Change address' : 'Withdrawal address'} className="input" />
              </div>
            ))}
            <button onClick={addAction} className="btn-secondary py-1.5 px-3 text-sm">+ Add Action</button>
          </div>

          {/* Args */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Args (JSON array)</label>
            <textarea
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              placeholder='["arg1", "arg2"] or a single value'
              className="input min-h-20"
              rows={3}
            />
            <p className="text-xs text-muted mt-1">
              JSON array of arguments for the nano contract method
            </p>
          </div>

          {/* Max Fee */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Max Fee (optional)</label>
            <input type="text" value={maxFee} onChange={(e) => setMaxFee(e.target.value)} placeholder="e.g. 100" className="input" />
            <p className="text-xs text-muted mt-1">
              Maximum fee willing to pay (in string format)
            </p>
          </div>

          {/* Contract Pays Fees */}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={contractPaysFees} onChange={(e) => setContractPaysFees(e.target.checked)} className="checkbox checkbox-primary" />
            <label className="text-sm font-medium">Contract Pays Fees</label>
          </div>

          {/* Push Transaction */}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={pushTx} onChange={(e) => setPushTx(e.target.checked)} className="checkbox checkbox-primary" />
            <label className="text-sm font-medium">Push Transaction</label>
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
