/**
 * Snap Fee Initialize Stage
 *
 * Tests htr_sendNanoContractTx (initialize) for the Fee nano contract via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import { AddressInput } from '../common/AddressInput';
import { selectSnapAddress, setSnapFeeNc } from '../../store/slices/snapSlice';
import { parseSnapResponse, isSnapEnvelope, isTransactionLike } from '../../utils/snapResponseHelpers';
import { NETWORK_CONFIG } from '../../constants/network';
import type { AppDispatch } from '../../store';

export const SnapFeeInitializeStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('snapFeeInitialize');

  const snapAddress = useSelector(selectSnapAddress);

  const [blueprintId, setBlueprintId] = useState(NETWORK_CONFIG.TESTNET.feeBlueprintId);
  const [htrAmount, setHtrAmount] = useState('2');
  const [changeAddress, setChangeAddress] = useState(snapAddress ?? '');

  const params = useMemo(
    () => ({
      method: 'initialize',
      blueprint_id: blueprintId,
      actions: [{ type: 'deposit', token: '00', amount: htrAmount, changeAddress }],
      args: [],
      nc_id: null,
    }),
    [blueprintId, htrAmount, changeAddress]
  );

  const liveRequest = useMemo(() => ({ method: 'htr_sendNanoContractTx', params }), [params]);

  const handleExecute = async () => {
    const result = await execute((h) => h.sendNanoContractTx(params));
    const parsed = parseSnapResponse(result.response);
    const inner = isSnapEnvelope(parsed) ? (parsed as { response: unknown }).response : parsed;
    if (inner && typeof inner === 'object' && isTransactionLike(inner)) {
      const hash = (inner as Record<string, unknown>).hash as string | undefined;
      if (hash) {
        dispatch(setSnapFeeNc({ ncId: hash }));
      }
    }
    return result;
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Initialize Fee (Snap)</h1>
      <p className="text-muted mb-7.5">Initialize a Fee nano contract via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Initialize Fee"
          description="Create a new Fee nano contract instance with an HTR deposit"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Blueprint ID</label>
            <input
              type="text"
              value={blueprintId}
              onChange={(e) => setBlueprintId(e.target.value)}
              placeholder="Fee blueprint ID"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">HTR Amount</label>
            <input
              type="text"
              value={htrAmount}
              onChange={(e) => setHtrAmount(e.target.value)}
              placeholder="100"
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
        </SnapMethodCard>
      )}
    </div>
  );
};
