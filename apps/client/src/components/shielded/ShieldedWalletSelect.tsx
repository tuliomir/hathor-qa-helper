/**
 * Picks a seed wallet on a shielded network. Preselects the funding wallet
 * (then the test wallet) so the common case needs no click, and offers to
 * start the chosen wallet when it isn't running. Starting it also starts
 * its signer (`useSignerSync`).
 */

import { useEffect, useId, useState } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { startWallet } from '../../store/slices/walletStoreSlice';
import { useShieldedWallets } from '../../hooks/useSigner';

const ROLE_SUFFIX = { funding: ' (funding)', test: ' (test)' } as const;

export function ShieldedWalletSelect({
  value,
  onChange,
  label = 'Wallet',
  hint,
  size = 'md',
}: {
  value: string | null;
  onChange: (walletId: string | null) => void;
  label?: string;
  hint?: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  const wallets = useShieldedWallets();
  const id = useId();
  const dispatch = useAppDispatch();
  const [startError, setStartError] = useState<string | null>(null);
  const selected = wallets.find((w) => w.id === value);
  const starting = selected?.status === 'connecting' || selected?.status === 'syncing';

  const start = async () => {
    if (!selected) return;
    setStartError(null);
    try {
      await dispatch(startWallet(selected.id)).unwrap();
    } catch (err) {
      setStartError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    if (value && wallets.some((w) => w.id === value)) return;
    const next = wallets[0]?.id ?? null;
    // Only on a real change: callers often pass a fresh onChange each render.
    if (next !== value) onChange(next);
  }, [value, wallets, onChange]);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={size === 'sm' ? 'text-caption text-ink-muted' : 'text-body font-medium'}>
        {label}
      </label>
      <select
        id={id}
        className={`select w-full ${size === 'sm' ? 'select-sm' : ''}`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        {wallets.length === 0 && <option value="">No wallet on a shielded network</option>}
        {wallets.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
            {w.role ? ROLE_SUFFIX[w.role] : ''}
            {w.status === 'ready' ? '' : ' · not started'}
          </option>
        ))}
      </select>
      {hint && <span className="text-caption text-ink-muted">{hint}</span>}
      {selected && selected.status !== 'ready' && (
        <span className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
          {starting ? (
            <>
              <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              Starting {selected.name}…
            </>
          ) : (
            <>
              {selected.name} is not started.
              <button type="button" className="btn btn-secondary btn-xs" onClick={() => void start()}>
                Start {selected.name}
              </button>
            </>
          )}
        </span>
      )}
      {startError && <span className="text-caption text-error">{startError}</span>}
      {wallets.length === 0 && (
        <span className="text-caption text-ink-muted">
          Add a seed wallet on Shielded testnet in Wallet initialization.
        </span>
      )}
    </div>
  );
}
