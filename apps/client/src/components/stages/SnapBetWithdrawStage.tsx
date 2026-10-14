/**
 * Snap Bet Withdraw Stage
 *
 * Tests htr_sendNanoContractTx (withdraw) for the Bet nano contract via MetaMask Snap
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
import { selectSnapAddress, selectSnapBetNc } from '../../store/slices/snapSlice';

export const SnapBetWithdrawStage: React.FC = () => {
  const { isDryRun, methodData, execute } = useSnapMethod('snapBetWithdraw');
  const snapRequirement = useRequireSnap();

  const snapAddress = useSelector(selectSnapAddress);
  const betNc = useSelector(selectSnapBetNc);

  const [ncId, setNcId] = useState(betNc.ncId ?? '');
  const [withdrawAddress, setWithdrawAddress] = useState(snapAddress ?? '');
  const [amount, setAmount] = useState(betNc.amount ?? '');
  const [token, setToken] = useState(betNc.token ?? '00');

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
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-bet-withdraw"
        description="Withdraw winnings from a resolved Bet nano contract."
        method="htr_sendNanoContractTx"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Withdraw prize"
        description="The NC ID, amount and token come from earlier Bet stages in this session."
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
        <AddressInput
          label="Withdrawal address"
          value={withdrawAddress}
          onChange={setWithdrawAddress}
          placeholder="Your address"
          suggestedValue={snapAddress ?? undefined}
          sources={['snap']}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
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
          <Field label="Token UID">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="00"
              className="input w-full font-mono text-data"
            />
          </Field>
        </div>
      </SnapMethodCard>
    </div>
  );
};
