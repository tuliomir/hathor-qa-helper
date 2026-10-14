/**
 * Snap Send Transaction Stage
 *
 * Tests htr_sendTransaction via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import { AddressInput } from '../common/AddressInput';
import { selectSnapAddress, selectSnapUtxos } from '../../store/slices/snapSlice';
import Select from '../common/Select';
import TimelockPicker from '../common/TimelockPicker';
import { timelockToUnix } from '../../utils/timelockUtils';

interface TxOutput {
  type: 'token' | 'data';
  address: string;
  value: string;
  token: string;
  timelock: string;
  data: string;
}

interface TxInput {
  txId: string;
  index: string;
}

const emptyOutput = (): TxOutput => ({
  type: 'token',
  address: '',
  value: '1',
  token: '00',
  timelock: '',
  data: '',
});

export const SnapSendTransactionStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('sendTransaction');
  const snapAddress = useSelector(selectSnapAddress);
  const storedUtxos = useSelector(selectSnapUtxos);

  const [outputs, setOutputs] = useState<TxOutput[]>([emptyOutput()]);
  const [inputs, setInputs] = useState<TxInput[]>([]);
  const [changeAddress, setChangeAddress] = useState('');
  const [utxosExpanded, setUtxosExpanded] = useState(false);

  const params = useMemo(() => {
    const builtOutputs = outputs.map((o) => {
      if (o.type === 'data') return { data: o.data };
      const tokenOutput: { address: string; value: string; token: string; timelock?: number } = {
        address: o.address,
        value: o.value,
        token: o.token,
      };
      const ts = timelockToUnix(o.timelock);
      if (ts !== undefined) tokenOutput.timelock = ts;
      return tokenOutput;
    });
    const p: Record<string, unknown> = { outputs: builtOutputs };
    if (changeAddress.trim()) p.changeAddress = changeAddress.trim();
    if (inputs.length > 0) {
      p.inputs = inputs.map((inp) => ({
        txId: inp.txId,
        index: Number(inp.index),
      }));
    }
    return p;
  }, [outputs, changeAddress, inputs]);

  const liveRequest = useMemo(() => ({ method: 'htr_sendTransaction', params }), [params]);

  const handleExecute = () => execute((h) => h.sendTransaction(params));

  const addOutput = () => setOutputs([...outputs, emptyOutput()]);
  const removeOutput = (i: number) => setOutputs(outputs.filter((_, idx) => idx !== i));
  const updateOutput = (i: number, field: keyof TxOutput, value: string) =>
    setOutputs(outputs.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));

  const addInput = () => setInputs([...inputs, { txId: '', index: '0' }]);
  const removeInput = (i: number) => setInputs(inputs.filter((_, idx) => idx !== i));
  const updateInput = (i: number, field: keyof TxInput, value: string) =>
    setInputs(inputs.map((inp, idx) => (idx === i ? { ...inp, [field]: value } : inp)));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Send Transaction (Snap)</h1>
      <p className="text-muted mb-7.5">Send a transaction with one or more outputs via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Send Transaction"
          description="Send a transaction with token or data outputs"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          {outputs.map((output, i) => (
            <div key={i} className="border border-gray-200 rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Output {i + 1}</span>
                {outputs.length > 1 && (
                  <button onClick={() => removeOutput(i)} className="btn-secondary py-1 px-2 text-xs">
                    Remove
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <Select value={output.type} onChange={(e) => updateOutput(i, 'type', e.target.value)}>
                  <option value="token">Token</option>
                  <option value="data">Data</option>
                </Select>
              </div>
              {output.type === 'token' ? (
                <>
                  <AddressInput
                    label="Address"
                    value={output.address}
                    onChange={(v) => updateOutput(i, 'address', v)}
                    placeholder="Recipient address"
                    sources={['snap', 'test', 'fund', 'multisig']}
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Value</label>
                    <input
                      type="text"
                      value={output.value}
                      onChange={(e) => updateOutput(i, 'value', e.target.value)}
                      placeholder="Amount"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Token UID</label>
                    <input
                      type="text"
                      value={output.token}
                      onChange={(e) => updateOutput(i, 'token', e.target.value)}
                      placeholder="00 for HTR"
                      className="input"
                    />
                  </div>
                  <TimelockPicker value={output.timelock} onChange={(v) => updateOutput(i, 'timelock', v)} />
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Data</label>
                  <input
                    type="text"
                    value={output.data}
                    onChange={(e) => updateOutput(i, 'data', e.target.value)}
                    placeholder="Data string"
                    className="input"
                  />
                </div>
              )}
            </div>
          ))}
          <button onClick={addOutput} className="btn-secondary py-1.5 px-3 text-sm">
            + Add Output
          </button>

          {/* Change Address */}
          <div className="border border-gray-200 rounded p-4 space-y-3">
            <span className="text-sm font-medium">Change Address (optional)</span>
            <AddressInput
              value={changeAddress}
              onChange={setChangeAddress}
              placeholder="Address to receive change"
              suggestedValue={snapAddress ?? undefined}
              sources={['snap']}
            />
          </div>

          {/* Inputs (UTXO selection) */}
          <div className="border border-gray-200 rounded p-4 space-y-3">
            <span className="text-sm font-medium">Inputs &mdash; UTXO selection (optional)</span>

            {/* Stored UTXOs from Get UTXOs stage */}
            {storedUtxos.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded">
                <button
                  type="button"
                  onClick={() => setUtxosExpanded(!utxosExpanded)}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-800 flex items-center gap-2 hover:bg-blue-100 rounded"
                >
                  <span>{utxosExpanded ? '▼' : '▶'}</span>
                  Show known UTXOs ({storedUtxos.filter((u) => !u.locked).length})
                </button>
                {utxosExpanded && (
                  <div className="px-3 pb-3 max-h-48 overflow-y-auto space-y-1">
                    {storedUtxos.filter((u) => !u.locked).map((utxo) => {
                      const alreadyAdded = inputs.some(
                        (inp) => inp.txId === utxo.txId && inp.index === String(utxo.index)
                      );
                      return (
                        <div
                          key={`${utxo.txId}-${utxo.index}`}
                          className="flex items-center justify-between gap-2 bg-white rounded px-2 py-1.5 border border-blue-100"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-2xs font-mono text-gray-600 block truncate">{utxo.txId}</span>
                            <span className="text-xs text-gray-800">
                              idx {utxo.index} &middot; {utxo.amount} &middot; {utxo.token === '00' ? 'HTR' : utxo.token.slice(0, 8) + '…'}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() =>
                              setInputs([...inputs, { txId: utxo.txId, index: String(utxo.index) }])
                            }
                            className="btn-secondary py-1 px-2 text-xs whitespace-nowrap"
                          >
                            {alreadyAdded ? 'Added' : 'Use'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {inputs.map((inp, i) => (
              <div key={i} className="border border-gray-200 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Input {i + 1}</span>
                  <button onClick={() => removeInput(i)} className="btn-secondary py-1 px-2 text-xs">
                    Remove
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Transaction ID</label>
                  <input
                    type="text"
                    value={inp.txId}
                    onChange={(e) => updateInput(i, 'txId', e.target.value)}
                    placeholder="txId"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Output Index</label>
                  <input
                    type="text"
                    value={inp.index}
                    onChange={(e) => updateInput(i, 'index', e.target.value)}
                    placeholder="0"
                    className="input"
                  />
                </div>
              </div>
            ))}
            <button onClick={addInput} className="btn-secondary py-1.5 px-3 text-sm">
              + Add Input
            </button>
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
