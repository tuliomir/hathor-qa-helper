/**
 * Snap Send Transaction Stage
 *
 * Tests htr_sendTransaction via MetaMask Snap (the Snap reference
 * implementation of MethodCard + OutputEditor).
 */

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { MdAdd, MdClose } from 'react-icons/md';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useRequireSnap } from '../../hooks/useRequirements';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { AddressInput } from '../common/AddressInput';
import { OutputEditor } from '../common/OutputEditor';
import { Identifier } from '../common/Identifier';
import { Field } from '../ui/Field';
import { selectSnapAddress, selectSnapNetwork, selectSnapUtxos } from '../../store/slices/snapSlice';
import { timelockToUnix } from '../../utils/timelockUtils';
import { newOutputRow, type OutputRow } from '../../utils/outputRows';
import { firstUnmetReason } from '../../utils/requirements';
import type { NetworkKey } from '../../constants/network';

interface TxInput {
  txId: string;
  index: string;
}

const SNAP_NETWORK_KEY: Record<string, NetworkKey> = { testnet: 'TESTNET', mainnet: 'MAINNET' };

export const SnapSendTransactionStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('sendTransaction');
  const snapRequirement = useRequireSnap();
  const snapAddress = useSelector(selectSnapAddress);
  const snapNetwork = useSelector(selectSnapNetwork);
  const storedUtxos = useSelector(selectSnapUtxos);

  const [outputs, setOutputs] = useState<OutputRow[]>(() => [newOutputRow({ value: '1' })]);
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

  const removeInput = (i: number) => setInputs(inputs.filter((_, idx) => idx !== i));
  const updateInput = (i: number, field: keyof TxInput, value: string) =>
    setInputs(inputs.map((inp, idx) => (idx === i ? { ...inp, [field]: value } : inp)));

  const unlockedUtxos = storedUtxos.filter((u) => !u.locked);
  const network = snapNetwork ? SNAP_NETWORK_KEY[snapNetwork] : undefined;

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-send-transaction"
        title="Send transaction"
        description="Send a transaction with token or data outputs through the MetaMask Snap."
        method="htr_sendTransaction"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Send transaction"
        description="Outputs, optional change address and optional inputs."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <OutputEditor
          value={outputs}
          onChange={setOutputs}
          addressSources={['snap', 'test', 'fund', 'multisig']}
          network={network}
        />

        <section className="flex flex-col gap-3 border-t border-base-300 pt-4" aria-labelledby="snap-send-change">
          <h3 id="snap-send-change" className="m-0 text-body font-semibold">
            Change address <span className="font-normal text-ink-muted">(optional)</span>
          </h3>
          <AddressInput
            value={changeAddress}
            onChange={setChangeAddress}
            placeholder="Address to receive change"
            suggestedValue={snapAddress ?? undefined}
            sources={['snap']}
            network={network}
          />
        </section>

        <section className="flex flex-col gap-3 border-t border-base-300 pt-4" aria-labelledby="snap-send-inputs">
          <h3 id="snap-send-inputs" className="m-0 text-body font-semibold">
            Inputs <span className="font-normal text-ink-muted">(optional UTXO selection)</span>
          </h3>

          {unlockedUtxos.length > 0 && (
            <div className="flex flex-col gap-2 rounded-box bg-base-200 p-3">
              <button
                type="button"
                className="self-start text-body font-medium text-primary hover:underline"
                aria-expanded={utxosExpanded}
                onClick={() => setUtxosExpanded(!utxosExpanded)}
              >
                {utxosExpanded ? 'Hide' : 'Show'} known UTXOs ({unlockedUtxos.length})
              </button>
              {utxosExpanded && (
                <ul className="m-0 flex max-h-48 list-none flex-col gap-1 overflow-y-auto p-0">
                  {unlockedUtxos.map((utxo) => {
                    const alreadyAdded = inputs.some(
                      (inp) => inp.txId === utxo.txId && inp.index === String(utxo.index)
                    );
                    return (
                      <li
                        key={`${utxo.txId}-${utxo.index}`}
                        className="flex items-center justify-between gap-2 rounded-field bg-base-100 px-2 py-1.5"
                      >
                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-caption">
                          <Identifier value={utxo.txId} kind="tx" copy={false} />
                          <span className="text-ink-muted">
                            index {utxo.index} · {utxo.amount} ·{' '}
                            {utxo.token === '00' ? 'HTR' : `${utxo.token.slice(0, 8)}…`}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => setInputs([...inputs, { txId: utxo.txId, index: String(utxo.index) }])}
                          className="btn btn-secondary btn-xs"
                        >
                          {alreadyAdded ? 'Added' : 'Use'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {inputs.map((inp, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-box bg-base-200 p-3">
              <div className="flex items-center">
                <span className="font-semibold">Input {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeInput(i)}
                  className="btn btn-ghost btn-xs btn-square ml-auto"
                  aria-label={`Remove input ${i + 1}`}
                >
                  <MdClose aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <Field label="Transaction ID">
                  <input
                    type="text"
                    value={inp.txId}
                    onChange={(e) => updateInput(i, 'txId', e.target.value)}
                    placeholder="txId"
                    className="input w-full font-mono text-data"
                  />
                </Field>
                <Field label="Output index">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={inp.index}
                    onChange={(e) => updateInput(i, 'index', e.target.value)}
                    placeholder="0"
                    className="input w-full font-mono text-data"
                  />
                </Field>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setInputs([...inputs, { txId: '', index: '0' }])}
            className="btn btn-secondary btn-sm self-start"
          >
            <MdAdd aria-hidden="true" />
            Add input
          </button>
        </section>
      </SnapMethodCard>
    </div>
  );
};
