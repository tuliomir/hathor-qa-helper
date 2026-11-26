/**
 * Hathor Next addresses: the `samba1…` address of every seed wallet on Next
 * testnet, derived here from its seed (as the mobile wallet does), and fresh
 * seeds with their address. No backend involved.
 */

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { walletUtils } from '@hathor/wallet-lib';
import type { RootState } from '../../store';
import { StageHeader } from '../common/StageHeader';
import { Identifier } from '../common/Identifier';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { nextAddressOf } from '../../services/hathorNext/address';

interface Generated {
  words: string;
  address: string;
}

export function HathorNextAddressesStage() {
  const wallets = useSelector((s: RootState) =>
    Object.values(s.walletStore.wallets).filter((w) => w.metadata.network === 'NEXT_TESTNET' && w.metadata.seedWords)
  );
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<Generated[]>([]);
  const [error, setError] = useState<string | null>(null);

  const seedKey = wallets.map((w) => w.metadata.id).join(',');
  useEffect(() => {
    let live = true;
    Promise.all(wallets.map(async (w) => [w.metadata.id, await nextAddressOf(w.metadata.seedWords)] as const))
      .then((pairs) => live && setAddresses(Object.fromEntries(pairs)))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when the wallet list changes
  }, [seedKey]);

  const generate = async () => {
    try {
      const words = walletUtils.generateWalletWords();
      const address = await nextAddressOf(words);
      setGenerated((g) => [{ words, address }, ...g]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="hathor-next-addresses" />

      <Panel
        title="Next testnet wallets"
        description="Each seed wallet's address on Hathor Next (testnet-alpha): the one the mobile wallet shows for the same words."
      >
        {wallets.length === 0 ? (
          <p className="text-data text-ink-muted">No seed wallet on Next testnet. Add one in Wallet initialization.</p>
        ) : (
          <ul className="m-0 flex flex-col gap-3 pl-0">
            {wallets.map((w) => (
              <li key={w.metadata.id} className="flex list-none flex-col gap-1 text-data">
                <span className="font-semibold">{w.metadata.friendlyName}</span>
                {addresses[w.metadata.id] ? (
                  <Identifier value={addresses[w.metadata.id]} kind="address" walletTag={false} truncate="none" />
                ) : (
                  <span className="text-ink-muted">Deriving…</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="New address"
        description="A fresh seed and its Hathor Next address. Keep the words, or add them in Wallet initialization: what this address receives is only theirs."
      >
        <div className="flex flex-col gap-3">
          <div>
            <button type="button" className="btn btn-primary btn-sm" onClick={generate}>
              Generate
            </button>
          </div>
          {generated.map((g) => (
            <div key={g.address} className="flex flex-col gap-1 rounded-box border border-line p-3 text-data">
              <Identifier value={g.address} kind="address" walletTag={false} truncate="none" />
              <span className="font-mono text-caption text-ink-muted">{g.words}</span>
            </div>
          ))}
        </div>
      </Panel>

      {error && (
        <Callout tone="error" title="Failed" role="alert">
          {error}
        </Callout>
      )}
    </div>
  );
}

export default HathorNextAddressesStage;
