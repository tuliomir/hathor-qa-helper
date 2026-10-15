/**
 * Wallet → index → transparent or shielded: picks one address of a wallet
 * on a shielded network. Controlled; `useWalletAddress` resolves it.
 */

import { useId } from 'react';
import type { AddressKind } from '../../hooks/useWalletAddress';
import { AddressKindToggle } from './AddressKindToggle';
import { ShieldedWalletSelect } from './ShieldedWalletSelect';

export interface WalletAddressChoice {
  walletId: string | null;
  index: number;
  kind: AddressKind;
}

export function WalletAddressPicker({
  value,
  onChange,
  walletLabel = 'Wallet',
  size = 'sm',
  showKind = true,
}: {
  value: WalletAddressChoice;
  onChange: (value: WalletAddressChoice) => void;
  walletLabel?: string;
  size?: 'sm' | 'md';
  /** Hide the kind toggle when the caller shows its own (e.g. AddressQr). */
  showKind?: boolean;
}) {
  const indexId = useId();
  const input = size === 'sm' ? 'input-sm' : '';

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-48 flex-1">
        <ShieldedWalletSelect
          label={walletLabel}
          size={size}
          value={value.walletId}
          onChange={(walletId) => onChange({ ...value, walletId })}
        />
      </div>
      <div className="flex w-24 flex-col gap-1">
        <label htmlFor={indexId} className="text-caption text-ink-muted">
          Index
        </label>
        <input
          id={indexId}
          type="number"
          min={0}
          step={1}
          className={`input w-full font-mono ${input}`}
          value={value.index}
          onChange={(e) => onChange({ ...value, index: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
        />
      </div>
      {showKind && (
        <AddressKindToggle value={value.kind} onChange={(kind) => onChange({ ...value, kind })} size={size} />
      )}
    </div>
  );
}
