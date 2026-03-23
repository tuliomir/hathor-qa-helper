/**
 * Snap Fee Withdraw Stage
 *
 * Tests htr_sendNanoContractTx (noop + withdrawal) for the Fee nano contract via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import { AddressInput } from '../common/AddressInput';
import { selectSnapAddress, selectSnapFeeNc } from '../../store/slices/snapSlice';

export const SnapFeeWithdrawStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('snapFeeWithdraw');

  const snapAddress = useSelector(selectSnapAddress);
  const feeNc = useSelector(selectSnapFeeNc);

  const [ncId, setNcId] = useState(feeNc.ncId ?? '');
  const [feeToken, setFeeToken] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState(snapAddress ?? '');
  const [contractPaysFees, setContractPaysFees] = useState(false);
  const [htrWithdrawAmount, setHtrWithdrawAmount] = useState('1');

  const params = useMemo(() => {
    const actions: Array<Record<string, unknown>> = [];
    if (contractPaysFees && htrWithdrawAmount) {
      actions.push({
        type: 'withdrawal',
        token: '00',
        amount: htrWithdrawAmount,
        address: withdrawAddress,
        changeAddress: withdrawAddress,
      });
    }
    actions.push({
      type: 'withdrawal',
      token: feeToken,
      amount,
      address: withdrawAddress,
      changeAddress: withdrawAddress,
    });
    return {
      method: 'noop',
      nc_id: ncId,
      blueprint_id: null,
      actions,
      args: [],
      ...(contractPaysFees && { contract_pays_fees: true }),
    };
  }, [ncId, feeToken, amount, withdrawAddress, contractPaysFees, htrWithdrawAmount]);

  const liveRequest = useMemo(() => ({ method: 'htr_sendNanoContractTx', params }), [params]);

  const handleExecute = () => execute((h) => h.sendNanoContractTx(params));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Withdraw Fee Token (Snap)</h1>
      <p className="text-muted mb-7.5">Withdraw a fee-based token from a Fee nano contract via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Withdraw Fee Token"
          description="Withdraw a fee-based token from an existing Fee contract"
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
            <label className="block text-sm font-medium mb-1.5">Fee Token UID</label>
            <input
              type="text"
              value={feeToken}
              onChange={(e) => setFeeToken(e.target.value)}
              placeholder="Token UID"
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
          <AddressInput
            label="Withdrawal Address"
            value={withdrawAddress}
            onChange={setWithdrawAddress}
            placeholder="Your address"
            suggestedValue={snapAddress ?? undefined}
            sources={['snap']}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={contractPaysFees}
              onChange={(e) => setContractPaysFees(e.target.checked)}
              className="checkbox checkbox-primary"
            />
            <label className="text-sm font-medium">Contract Pays Fees</label>
          </div>
          {contractPaysFees && (
            <div>
              <label className="block text-sm font-medium mb-1.5">HTR Withdraw Amount</label>
              <input
                type="text"
                value={htrWithdrawAmount}
                onChange={(e) => setHtrWithdrawAmount(e.target.value)}
                placeholder="HTR amount to withdraw for fees"
                className="input"
              />
            </div>
          )}
        </SnapMethodCard>
      )}
    </div>
  );
};
