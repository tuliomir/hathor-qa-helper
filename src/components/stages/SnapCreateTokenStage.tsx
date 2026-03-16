/**
 * Snap Create Token Stage
 *
 * Tests htr_createToken via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import Select from '../common/Select';

export const SnapCreateTokenStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('createToken');

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('100');
  const [address, setAddress] = useState('');
  const [changeAddress, setChangeAddress] = useState('');
  const [createMint, setCreateMint] = useState(false);
  const [mintAuthorityAddress, setMintAuthorityAddress] = useState('');
  const [allowExternalMint, setAllowExternalMint] = useState(false);
  const [createMelt, setCreateMelt] = useState(false);
  const [meltAuthorityAddress, setMeltAuthorityAddress] = useState('');
  const [allowExternalMelt, setAllowExternalMelt] = useState(false);
  const [version, setVersion] = useState('');
  const [pushTx, setPushTx] = useState(true);
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
    if (createMint && mintAuthorityAddress.trim())
      p.mint_authority_address = mintAuthorityAddress;
    if (createMint) p.allow_external_mint_authority_address = allowExternalMint;
    if (createMelt && meltAuthorityAddress.trim())
      p.melt_authority_address = meltAuthorityAddress;
    if (createMelt) p.allow_external_melt_authority_address = allowExternalMelt;
    if (version) p.version = version;
    if (!pushTx) p.push_tx = false;
    const filtered = dataEntries.filter((d) => d.trim() !== '');
    if (filtered.length > 0) p.data = filtered;
    return p;
  }, [
    name, symbol, amount, address, changeAddress,
    createMint, mintAuthorityAddress, allowExternalMint,
    createMelt, meltAuthorityAddress, allowExternalMelt,
    version, pushTx, dataEntries,
  ]);

  const liveRequest = useMemo(
    () => ({ method: 'htr_createToken', params }),
    [params],
  );

  const handleExecute = () => execute((h) => h.createToken(params));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Create Token (Snap)</h1>
      <p className="text-muted mb-7.5">
        Create a new custom token via MetaMask Snap
      </p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Create Token"
          description="Create a new token with optional mint/melt authorities"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Token Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Token" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Symbol</label>
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="TKN" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount</label>
            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Token Version</label>
            <Select value={version} onChange={(e) => setVersion(e.target.value)}>
              <option value="">Default</option>
              <option value="token_version:fee_token">Fee-based</option>
              <option value="token_version:deposit_token">Deposit-based</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Address (optional)</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Destination address" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Change Address (optional)</label>
            <input type="text" value={changeAddress} onChange={(e) => setChangeAddress(e.target.value)} placeholder="Change address" className="input" />
          </div>

          {/* Mint Authority */}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={createMint} onChange={(e) => setCreateMint(e.target.checked)} className="checkbox checkbox-primary" id="snapCreateMint" />
            <label htmlFor="snapCreateMint" className="text-sm cursor-pointer">Create Mint Authority</label>
          </div>
          {createMint && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Mint Authority Address</label>
                <input type="text" value={mintAuthorityAddress} onChange={(e) => setMintAuthorityAddress(e.target.value)} className="input" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={allowExternalMint} onChange={(e) => setAllowExternalMint(e.target.checked)} className="checkbox checkbox-primary" id="snapExtMint" />
                <label htmlFor="snapExtMint" className="text-sm cursor-pointer">Allow External Mint Authority</label>
              </div>
            </>
          )}

          {/* Melt Authority */}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={createMelt} onChange={(e) => setCreateMelt(e.target.checked)} className="checkbox checkbox-primary" id="snapCreateMelt" />
            <label htmlFor="snapCreateMelt" className="text-sm cursor-pointer">Create Melt Authority</label>
          </div>
          {createMelt && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Melt Authority Address</label>
                <input type="text" value={meltAuthorityAddress} onChange={(e) => setMeltAuthorityAddress(e.target.value)} className="input" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={allowExternalMelt} onChange={(e) => setAllowExternalMelt(e.target.checked)} className="checkbox checkbox-primary" id="snapExtMelt" />
                <label htmlFor="snapExtMelt" className="text-sm cursor-pointer">Allow External Melt Authority</label>
              </div>
            </>
          )}

          {/* Push Transaction */}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={pushTx} onChange={(e) => setPushTx(e.target.checked)} className="checkbox checkbox-primary" id="snapPushTx" />
            <label htmlFor="snapPushTx" className="text-sm cursor-pointer">Push Transaction</label>
          </div>

          {/* Data Entries */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Data Entries (optional)</label>
            {dataEntries.map((d, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={d}
                  onChange={(e) => setDataEntries(dataEntries.map((v, idx) => (idx === i ? e.target.value : v)))}
                  className="input flex-1"
                />
                <button onClick={() => setDataEntries(dataEntries.filter((_, idx) => idx !== i))} className="btn-secondary py-1.5 px-3 text-sm">Remove</button>
              </div>
            ))}
            <button onClick={() => setDataEntries([...dataEntries, ''])} className="btn-secondary py-1.5 px-3 text-sm">+ Add Data</button>
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
