/**
 * Snap Bet Withdraw Stage
 *
 * Tests htr_sendNanoContractTx (withdraw) for the Bet nano contract via MetaMask Snap
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import { selectSnapAddress } from '../../store/slices/snapSlice';

export const SnapBetWithdrawStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('snapBetWithdraw');

  const snapAddress = useSelector(selectSnapAddress);

  const [ncId, setNcId] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState(snapAddress ?? '');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('00');

  useEffect(() => {
    if (snapAddress && !withdrawAddress) setWithdrawAddress(snapAddress);
  }, [snapAddress]);

  const params = useMemo(
    () => ({
      method: 'withdraw',
      nc_id: ncId,
      blueprint_id: null,
      actions: [{ type: 'withdrawal', token, amount, address: withdrawAddress, changeAddress: withdrawAddress }],
      args: [],
    }),
    [ncId, withdrawAddress, amount, token]
  );

  const liveRequest = useMemo(() => ({ method: 'htr_sendNanoContractTx', params }), [params]);

  const handleExecute = () => execute((h) => h.sendNanoContractTx(params));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Withdraw Prize (Snap)</h1>
      <p className="text-muted mb-7.5">Withdraw winnings from a Bet nano contract via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Withdraw Prize"
          description="Withdraw tokens from a resolved Bet contract"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">NC ID</label>
            <input
              type="text"
              value={ncId}
              onChange={(e) => setNcId(e.target.value)}
              placeholder="Nano contract ID"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Withdrawal Address</label>
            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              placeholder="Your address"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount to withdraw"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Token UID</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="00"
              className="input"
            />
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
