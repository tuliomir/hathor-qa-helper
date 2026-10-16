/**
 * AddressQr — an address as a `hathor:<address>` QR code with the URI and a
 * copy button. Mobile wallets scan only addresses and configuration
 * strings; payment requests with amounts no longer work.
 *
 * Give it a fixed `address`, or a `walletId` and `index` to derive one.
 * When that wallet is started on a network with shielded outputs, an
 * eye / shield toggle on top switches to the shielded (`K3…`) address at
 * the same index. Otherwise it renders the transparent address alone.
 */

import { useState } from 'react';
import QRCode from 'react-qr-code';
import CopyButton from './CopyButton';
import { Identifier } from './Identifier';
import { AddressKindToggle } from '../shielded/AddressKindToggle';
import { useAppSelector } from '../../store/hooks';
import { useWalletAddress, type AddressKind } from '../../hooks/useWalletAddress';
import { NETWORK_CONFIG } from '../../constants/network';
import { isAddressOnly } from '../../utils/addressOnlyWallet';
import { toAddressUri } from '../../utils/addressUri';

type AddressQrProps = {
  /** QR size in px. */
  size?: number;
  /** Show the full address above the QR code. */
  showAddress?: boolean;
  /** Kind shown first when the toggle is available. */
  defaultKind?: AddressKind;
} & ({ address: string; walletId?: never; index?: never } | { walletId: string; index: number; address?: never });

export function AddressQr(props: AddressQrProps) {
  const { size = 176, showAddress = false, defaultKind = 'transparent' } = props;
  const walletId = props.walletId ?? null;
  const index = props.index ?? 0;
  const wallet = useAppSelector((s) => (walletId ? s.walletStore.wallets[walletId] : undefined));
  const [kind, setKind] = useState<AddressKind>(defaultKind);

  const canShield =
    !!wallet &&
    wallet.status === 'ready' &&
    !isAddressOnly(wallet.metadata) &&
    !!NETWORK_CONFIG[wallet.metadata.network]?.supportsShielded;
  const transparent = useWalletAddress(props.address === undefined ? walletId : null, index, 'transparent');
  const shielded = useWalletAddress(canShield ? walletId : null, index, 'shielded');
  // The toggle appears only once the shielded address actually derives.
  const toggle = canShield && shielded.address !== null;
  const active = toggle && kind === 'shielded' ? 'shielded' : 'transparent';

  const address = props.address ?? (active === 'shielded' ? shielded.address : transparent.address);
  if (!address) return null;
  const uri = toAddressUri(address);

  return (
    <div className="flex w-full flex-col items-start gap-3">
      {toggle && <AddressKindToggle value={kind} onChange={setKind} />}
      {showAddress && <Identifier value={address} kind="address" head={address.length} tail={0} />}
      {/* The URI sits beside the QR code when there's room for it, below it otherwise (e.g. in a modal). */}
      <div className="flex w-full flex-wrap items-start gap-3">
        <div className="flex-none rounded-field border border-base-300 bg-base-100 p-3" data-testid="address-qr">
          <QRCode value={uri} size={size} />
        </div>
        <div className="flex min-w-0 grow basis-48 flex-col gap-1">
          <span className="text-caption text-ink-muted">
            {active === 'shielded' ? 'Shielded address URI' : 'Address URI'}
          </span>
          <span className="flex min-w-0 items-start gap-1">
            <code className="min-w-0 rounded-field bg-base-200 px-2 py-1 font-mono text-data-sm [overflow-wrap:anywhere]">
              {uri}
            </code>
            <CopyButton text={uri} label="Copy address URI" />
          </span>
        </div>
      </div>
    </div>
  );
}
