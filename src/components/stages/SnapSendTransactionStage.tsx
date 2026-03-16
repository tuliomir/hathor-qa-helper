/**
 * Snap Send Transaction Stage
 *
 * Tests htr_sendTransaction via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import Select from '../common/Select';

interface TxOutput {
  type: 'token' | 'data';
  address: string;
  value: string;
  token: string;
  data: string;
}

const emptyOutput = (): TxOutput => ({
  type: 'token',
  address: '',
  value: '',
  token: '00',
  data: '',
});

export const SnapSendTransactionStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('sendTransaction');

  const [outputs, setOutputs] = useState<TxOutput[]>([emptyOutput()]);

  const builtOutputs = useMemo(
    () =>
      outputs.map((o) =>
        o.type === 'data'
          ? { data: o.data }
          : { address: o.address, value: o.value, token: o.token },
      ),
    [outputs],
  );

  const liveRequest = useMemo(
    () => ({ method: 'htr_sendTransaction', params: { outputs: builtOutputs } }),
    [builtOutputs],
  );

  const handleExecute = () =>
    execute((h) => h.sendTransaction(builtOutputs as Record<string, unknown>[]));

  const addOutput = () => setOutputs([...outputs, emptyOutput()]);
  const removeOutput = (i: number) =>
    setOutputs(outputs.filter((_, idx) => idx !== i));
  const updateOutput = (i: number, field: keyof TxOutput, value: string) =>
    setOutputs(
      outputs.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)),
    );

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Send Transaction (Snap)</h1>
      <p className="text-muted mb-7.5">
        Send a transaction with one or more outputs via MetaMask Snap
      </p>

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
                  <button
                    onClick={() => removeOutput(i)}
                    className="btn-secondary py-1 px-2 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <Select
                  value={output.type}
                  onChange={(e) => updateOutput(i, 'type', e.target.value)}
                >
                  <option value="token">Token</option>
                  <option value="data">Data</option>
                </Select>
              </div>
              {output.type === 'token' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Address</label>
                    <input
                      type="text"
                      value={output.address}
                      onChange={(e) => updateOutput(i, 'address', e.target.value)}
                      placeholder="Recipient address"
                      className="input"
                    />
                  </div>
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
        </SnapMethodCard>
      )}
    </div>
  );
};
