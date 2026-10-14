/**
 * Snap Fee Withdraw Stage
 *
 * Tests htr_sendNanoContractTx (noop + withdrawal) for the Fee nano contract via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { useRequireSnap } from '../../hooks/useRequirements';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Field } from '../ui/Field';
import { firstUnmetReason } from '../../utils/requirements';
import { AddressInput } from '../common/AddressInput';
import { selectSnapAddress, selectSnapFeeNc } from '../../store/slices/snapSlice';

export const SnapFeeWithdrawStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('snapFeeWithdraw');
  const snapRequirement = useRequireSnap();

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
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-fee-withdraw"
        description="Withdraw a fee-based token from an existing Fee nano contract."
        method="htr_sendNanoContractTx"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Withdraw fee token"
        description="The NC ID comes from Initialize fee when it ran in this session."
        liveRequest={liveRequest}
        methodData={methodData}
        isDryRun={isDryRun}
        onExecute={handleExecute}
        disabledReason={firstUnmetReason([snapRequirement])}
      >
        <Field label="NC ID">
          <input
            type="text"
            value={ncId}
            onChange={(e) => setNcId(e.target.value)}
            placeholder="Nano contract ID"
            className="input w-full font-mono text-data"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field label="Fee token UID">
            <input
              type="text"
              value={feeToken}
              onChange={(e) => setFeeToken(e.target.value)}
              placeholder="Token UID"
              className="input w-full font-mono text-data"
            />
          </Field>
          <Field label="Amount">
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="input w-full text-right font-mono text-data tabular-nums"
            />
          </Field>
        </div>
        <AddressInput
          label="Withdrawal address"
          value={withdrawAddress}
          onChange={setWithdrawAddress}
          placeholder="Your address"
          suggestedValue={snapAddress ?? undefined}
          sources={['snap']}
        />
        <label className="flex cursor-pointer items-center gap-2 text-body">
          <input
            type="checkbox"
            checked={contractPaysFees}
            onChange={(e) => setContractPaysFees(e.target.checked)}
            className="checkbox checkbox-sm"
          />
          Contract pays fees
        </label>
        {contractPaysFees && (
          <Field label="HTR withdraw amount" className="sm:max-w-60" hint="HTR the contract withdraws to pay the fees.">
            <input
              type="text"
              inputMode="numeric"
              value={htrWithdrawAmount}
              onChange={(e) => setHtrWithdrawAmount(e.target.value)}
              placeholder="1"
              className="input w-full text-right font-mono text-data tabular-nums"
            />
          </Field>
        )}
      </SnapMethodCard>
    </div>
  );
};
