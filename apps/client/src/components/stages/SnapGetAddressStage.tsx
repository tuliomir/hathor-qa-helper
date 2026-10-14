/**
 * Snap Get Address Stage
 *
 * Tests htr_getAddress via MetaMask Snap
 */

import React, { useMemo, useState } from 'react';
import { useSnapMethod } from '../../hooks/useSnapMethod';
import { SnapMethodCard } from '../snap/SnapMethodCard';
import { SnapNotConnectedBanner } from '../snap/SnapNotConnectedBanner';
import Select from '../common/Select';

const ADDRESS_TYPES = ['index', 'first_empty', 'client'] as const;

export const SnapGetAddressStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('getAddress');

  const [type, setType] = useState<string>('index');
  const [index, setIndex] = useState<number>(0);

  const needsIndex = type === 'index';

  const liveRequest = useMemo(() => {
    const params: Record<string, unknown> = { type };
    if (needsIndex) params.index = index;
    return { method: 'htr_getAddress', params };
  }, [type, index, needsIndex]);

  const handleExecute = () => execute((h) => h.getAddress(type, needsIndex ? index : undefined));

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Get Address (Snap)</h1>
      <p className="text-muted mb-7.5">Retrieve addresses by type and index via MetaMask Snap</p>

      {!isSnapConnected && <SnapNotConnectedBanner />}

      {isSnapConnected && (
        <SnapMethodCard
          title="Get Address"
          description="Retrieve an address from the Snap wallet"
          liveRequest={liveRequest}
          methodData={methodData}
          isDryRun={isDryRun}
          onExecute={handleExecute}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Address Type</label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {ADDRESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'index' ? 'Index' : t === 'first_empty' ? 'First Empty' : 'Client'}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted mt-1">
              {type === 'index' && 'Returns the address at a specific derivation index'}
              {type === 'first_empty' && 'Returns the first unused address (requires wallet sync)'}
              {type === 'client' && 'Prompts the MetaMask user to select an address to share'}
            </p>
          </div>
          {needsIndex && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Address Index</label>
              <input
                type="number"
                value={index}
                onChange={(e) => setIndex(parseInt(e.target.value) || 0)}
                min={0}
                className="input"
              />
            </div>
          )}
        </SnapMethodCard>
      )}
    </div>
  );
};
