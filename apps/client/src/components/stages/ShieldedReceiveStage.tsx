/**
 * Receive: one wallet address as a QR code for the phone to scan
 * (`AddressQr`). Its eye / shield toggle switches between the transparent
 * and the shielded (`K3…`) address at the same index; only one QR is ever
 * on screen, so the camera can't pick the wrong one. Shielded comes first,
 * as on the mobile wallet's own Receive screen.
 */

import { useState } from 'react';
import { StageHeader } from '../common/StageHeader';
import { AddressQr } from '../common/AddressQr';
import { Panel } from '../ui/Panel';
import { EmptyState } from '../ui/EmptyState';
import { WalletAddressPicker, type WalletAddressChoice } from '../shielded/WalletAddressPicker';
import { WalletBalance } from '../shielded/WalletBalance';
import { useAppSelector } from '../../store/hooks';

const QR_SIZE = 256;

export function ShieldedReceiveStage() {
  const [choice, setChoice] = useState<WalletAddressChoice>({ walletId: null, index: 0, kind: 'shielded' });
  const ready = useAppSelector((s) =>
    choice.walletId ? s.walletStore.wallets[choice.walletId]?.status === 'ready' : false
  );

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="shielded-receive" />

      <Panel title="Address" description="Scan it from the phone: Send → QR code icon.">
        <WalletAddressPicker value={choice} onChange={setChoice} size="md" showKind={false} />

        {choice.walletId && ready ? (
          <>
            <AddressQr
              walletId={choice.walletId}
              index={choice.index}
              size={QR_SIZE}
              defaultKind="shielded"
              showAddress
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setChoice({ ...choice, index: choice.index + 1 })}
              >
                Next index
              </button>
            </div>
            <p className="m-0 text-caption text-ink-muted">
              The sender picks the mode. A shielded send to the shielded address arrives as a shielded UTXO; a public
              (transparent) send to it arrives as a transparent one. A transparent address only takes transparent
              outputs.
            </p>
          </>
        ) : (
          <EmptyState>Choose a started wallet to show its address.</EmptyState>
        )}
      </Panel>

      <Panel title="Balance" description="Reloads when the wallet sees a transaction.">
        <WalletBalance walletId={choice.walletId} showUtxos={false} />
      </Panel>
    </div>
  );
}

export default ShieldedReceiveStage;
