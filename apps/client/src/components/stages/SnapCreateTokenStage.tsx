/**
 * Snap Create Token Stage
 *
 * Tests htr_createToken via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { MdAdd, MdClose } from 'react-icons/md';
import { useRequireSnap } from '../../hooks/useRequirements';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { AddressInput } from '../common/AddressInput';
import { Field } from '../ui/Field';
import { SegmentedControl } from '../ui/SegmentedControl';
import { selectSnapAddress } from '../../store/slices/snapSlice';
import { firstUnmetReason } from '../../utils/requirements';

const TOKEN_VERSIONS = [
  { value: 'deposit', label: 'Deposit-based' },
  { value: 'fee', label: 'Fee-based' },
];

export const SnapCreateTokenStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('createToken');
  const snapRequirement = useRequireSnap();

  const snapAddress = useSelector(selectSnapAddress);

  const [name, setName] = useState('Test Snaps Token');
  const [symbol, setSymbol] = useState('TSNT');
  const [amount, setAmount] = useState('100');
  const [address, setAddress] = useState('');
  const [changeAddress, setChangeAddress] = useState(snapAddress ?? '');
  const [createMint, setCreateMint] = useState(false);
  const [mintAuthorityAddress, setMintAuthorityAddress] = useState('');
  const [allowExternalMint, setAllowExternalMint] = useState(false);
  const [createMelt, setCreateMelt] = useState(false);
  const [meltAuthorityAddress, setMeltAuthorityAddress] = useState('');
  const [allowExternalMelt, setAllowExternalMelt] = useState(false);
  const [version, setVersion] = useState<string>('deposit');
  const [dataEntries, setDataEntries] = useState<string[]>([]);

  const params = useMemo(() => {
    const p: Record<string, unknown> = {
      name: name || '<name>',
      symbol: symbol || '<symbol>',
      amount: amount || '100',
      create_mint: createMint,
      create_melt: createMelt,
    };
    if (address.trim()) p.address = address;
    if (changeAddress.trim()) p.change_address = changeAddress;
    if (createMint && mintAuthorityAddress.trim()) p.mint_authority_address = mintAuthorityAddress;
    if (createMint) p.allow_external_mint_authority_address = allowExternalMint;
    if (createMelt && meltAuthorityAddress.trim()) p.melt_authority_address = meltAuthorityAddress;
    if (createMelt) p.allow_external_melt_authority_address = allowExternalMelt;
    if (version) p.version = version;
    const filtered = dataEntries.filter((d) => d.trim() !== '');
    if (filtered.length > 0) p.data = filtered;
    return p;
  }, [
    name,
    symbol,
    amount,
    address,
    changeAddress,
    createMint,
    mintAuthorityAddress,
    allowExternalMint,
    createMelt,
    meltAuthorityAddress,
    allowExternalMelt,
    version,
    dataEntries,
  ]);

  const liveRequest = useMemo(() => ({ method: 'htr_createToken', params }), [params]);

  const handleExecute = () => execute((h) => h.createToken(params));

  const addrSources: ('snap' | 'test' | 'fund' | 'multisig')[] = ['snap', 'test', 'fund', 'multisig'];

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-create-token"
        description="Create a custom token from the snap wallet, with optional mint and melt authorities."
        method="htr_createToken"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Create token"
        description="Name, symbol and amount are required; the rest is optional."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem]">
          <Field label="Token name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Token"
              className="input w-full"
            />
          </Field>
          <Field label="Symbol">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="TKN"
              className="input w-full"
            />
          </Field>
          <Field label="Amount">
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              className="input w-full text-right font-mono text-data tabular-nums"
            />
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-body font-medium">Token version</span>
          <SegmentedControl aria-label="Token version" options={TOKEN_VERSIONS} value={version} onChange={setVersion} />
        </div>

        <section className="flex flex-col gap-3 border-t border-base-300 pt-4" aria-labelledby="snap-token-addresses">
          <h3 id="snap-token-addresses" className="m-0 text-body font-semibold">
            Addresses <span className="font-normal text-ink-muted">(optional)</span>
          </h3>
          <AddressInput
            label="Destination address"
            value={address}
            onChange={setAddress}
            placeholder="Destination address"
            sources={addrSources}
          />
          <AddressInput
            label="Change address"
            value={changeAddress}
            onChange={setChangeAddress}
            placeholder="Change address"
            sources={addrSources}
          />
        </section>

        <section className="flex flex-col gap-3 border-t border-base-300 pt-4" aria-labelledby="snap-token-authorities">
          <h3 id="snap-token-authorities" className="m-0 text-body font-semibold">
            Authorities
          </h3>
          <label className="flex cursor-pointer items-center gap-2 text-body">
            <input
              type="checkbox"
              checked={createMint}
              onChange={(e) => setCreateMint(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            Create mint authority
          </label>
          {createMint && (
            <div className="flex flex-col gap-3 border-l-2 border-base-300 pl-4">
              <AddressInput
                label="Mint authority address"
                value={mintAuthorityAddress}
                onChange={setMintAuthorityAddress}
                sources={addrSources}
              />
              <label className="flex cursor-pointer items-center gap-2 text-body">
                <input
                  type="checkbox"
                  checked={allowExternalMint}
                  onChange={(e) => setAllowExternalMint(e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                Allow external mint authority address
              </label>
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-body">
            <input
              type="checkbox"
              checked={createMelt}
              onChange={(e) => setCreateMelt(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            Create melt authority
          </label>
          {createMelt && (
            <div className="flex flex-col gap-3 border-l-2 border-base-300 pl-4">
              <AddressInput
                label="Melt authority address"
                value={meltAuthorityAddress}
                onChange={setMeltAuthorityAddress}
                sources={addrSources}
              />
              <label className="flex cursor-pointer items-center gap-2 text-body">
                <input
                  type="checkbox"
                  checked={allowExternalMelt}
                  onChange={(e) => setAllowExternalMelt(e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                Allow external melt authority address
              </label>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2 border-t border-base-300 pt-4" aria-labelledby="snap-token-data">
          <h3 id="snap-token-data" className="m-0 text-body font-semibold">
            Data outputs <span className="font-normal text-ink-muted">(optional)</span>
          </h3>
          {dataEntries.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={d}
                onChange={(e) => setDataEntries(dataEntries.map((v, idx) => (idx === i ? e.target.value : v)))}
                aria-label={`Data entry ${i + 1}`}
                className="input w-full flex-1 font-mono text-data"
              />
              <button
                type="button"
                onClick={() => setDataEntries(dataEntries.filter((_, idx) => idx !== i))}
                className="btn btn-ghost btn-sm btn-square"
                aria-label={`Remove data entry ${i + 1}`}
              >
                <MdClose aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDataEntries([...dataEntries, ''])}
            className="btn btn-secondary btn-sm self-start"
          >
            <MdAdd aria-hidden="true" />
            Add data entry
          </button>
        </section>
      </SnapMethodCard>
    </div>
  );
};
