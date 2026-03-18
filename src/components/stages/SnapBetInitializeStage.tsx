/**
 * Snap Bet Initialize Stage
 *
 * Tests htr_sendNanoContractTx (initialize) for the Bet nano contract via MetaMask Snap
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import { selectSnapAddress } from '../../store/slices/snapSlice';
import { NETWORK_CONFIG } from '../../constants/network';
import { getOracleBuffer } from '../../utils/betHelpers';

export const SnapBetInitializeStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('snapBetInitialize');

  const snapAddress = useSelector(selectSnapAddress);

  const [blueprintId, setBlueprintId] = useState(NETWORK_CONFIG.TESTNET.betBlueprintId);
  const [oracleAddress, setOracleAddress] = useState(snapAddress ?? '');
  const [token, setToken] = useState('00');
  const [deadline, setDeadline] = useState<string>(() => {
    const date = new Date(Date.now() + 3600 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  });

  useEffect(() => { if (snapAddress && !oracleAddress) setOracleAddress(snapAddress); }, [snapAddress]);

  const params = useMemo(() => {
    // Convert base58 oracle address to hex-encoded P2PKH script buffer
    let oracleScript = '';
    try {
      if (oracleAddress.trim()) oracleScript = getOracleBuffer(oracleAddress);
    } catch { /* leave empty — live preview will show the issue */ }
    const ts = deadline ? Math.floor(new Date(deadline).getTime() / 1000) : 0;
    return {
      method: 'initialize',
      blueprint_id: blueprintId,
      actions: [] as unknown[],
      args: [oracleScript, token, ts],
      push_tx: true,
      nc_id: null,
    };
  }, [blueprintId, oracleAddress, token, deadline]);

  const liveRequest = useMemo(
    () => ({ method: 'htr_sendNanoContractTx', params }),
    [params],
  );

  const handleExecute = () => execute((h) => h.sendNanoContractTx(params));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Initialize Bet (Snap)</h1>
      <p className="text-muted mb-7.5">
        Initialize a Bet nano contract via MetaMask Snap
      </p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Initialize Bet"
          description="Create a new Bet nano contract instance"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Blueprint ID</label>
            <input type="text" value={blueprintId} onChange={(e) => setBlueprintId(e.target.value)} placeholder="Bet blueprint ID" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Oracle Address</label>
            <input type="text" value={oracleAddress} onChange={(e) => setOracleAddress(e.target.value)} placeholder="Oracle address" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Token UID</label>
            <input type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="00" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Deadline</label>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
          </div>
        </SnapMethodCard>
      )}
    </div>
  );
};
