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
import CopyButton from '../common/CopyButton';

export const SnapBetInitializeStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } =
    useSnapMethod('snapBetInitialize');

  const snapAddress = useSelector(selectSnapAddress);

  // Form state
  const [blueprintId, setBlueprintId] = useState(NETWORK_CONFIG.TESTNET.betBlueprintId);
  const [oracleAddress, setOracleAddress] = useState(snapAddress ?? '');
  const [token, setToken] = useState('00');
  const [deadline, setDeadline] = useState<string>(() => {
    const date = new Date(Date.now() + 3600 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  });
  const [intermediatesExpanded, setIntermediatesExpanded] = useState(true);

  useEffect(() => { if (snapAddress && !oracleAddress) setOracleAddress(snapAddress); }, [snapAddress]);

  // Intermediate calculations — oracle buffer + timestamp
  const intermediates = useMemo(() => {
    let oracleBuffer: string | null = null;
    let oracleBufferError: string | undefined = undefined;
    let timestamp: number | null = null;

    if (oracleAddress.trim()) {
      try {
        oracleBuffer = getOracleBuffer(oracleAddress);
      } catch (err) {
        oracleBufferError = err instanceof Error ? err.message : 'Invalid oracle address';
      }
    }

    if (deadline) {
      try {
        timestamp = Math.floor(new Date(deadline).getTime() / 1000);
      } catch { /* invalid date */ }
    }

    return { oracleBuffer, oracleBufferError, timestamp };
  }, [oracleAddress, deadline]);

  // Build params using intermediates
  const params = useMemo(() => ({
    method: 'initialize',
    blueprint_id: blueprintId,
    actions: [] as unknown[],
    args: [
      intermediates.oracleBuffer || '',
      token,
      intermediates.timestamp ?? 0,
    ],
    push_tx: true,
    nc_id: null,
  }), [blueprintId, intermediates, token]);

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
        <>
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
              <input type="text" value={oracleAddress} onChange={(e) => setOracleAddress(e.target.value)} placeholder="Oracle address (base58)" className="input" />
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => { if (snapAddress) setOracleAddress(snapAddress); }}
                  disabled={!snapAddress}
                  className="btn-secondary py-1 px-2.5 text-xs whitespace-nowrap"
                  title={snapAddress ? `Use ${snapAddress}` : 'Snap address not available'}
                >
                  Snap Addr0
                </button>
              </div>
              {intermediates.oracleBufferError && (
                <p className="text-xs text-danger mt-1">{intermediates.oracleBufferError}</p>
              )}
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

          {/* Intermediate Calculations */}
          <div className="card-primary mb-7.5">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setIntermediatesExpanded(!intermediatesExpanded)}
                className="text-base font-bold text-primary hover:text-primary-dark flex items-center gap-2"
              >
                <span>{intermediatesExpanded ? '▼' : '▶'}</span>
                Intermediate Calculations
              </button>
            </div>

            {intermediatesExpanded && (
              <div className="bg-yellow-50 border border-yellow-300 rounded p-4">
                <p className="text-sm text-yellow-800 mb-3">
                  These values are calculated automatically from your inputs and will be used in the request.
                </p>
                <div className="space-y-3">
                  {/* Oracle Script */}
                  <div className="bg-white border border-yellow-200 rounded overflow-hidden">
                    <div className="bg-yellow-100 px-3 py-2 border-b border-yellow-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-yellow-800">
                          Oracle Script (hex from address)
                        </span>
                        {intermediates.oracleBuffer && (
                          <CopyButton text={intermediates.oracleBuffer} label="Copy" />
                        )}
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      {intermediates.oracleBufferError ? (
                        <span className="text-sm text-red-600">{intermediates.oracleBufferError}</span>
                      ) : intermediates.oracleBuffer ? (
                        <span className="text-sm font-mono text-yellow-900 break-all">
                          {intermediates.oracleBuffer}
                        </span>
                      ) : (
                        <span className="text-sm text-muted italic">
                          Enter oracle address to calculate
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="bg-white border border-yellow-200 rounded overflow-hidden">
                    <div className="bg-yellow-100 px-3 py-2 border-b border-yellow-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-yellow-800">
                          Unix Timestamp (from deadline)
                        </span>
                        {intermediates.timestamp !== null && (
                          <CopyButton text={intermediates.timestamp.toString()} label="Copy" />
                        )}
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      {intermediates.timestamp !== null ? (
                        <span className="text-sm font-mono text-yellow-900">
                          {intermediates.timestamp}
                        </span>
                      ) : (
                        <span className="text-sm text-muted italic">
                          Enter deadline to calculate
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
