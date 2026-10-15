/**
 * Shielded balances: a wallet's HTR balance split into transparent and
 * shielded UTXOs, as the browser decodes it.
 */

import { useState } from 'react';
import { StageHeader } from '../common/StageHeader';
import { CapabilityBadge } from '../common/CapabilityBadge';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { WalletBalance } from '../shielded/WalletBalance';
import { ShieldedWalletSelect } from '../shielded/ShieldedWalletSelect';
import { useAppSelector } from '../../store/hooks';
import { canCreateShieldedOutputs } from '../../services/shieldedCapability';

export function ShieldedBalancesStage() {
  const [walletId, setWalletId] = useState<string | null>(null);
  const capability = useAppSelector((s) =>
    walletId ? s.walletStore.wallets[walletId]?.shieldedCapability : undefined
  );

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="shielded-balances" />
      <Callout tone="shielded">
        wallet-lib counts shielded outputs in the token balance with no split, so the shielded share comes from the
        UTXOs: <code className="font-mono text-data-sm">getUtxos(&#123; shielded: true &#125;)</code> lists shielded
        UTXOs only, and the default lists transparent ones only.
      </Callout>
      <Panel title="Balance">
        <ShieldedWalletSelect value={walletId} onChange={setWalletId} />
        {walletId && (
          <p className="m-0 flex items-center gap-2 text-caption text-ink-muted">
            Browser capability
            <CapabilityBadge
              level={capability?.level ?? 'none'}
              canCreateShieldedOutputs={canCreateShieldedOutputs(capability)}
            />
          </p>
        )}
        <WalletBalance walletId={walletId} />
      </Panel>
    </div>
  );
}

export default ShieldedBalancesStage;
