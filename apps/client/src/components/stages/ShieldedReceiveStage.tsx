/**
 * Receive: one wallet address as a QR code for the phone to scan. The shield
 * toggle switches between the transparent and the shielded (`K3…`) address
 * at the same index; only one QR is ever on screen, so the camera can't
 * pick the wrong one. The QR holds `hathor:<address>`, the mobile wallet's
 * own receive format (`knowledge/shielded-semantics.md` §5).
 */

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { StageHeader } from '../common/StageHeader';
import CopyButton from '../common/CopyButton';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { EmptyState } from '../ui/EmptyState';
import { WalletAddressPicker, type WalletAddressChoice } from '../shielded/WalletAddressPicker';
import { WalletBalance } from '../shielded/WalletBalance';
import { useWalletAddress } from '../../hooks/useWalletAddress';
import { toAddressUri } from '../../utils/addressUri';
import { groupChars } from '../../utils/truncate';

const QR_SIZE = 256;

export function ShieldedReceiveStage() {
  const [choice, setChoice] = useState<WalletAddressChoice>({ walletId: null, index: 0, kind: 'shielded' });
  const { address, error, loading } = useWalletAddress(choice.walletId, choice.index, choice.kind);
  const shielded = choice.kind === 'shielded';

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="shielded-receive" />

      <Panel title="Address" description="Scan it from the phone: Send → QR code icon.">
        <WalletAddressPicker value={choice} onChange={setChoice} size="md" />

        {loading && <span className="skeleton block h-64 w-64" />}
        {error && (
          <Callout tone="error" title="No address">
            {error}
          </Callout>
        )}
        {!address && !loading && !error && <EmptyState>Choose a started wallet to show its address.</EmptyState>}

        {address && (
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <div className="flex-none rounded-field border border-base-300 bg-white p-4" data-testid="receive-qr">
              <QRCode value={toAddressUri(address)} size={QR_SIZE} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-caption text-ink-muted">
                {shielded ? 'Shielded address' : 'Transparent address'} at index {choice.index}
              </span>
              <span className="flex min-w-0 items-start gap-1">
                <code
                  className="min-w-0 rounded-field bg-base-200 px-2 py-1 font-mono text-data-sm [overflow-wrap:anywhere] [word-spacing:2px]"
                  data-testid="receive-address"
                >
                  {shielded ? groupChars(address, 4) : address}
                </code>
                <CopyButton text={address} label="Copy address" />
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setChoice({ ...choice, index: choice.index + 1 })}
                >
                  Next index
                </button>
              </div>
              {shielded ? (
                <p className="m-0 text-caption text-ink-muted">
                  The sender picks the mode. A shielded send arrives as a shielded UTXO; a public (transparent) send to
                  this address arrives as a transparent one, on its spend key&apos;s address.
                </p>
              ) : (
                <p className="m-0 text-caption text-ink-muted">A transparent address only takes transparent outputs.</p>
              )}
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Balance" description="Reloads when the wallet sees a transaction.">
        <WalletBalance walletId={choice.walletId} showUtxos={false} />
      </Panel>
    </div>
  );
}

export default ShieldedReceiveStage;
