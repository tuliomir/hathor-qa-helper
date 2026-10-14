/**
 * RPC Create Token Card — htr_createToken with version, authorities and
 * data outputs.
 */

import React, { useEffect, useState } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';
import type { CreateTokenParams, CreateTokenVersion } from '../../services/rpcHandlers';
import { MethodCard, type MethodData } from '../common/MethodCard';
import { Identifier } from '../common/Identifier';
import { ExplorerLink } from '../common/ExplorerLink';
import { AddressInput } from '../common/AddressInput';
import { AmountInput } from '../common/AmountInput';
import { Field } from '../ui/Field';
import { Panel } from '../ui/Panel';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ResponseFields } from './ResponseFields';
import { BASE_NAME, BASE_SYMBOL, VERSION_DEFAULTS, swapVersionSuffix } from '../../utils/createTokenDefaults';
import { buildCreateTokenRequest, unwrapResponse } from '../../utils/rpcCoreRequests';

const VERSION_OPTIONS = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'fee', label: 'Fee' },
  { value: 'none', label: 'Not set' },
] as const;

function initialParams(): CreateTokenParams {
  const v = VERSION_DEFAULTS.deposit;
  return {
    name: `${BASE_NAME}${v.nameSuffix}`,
    symbol: `${BASE_SYMBOL}${v.symbolSuffix}`.slice(0, 5),
    amount: v.amount,
    version: 'deposit',
    change_address: '',
    create_mint: true,
    mint_authority_address: '',
    allow_external_mint_authority_address: false,
    create_melt: true,
    melt_authority_address: '',
    allow_external_melt_authority_address: false,
    data: [],
  };
}

function txHashOf(response: unknown): string | null {
  const r = unwrapResponse<{ hash?: unknown }>(response);
  return typeof r?.hash === 'string' ? r.hash : null;
}

export interface RpcCreateTokenCardProps {
  onExecute: (params: CreateTokenParams) => Promise<unknown>;
  methodData: MethodData | null;
  isDryRun: boolean;
  disabledReason?: string | null;
  /** Test wallet address 0, pre-filled as the change address. */
  walletAddress?: string | null;
}

export const RpcCreateTokenCard: React.FC<RpcCreateTokenCardProps> = ({
  onExecute,
  methodData,
  isDryRun,
  disabledReason = null,
  walletAddress = null,
}) => {
  const [params, setParams] = useState<CreateTokenParams>(initialParams);
  const set = (patch: Partial<CreateTokenParams>) => setParams((p) => ({ ...p, ...patch }));

  // Pre-fill the change address with the test wallet's address 0.
  useEffect(() => {
    if (walletAddress) setParams((p) => (p.change_address ? p : { ...p, change_address: walletAddress }));
  }, [walletAddress]);

  const setVersion = (version: CreateTokenVersion) => {
    setParams((p) => ({
      ...p,
      version,
      ...swapVersionSuffix(p.name, p.version, version, p.symbol, p.amount),
    }));
  };

  const setData = (data: string[]) => set({ data });

  const authority = (kind: 'mint' | 'melt') => {
    const create = kind === 'mint' ? 'create_mint' : 'create_melt';
    const address = kind === 'mint' ? 'mint_authority_address' : 'melt_authority_address';
    const external =
      kind === 'mint' ? 'allow_external_mint_authority_address' : 'allow_external_melt_authority_address';
    const Kind = kind === 'mint' ? 'Mint' : 'Melt';
    return (
      <Panel variant="inset" title={`${Kind} authority`}>
        <label className="flex cursor-pointer items-center gap-2 text-body">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={params[create]}
            onChange={(e) => set({ [create]: e.target.checked })}
          />
          Create a {kind} authority
        </label>
        <AddressInput
          label={`${Kind} authority address`}
          hint="Optional. The wallet picks one when empty."
          value={params[address]}
          onChange={(v) => set({ [address]: v })}
          sources={['test', 'fund']}
        />
        <label className="flex cursor-pointer items-center gap-2 text-body">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={params[external]}
            onChange={(e) => set({ [external]: e.target.checked })}
          />
          Allow an external {kind} authority address
        </label>
      </Panel>
    );
  };

  return (
    <MethodCard
      title="Create token"
      liveRequest={buildCreateTokenRequest(params)}
      methodData={methodData}
      isDryRun={isDryRun}
      onExecute={() => onExecute(params)}
      disabledReason={disabledReason}
      getTxHash={txHashOf}
      successToast="Token created"
      renderResponse={(response) => {
        const r = unwrapResponse<{ hash?: string; name?: string; symbol?: string }>(response);
        if (!r?.hash) return undefined;
        return (
          <ResponseFields
            fields={[
              {
                label: 'Token UID',
                value: (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <Identifier value={r.hash} kind="token" />
                    <ExplorerLink hash={r.hash} specificPage="token_detail" />
                  </span>
                ),
              },
              { label: 'Name', value: r.name },
              { label: 'Symbol', value: r.symbol },
            ]}
          />
        );
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label="Name" required>
          <input className="input w-full" value={params.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Symbol" required>
          <input className="input w-full" value={params.symbol} onChange={(e) => set({ symbol: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AmountInput
          label="Amount"
          value={params.amount}
          onChange={(amount) => set({ amount })}
          token={{ uid: '', symbol: params.symbol || 'tokens' }}
        />
        <Field label="Version" hint="Deposit locks HTR; fee tokens pay a fee per transfer." wireControl={false}>
          <SegmentedControl
            aria-label="Token version"
            options={VERSION_OPTIONS}
            value={params.version || 'none'}
            onChange={(v) => setVersion(v === 'none' ? '' : v)}
          />
        </Field>
      </div>
      <AddressInput
        label="Change address"
        hint="Optional. The wallet picks one when empty."
        value={params.change_address}
        onChange={(change_address) => set({ change_address })}
        sources={['test', 'fund']}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {authority('mint')}
        {authority('melt')}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium">Data outputs (optional)</span>
          <button type="button" className="btn btn-ghost btn-xs ml-auto" onClick={() => setData([...params.data, ''])}>
            <MdAdd aria-hidden="true" />
            Add data
          </button>
        </div>
        {params.data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className="input w-full font-mono text-data"
              aria-label={`Data output ${index + 1}`}
              value={item}
              onChange={(e) => setData(params.data.map((d, i) => (i === index ? e.target.value : d)))}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              aria-label={`Remove data output ${index + 1}`}
              onClick={() => setData(params.data.filter((_, i) => i !== index))}
            >
              <MdClose aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </MethodCard>
  );
};
