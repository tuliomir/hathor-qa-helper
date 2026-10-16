/**
 * RPC Send Transaction Card
 *
 * Compose/Inspect card for htr_sendTransaction (the RPC reference
 * implementation of MethodCard + OutputEditor).
 */

import React, { useMemo, useState } from 'react';
import type HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';
import type { SendTransactionOutput } from '../../store/slices/sendTransactionSlice';
import type { NetworkKey } from '../../constants/network';
import type { MethodData } from '../common/MethodCard';
import { RpcMethodCard } from './RpcMethodCard';
import { OutputEditor, type OutputTokenOption } from '../common/OutputEditor';
import TransactionResponseDisplay from '../common/TransactionResponseDisplay';
import { newOutputRow, outputRowErrors, type OutputRow } from '../../utils/outputRows';
import { buildSendTransactionRequest } from '../../utils/rpcSendTransaction';
import { bool, useFlowPrefill } from '../../hooks/useFlowPrefill';

export interface RpcSendTransactionCardProps {
  onExecute: (outputs: SendTransactionOutput[], pushTx: boolean) => Promise<unknown>;
  /** Built from the request the handler would send; used for the live preview. */
  methodData: MethodData | null;
  isDryRun: boolean;
  /** Network of the test wallet (explorer links, address validation). */
  network: NetworkKey;
  testWallet?: HathorWallet | null;
  availableTokens: OutputTokenOption[];
  disabledReason?: string | null;
  initialFormData?: { pushTx: boolean; outputs: SendTransactionOutput[] };
}

const RPC_ROW_RULES = { allowData: true, allowTimelock: true, allowZero: true };

function toRows(outputs: SendTransactionOutput[] | undefined): OutputRow[] {
  if (!outputs || outputs.length === 0) return [newOutputRow()];
  return outputs.map((o) =>
    newOutputRow({
      type: o.type ?? 'token',
      address: o.address ?? '',
      value: o.value ?? '',
      token: o.token || '00',
      timelock: o.timelock ?? '',
      data: o.data ?? '',
    })
  );
}

function toRpcOutputs(rows: OutputRow[]): SendTransactionOutput[] {
  return rows.map((r) =>
    r.type === 'data'
      ? { type: 'data', data: r.data }
      : { type: 'token', address: r.address.trim(), value: r.value, token: r.token, timelock: r.timelock }
  );
}

function rpcTxHash(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;
  const r = response as { hash?: unknown; response?: { hash?: unknown } };
  if (typeof r.hash === 'string') return r.hash;
  if (r.response && typeof r.response.hash === 'string') return r.response.hash;
  return null;
}

export const RpcSendTransactionCard: React.FC<RpcSendTransactionCardProps> = ({
  onExecute,
  methodData,
  isDryRun,
  network,
  testWallet = null,
  availableTokens,
  disabledReason = null,
  initialFormData,
}) => {
  const [pushTx, setPushTx] = useState(initialFormData?.pushTx ?? false);
  const [rows, setRows] = useState<OutputRow[]>(() => toRows(initialFormData?.outputs));

  // Values an automatic flow run filled in.
  useFlowPrefill('rpc-send-transaction', (v) => {
    setPushTx(bool(v, 'pushTx') ?? pushTx);
    if (Array.isArray(v.outputs)) setRows(toRows(v.outputs as SendTransactionOutput[]));
  });

  const liveRequest = useMemo(() => buildSendTransactionRequest(toRpcOutputs(rows), pushTx), [rows, pushTx]);

  const handleExecute = async () => {
    const problems = outputRowErrors(rows, RPC_ROW_RULES)
      .map((e, i) => (e ? `Output ${i + 1}: ${e}` : null))
      .filter(Boolean);
    if (problems.length > 0) throw new Error(problems.join('; '));
    return onExecute(toRpcOutputs(rows), pushTx);
  };

  const getMax = testWallet
    ? async (token: string) => {
        const bal = await testWallet.getBalance(token || '00');
        return bal?.[0]?.balance?.unlocked ?? 0n;
      }
    : undefined;

  return (
    <RpcMethodCard
      title="Send transaction"
      description="Send a transaction with one or more outputs."
      liveRequest={liveRequest}
      methodData={methodData}
      isDryRun={isDryRun}
      onExecute={handleExecute}
      disabledReason={disabledReason}
      getTxHash={rpcTxHash}
      explorerNetwork={network}
      renderResponse={(response) => <TransactionResponseDisplay response={response} network={network} />}
      successToast={pushTx ? 'Transaction sent' : 'Transaction built'}
    >
      <div className="flex flex-col gap-1">
        <label className="flex cursor-pointer items-center gap-2 text-body font-medium">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={pushTx}
            onChange={(e) => setPushTx(e.target.checked)}
          />
          Push transaction to the network
        </label>
        <span className="text-caption text-ink-muted">
          {pushTx
            ? 'The wallet broadcasts the transaction.'
            : 'The wallet returns the transaction hex without broadcasting it.'}
        </span>
      </div>
      <OutputEditor
        value={rows}
        onChange={setRows}
        tokens={availableTokens}
        addressSources={['test', 'fund']}
        network={network}
        getMax={getMax}
      />
    </RpcMethodCard>
  );
};
