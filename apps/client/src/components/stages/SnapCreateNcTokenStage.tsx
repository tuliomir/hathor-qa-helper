/**
 * Snap Create NC + Token Stage
 *
 * Tests htr_createNanoContractCreateTokenTx via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { useRequireSnap } from '../../hooks/useRequirements';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { AddressInput } from '../common/AddressInput';
import { Field } from '../ui/Field';
import { firstUnmetReason } from '../../utils/requirements';

const MONO_INPUT = 'input w-full font-mono text-data';
const ADDR_SOURCES: ('snap' | 'test' | 'fund' | 'multisig')[] = ['snap', 'test', 'fund', 'multisig'];

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-body">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="checkbox checkbox-sm"
      />
      {children}
    </label>
  );
}

export const SnapCreateNcTokenStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('createNcToken');
  const snapRequirement = useRequireSnap();

  // NC params
  const [method, setMethod] = useState('initialize');
  const [blueprintId, setBlueprintId] = useState('');
  const [argsText, setArgsText] = useState('');

  // Token params
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenAmount, setTokenAmount] = useState('100');
  const [tokenAddress, setTokenAddress] = useState('');
  const [changeAddress, setChangeAddress] = useState('');
  const [contractPaysDeposit, setContractPaysDeposit] = useState(false);
  const [createMint, setCreateMint] = useState(false);
  const [mintAddress, setMintAddress] = useState('');
  const [allowExternalMint, setAllowExternalMint] = useState(false);
  const [createMelt, setCreateMelt] = useState(false);

  // Transaction options
  const [maxFee, setMaxFee] = useState('');
  const [contractPaysFees, setContractPaysFees] = useState(false);

  const params = useMemo(() => {
    let args: unknown[];
    try {
      args = argsText.trim() ? JSON.parse(argsText) : [];
    } catch {
      args = argsText.trim() ? [argsText] : [];
    }

    const createTokenOptions: Record<string, unknown> = {
      contract_pays_token_deposit: contractPaysDeposit,
      name: tokenName || '<name>',
      symbol: tokenSymbol || '<symbol>',
      amount: tokenAmount || '100',
      create_mint: createMint,
      create_melt: createMelt,
    };
    if (tokenAddress.trim()) createTokenOptions.address = tokenAddress;
    if (changeAddress.trim()) createTokenOptions.change_address = changeAddress;
    if (createMint && mintAddress.trim()) createTokenOptions.mint_authority_address = mintAddress;
    if (createMint) createTokenOptions.allow_external_mint_authority_address = allowExternalMint;

    const data: Record<string, unknown> = {
      blueprint_id: blueprintId || '<blueprint_id>',
      actions: [],
      args,
    };

    const p: Record<string, unknown> = { method, createTokenOptions, data };
    if (maxFee.trim()) p.max_fee = maxFee;
    if (contractPaysFees) p.contract_pays_fees = true;

    return p;
  }, [
    method,
    blueprintId,
    argsText,
    tokenName,
    tokenSymbol,
    tokenAmount,
    tokenAddress,
    changeAddress,
    contractPaysDeposit,
    createMint,
    mintAddress,
    allowExternalMint,
    createMelt,
    maxFee,
    contractPaysFees,
  ]);

  const liveRequest = useMemo(() => ({ method: 'htr_createNanoContractCreateTokenTx', params }), [params]);

  const handleExecute = () => execute((h) => h.createNanoContractCreateTokenTx(params));

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-create-nc-token"
        description="Call a nano contract method and create a token in the same transaction."
        method="htr_createNanoContractCreateTokenTx"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Create NC and token"
        description="Nano contract call, token options and transaction options."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <section className="flex flex-col gap-3" aria-labelledby="snap-nctoken-nc">
          <h3 id="snap-nctoken-nc" className="m-0 text-body font-semibold">
            Nano contract
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <Field label="Method">
              <input
                type="text"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="initialize"
                className={MONO_INPUT}
              />
            </Field>
            <Field label="Blueprint ID">
              <input
                type="text"
                value={blueprintId}
                onChange={(e) => setBlueprintId(e.target.value)}
                className={MONO_INPUT}
              />
            </Field>
          </div>
          <Field label="Args" hint="JSON array; anything else is sent as a single argument.">
            <textarea
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              placeholder='["arg1", "arg2"]'
              className="textarea min-h-16 w-full font-mono text-data"
              rows={2}
            />
          </Field>
        </section>

        <section className="flex flex-col gap-3 border-t border-base-300 pt-4" aria-labelledby="snap-nctoken-token">
          <h3 id="snap-nctoken-token" className="m-0 text-body font-semibold">
            Token options
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem]">
            <Field label="Token name">
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="input w-full"
              />
            </Field>
            <Field label="Symbol">
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                className="input w-full"
              />
            </Field>
            <Field label="Amount">
              <input
                type="text"
                inputMode="numeric"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                className="input w-full text-right font-mono text-data tabular-nums"
              />
            </Field>
          </div>
          <AddressInput
            label="Destination address"
            hint="Optional. The wallet picks one when empty."
            value={tokenAddress}
            onChange={setTokenAddress}
            sources={ADDR_SOURCES}
          />
          <AddressInput
            label="Change address"
            hint="Optional. The wallet picks one when empty."
            value={changeAddress}
            onChange={setChangeAddress}
            sources={ADDR_SOURCES}
          />
          <Check checked={contractPaysDeposit} onChange={setContractPaysDeposit}>
            Contract pays token deposit
          </Check>
          <Check checked={createMint} onChange={setCreateMint}>
            Create mint authority
          </Check>
          {createMint && (
            <div className="flex flex-col gap-3 border-l-2 border-base-300 pl-4">
              <AddressInput
                label="Mint authority address"
                value={mintAddress}
                onChange={setMintAddress}
                sources={ADDR_SOURCES}
              />
              <Check checked={allowExternalMint} onChange={setAllowExternalMint}>
                Allow external mint authority address
              </Check>
            </div>
          )}
          <Check checked={createMelt} onChange={setCreateMelt}>
            Create melt authority
          </Check>
        </section>

        <section className="flex flex-col gap-3 border-t border-base-300 pt-4" aria-labelledby="snap-nctoken-tx">
          <h3 id="snap-nctoken-tx" className="m-0 text-body font-semibold">
            Transaction options
          </h3>
          <Field label="Max fee" hint="Optional." className="max-w-60">
            <input type="text" value={maxFee} onChange={(e) => setMaxFee(e.target.value)} className={MONO_INPUT} />
          </Field>
          <Check checked={contractPaysFees} onChange={setContractPaysFees}>
            Contract pays fees
          </Check>
        </section>
      </SnapMethodCard>
    </div>
  );
};
