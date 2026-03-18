/**
 * Snap Bet Deposit Stage
 *
 * Tests htr_sendNanoContractTx (bet) for the Bet nano contract via MetaMask Snap
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import { selectSnapAddress } from '../../store/slices/snapSlice';

export const SnapBetDepositStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('snapBetDeposit');

  const snapAddress = useSelector(selectSnapAddress);

  const [ncId, setNcId] = useState('');
  const [betChoice, setBetChoice] = useState('');
  const [amount, setAmount] = useState('100');
  const [token, setToken] = useState('00');
  const [address, setAddress] = useState(snapAddress ?? '');

  useEffect(() => { if (snapAddress && !address) setAddress(snapAddress); }, [snapAddress]);

  const params = useMemo(() => ({
    method: 'bet',
    nc_id: ncId,
    blueprint_id: null,
    actions: [{ type: 'deposit', token, amount, changeAddress: address }],
    args: [betChoice],
  }), [ncId, betChoice, amount, token, address]);

  const liveRequest = useMemo(
    () => ({ method: 'htr_sendNanoContractTx', params }),
    [params],
  );

  const handleExecute = () => execute((h) => h.sendNanoContractTx(params));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Place Bet (Snap)</h1>
      <p className="text-muted mb-7.5">
        Place a bet on a Bet nano contract via MetaMask Snap
      </p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Place Bet"
          description="Deposit tokens and place a bet on an existing Bet contract"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">NC ID</label>
            <input type="text" value={ncId} onChange={(e) => setNcId(e.target.value)} placeholder="Nano contract ID" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Bet Choice</label>
            <input type="text" value={betChoice} onChange={(e) => setBetChoice(e.target.value)} placeholder="e.g. heads" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount</label>
            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Token UID</label>
            <input type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="00" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your address" className="input" />
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
