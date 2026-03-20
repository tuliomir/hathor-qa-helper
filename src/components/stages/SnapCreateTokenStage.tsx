/**
 * Snap Create Token Stage
 *
 * Tests htr_createToken via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { useWalletStore } from '../../hooks/useWalletStore';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import { selectSnapAddress } from '../../store/slices/snapSlice';
import type { RootState } from '../../store';
import type { WalletInfo } from '../../types/walletStore';
import Select from '../common/Select';

/** Reusable row of quick-fill address buttons */
function AddressButtons({
  snapAddress,
  testWallet,
  fundingWallet,
  onFill,
}: {
  snapAddress: string | null;
  testWallet: WalletInfo | null;
  fundingWallet: WalletInfo | null;
  onFill: (addr: string) => void;
}) {
  const fillTest = async () => {
    if (!testWallet?.instance) return;
    try {
      onFill(await testWallet.instance.getAddressAtIndex(0));
    } catch {
      /* ignore */
    }
  };
  const fillFund = async () => {
    if (!fundingWallet?.instance) return;
    try {
      onFill(await fundingWallet.instance.getAddressAtIndex(0));
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="flex gap-2 mt-1.5">
      <button
        type="button"
        onClick={() => {
          if (snapAddress) onFill(snapAddress);
        }}
        disabled={!snapAddress}
        className="btn-secondary py-1 px-2.5 text-xs whitespace-nowrap"
        title="Use address 0 from the connected Snap wallet"
      >
        Snap Addr0
      </button>
      <button
        type="button"
        onClick={fillTest}
        disabled={!testWallet?.instance}
        className="btn-secondary py-1 px-2.5 text-xs whitespace-nowrap"
        title="Use address 0 from the test wallet"
      >
        Test Addr0
      </button>
      <button
        type="button"
        onClick={fillFund}
        disabled={!fundingWallet?.instance}
        className="btn-secondary py-1 px-2.5 text-xs whitespace-nowrap"
        title="Use address 0 from the funding wallet"
      >
        Fund Addr0
      </button>
    </div>
  );
}

export const SnapCreateTokenStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('createToken');

  const snapAddress = useSelector(selectSnapAddress);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const fundingWalletId = useSelector((state: RootState) => state.walletSelection.fundingWalletId);
  const { getWallet } = useWalletStore();
  const testWallet = (testWalletId ? getWallet(testWalletId) : null) ?? null;
  const fundingWallet = (fundingWalletId ? getWallet(fundingWalletId) : null) ?? null;

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
  const [version, setVersion] = useState('deposit');
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

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Create Token (Snap)</h1>
      <p className="text-muted mb-7.5">Create a new custom token via MetaMask Snap</p>

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
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Token"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="TKN"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Token Version</label>
            <Select value={version} onChange={(e) => setVersion(e.target.value)}>
              <option value="deposit">Deposit-based</option>
              <option value="fee">Fee-based</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Address (optional)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Destination address"
              className="input"
            />
            <AddressButtons
              snapAddress={snapAddress}
              testWallet={testWallet}
              fundingWallet={fundingWallet}
              onFill={setAddress}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Change Address (optional)</label>
            <input
              type="text"
              value={changeAddress}
              onChange={(e) => setChangeAddress(e.target.value)}
              placeholder="Change address"
              className="input"
            />
            <AddressButtons
              snapAddress={snapAddress}
              testWallet={testWallet}
              fundingWallet={fundingWallet}
              onFill={setChangeAddress}
            />
          </div>

          {/* Mint Authority */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={createMint}
              onChange={(e) => setCreateMint(e.target.checked)}
              className="checkbox checkbox-primary"
              id="snapCreateMint"
            />
            <label htmlFor="snapCreateMint" className="text-sm cursor-pointer">
              Create Mint Authority
            </label>
          </div>
          {createMint && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Mint Authority Address</label>
                <input
                  type="text"
                  value={mintAuthorityAddress}
                  onChange={(e) => setMintAuthorityAddress(e.target.value)}
                  className="input"
                />
                <AddressButtons
                  snapAddress={snapAddress}
                  testWallet={testWallet}
                  fundingWallet={fundingWallet}
                  onFill={setMintAuthorityAddress}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowExternalMint}
                  onChange={(e) => setAllowExternalMint(e.target.checked)}
                  className="checkbox checkbox-primary"
                  id="snapExtMint"
                />
                <label htmlFor="snapExtMint" className="text-sm cursor-pointer">
                  Allow External Mint Authority
                </label>
              </div>
            </>
          )}

          {/* Melt Authority */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={createMelt}
              onChange={(e) => setCreateMelt(e.target.checked)}
              className="checkbox checkbox-primary"
              id="snapCreateMelt"
            />
            <label htmlFor="snapCreateMelt" className="text-sm cursor-pointer">
              Create Melt Authority
            </label>
          </div>
          {createMelt && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Melt Authority Address</label>
                <input
                  type="text"
                  value={meltAuthorityAddress}
                  onChange={(e) => setMeltAuthorityAddress(e.target.value)}
                  className="input"
                />
                <AddressButtons
                  snapAddress={snapAddress}
                  testWallet={testWallet}
                  fundingWallet={fundingWallet}
                  onFill={setMeltAuthorityAddress}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowExternalMelt}
                  onChange={(e) => setAllowExternalMelt(e.target.checked)}
                  className="checkbox checkbox-primary"
                  id="snapExtMelt"
                />
                <label htmlFor="snapExtMelt" className="text-sm cursor-pointer">
                  Allow External Melt Authority
                </label>
              </div>
            </>
          )}

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
                <button
                  onClick={() => setDataEntries(dataEntries.filter((_, idx) => idx !== i))}
                  className="btn-secondary py-1.5 px-3 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
            <button onClick={() => setDataEntries([...dataEntries, ''])} className="btn-secondary py-1.5 px-3 text-sm">
              + Add Data
            </button>
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
