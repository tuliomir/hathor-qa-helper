/**
 * Snap Fee Deposit Stage
 *
 * Tests htr_sendNanoContractTx (noop + deposit) for the Fee nano contract via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import { AddressInput } from '../common/AddressInput';
import { selectSnapAddress } from '../../store/slices/snapSlice';

export const SnapFeeDepositStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('snapFeeDeposit');

  const snapAddress = useSelector(selectSnapAddress);

  const [ncId, setNcId] = useState('');
  const [feeToken, setFeeToken] = useState('');
  const [amount, setAmount] = useState('');
  const [changeAddress, setChangeAddress] = useState(snapAddress ?? '');
  const [contractPaysFees, setContractPaysFees] = useState(false);
  const [htrWithdrawAmount, setHtrWithdrawAmount] = useState('');

  const params = useMemo(() => {
    const actions: Array<Record<string, unknown>> = [];
    if (contractPaysFees && htrWithdrawAmount) {
      actions.push({
        type: 'withdrawal',
        token: '00',
        amount: htrWithdrawAmount,
        address: changeAddress,
        changeAddress,
      });
    }
    actions.push({ type: 'deposit', token: feeToken, amount, changeAddress });
    return {
      method: 'noop',
      nc_id: ncId,
      blueprint_id: null,
      actions,
      args: [],
      ...(contractPaysFees && { contract_pays_fees: true }),
    };
  }, [ncId, feeToken, amount, changeAddress, contractPaysFees, htrWithdrawAmount]);

  const liveRequest = useMemo(() => ({ method: 'htr_sendNanoContractTx', params }), [params]);

  const handleExecute = () => execute((h) => h.sendNanoContractTx(params));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Deposit Fee Token (Snap)</h1>
      <p className="text-muted mb-7.5">Deposit a fee-based token into a Fee nano contract via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Deposit Fee Token"
          description="Deposit a fee-based token into an existing Fee contract"
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
              placeholder="Amount to deposit"
              className="input"
            />
          </div>
          <AddressInput
            label="Change Address"
            value={changeAddress}
            onChange={setChangeAddress}
            placeholder="Change address"
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
