/**
 * Snap Create NC + Token Stage
 *
 * Tests htr_createNanoContractCreateTokenTx via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';

export const SnapCreateNcTokenStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('createNcToken');

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
    if (createMint && mintAddress.trim())
      createTokenOptions.mint_authority_address = mintAddress;
    if (createMint)
      createTokenOptions.allow_external_mint_authority_address = allowExternalMint;

    const data: Record<string, unknown> = {
      blueprint_id: blueprintId || '<blueprint_id>',
      actions: [],
      args,
    };

    return { method, createTokenOptions, data };
  }, [
    method, blueprintId, argsText, tokenName, tokenSymbol, tokenAmount,
    tokenAddress, changeAddress, contractPaysDeposit, createMint,
    mintAddress, allowExternalMint, createMelt,
  ]);

  const liveRequest = useMemo(
    () => ({ method: 'htr_createNanoContractCreateTokenTx', params }),
    [params],
  );

  const handleExecute = () =>
    execute((h) => h.createNanoContractCreateTokenTx(params));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">NC + Create Token (Snap)</h1>
      <p className="text-muted mb-7.5">
        Create a nano contract with simultaneous token creation via MetaMask Snap
      </p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="NC + Create Token"
          description="Combined nano contract and token creation"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          {/* NC Fields */}
          <h4 className="text-sm font-bold text-gray-700 mt-2">Nano Contract</h4>
          <div>
            <label className="block text-sm font-medium mb-1.5">Method</label>
            <input type="text" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="initialize" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Blueprint ID</label>
            <input type="text" value={blueprintId} onChange={(e) => setBlueprintId(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Args (JSON array)</label>
            <textarea value={argsText} onChange={(e) => setArgsText(e.target.value)} placeholder='["arg1", "arg2"]' className="input min-h-16" rows={2} />
          </div>

          {/* Token Fields */}
          <h4 className="text-sm font-bold text-gray-700 mt-4">Token Options</h4>
          <div>
            <label className="block text-sm font-medium mb-1.5">Token Name</label>
            <input type="text" value={tokenName} onChange={(e) => setTokenName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Symbol</label>
            <input type="text" value={tokenSymbol} onChange={(e) => setTokenSymbol(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount</label>
            <input type="text" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Address (optional)</label>
            <input type="text" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Change Address (optional)</label>
            <input type="text" value={changeAddress} onChange={(e) => setChangeAddress(e.target.value)} className="input" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={contractPaysDeposit} onChange={(e) => setContractPaysDeposit(e.target.checked)} className="checkbox checkbox-primary" id="ncContractPays" />
            <label htmlFor="ncContractPays" className="text-sm cursor-pointer">Contract Pays Token Deposit</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={createMint} onChange={(e) => setCreateMint(e.target.checked)} className="checkbox checkbox-primary" id="ncCreateMint" />
            <label htmlFor="ncCreateMint" className="text-sm cursor-pointer">Create Mint Authority</label>
          </div>
          {createMint && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Mint Authority Address</label>
                <input type="text" value={mintAddress} onChange={(e) => setMintAddress(e.target.value)} className="input" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={allowExternalMint} onChange={(e) => setAllowExternalMint(e.target.checked)} className="checkbox checkbox-primary" id="ncExtMint" />
                <label htmlFor="ncExtMint" className="text-sm cursor-pointer">Allow External Mint Authority</label>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={createMelt} onChange={(e) => setCreateMelt(e.target.checked)} className="checkbox checkbox-primary" id="ncCreateMelt" />
            <label htmlFor="ncCreateMelt" className="text-sm cursor-pointer">Create Melt Authority</label>
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
