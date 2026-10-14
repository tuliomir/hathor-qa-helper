/**
 * Snap Bet Deposit Stage
 *
 * Tests htr_sendNanoContractTx (bet) for the Bet nano contract via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { useRequireSnap } from '../../hooks/useRequirements';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Field } from '../ui/Field';
import { firstUnmetReason } from '../../utils/requirements';
import { AddressInput } from '../common/AddressInput';
import { selectSnapAddress, selectSnapBetNc, setSnapBetNc } from '../../store/slices/snapSlice';
import type { AppDispatch } from '../../store';

export const SnapBetDepositStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isDryRun, methodData, execute } = useSnapMethod('snapBetDeposit');
  const snapRequirement = useRequireSnap();

  const snapAddress = useSelector(selectSnapAddress);
  const betNc = useSelector(selectSnapBetNc);

  const [ncId, setNcId] = useState(betNc.ncId ?? '');
  const [betChoice, setBetChoice] = useState('Result_1');
  const [amount, setAmount] = useState('10');
  const [token, setToken] = useState(betNc.token ?? '00');
  const [address, setAddress] = useState(snapAddress ?? '');

  const params = useMemo(
    () => ({
      method: 'bet',
      nc_id: ncId,
      blueprint_id: null,
      actions: [{ type: 'deposit', token, amount, changeAddress: address }],
      args: [address, betChoice],
    }),
    [ncId, betChoice, amount, token, address]
  );

  const liveRequest = useMemo(() => ({ method: 'htr_sendNanoContractTx', params }), [params]);

  const handleExecute = async () => {
    const result = await execute((h) => h.sendNanoContractTx(params));
    dispatch(setSnapBetNc({ betChoice, amount }));
    return result;
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="snap-bet-deposit"
        description="Deposit tokens and place a bet on an existing Bet nano contract."
        method="htr_sendNanoContractTx"
      />
      <PreconditionStrip requirements={[snapRequirement]} />

      <SnapMethodCard
        title="Place bet"
        description="The NC ID and token come from Initialize bet when it ran in this session."
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
        <Field label="Bet choice">
          <input
            type="text"
            value={betChoice}
            onChange={(e) => setBetChoice(e.target.value)}
            placeholder="Result_1"
            className="input w-full"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <Field label="Amount">
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
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
        <AddressInput
          label="Address"
          value={address}
          onChange={setAddress}
          placeholder="Your address"
          suggestedValue={snapAddress ?? undefined}
          sources={['snap']}
        />
      </SnapMethodCard>
    </div>
  );
};
