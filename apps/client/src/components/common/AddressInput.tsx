/**
 * AddressInput — one address field with quick-fill sources, kind detection
 * (transparent / shielded, via version byte) and specific errors.
 *
 * Validation is advisory: the value always reaches `onChange`, so QA can
 * still send a wrong-kind address on purpose. Each source is opt-in via
 * `sources`; `test` and `fund` also offer the shielded addr0 when the
 * wallet's network supports shielded outputs. `customSources` adds
 * stage-specific ones (e.g. QA server sessions).
 *
 * Validation uses `network`, defaulting to the active network; pass `null`
 * to accept any network.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { MdArrowDropDown, MdShield } from 'react-icons/md';
import { useWalletStore } from '../../hooks/useWalletStore';
import { selectSnapAddress } from '../../store/slices/snapSlice';
import { WELL_KNOWN_ADDRESSES } from '../../constants/addresses';
import { selectActiveNetwork } from '../../store/slices/networkSlice';
import type { RootState } from '../../store';
import { NETWORK_CONFIG, type NetworkKey } from '../../constants/network';
import { addressAcceptError, detectAddressKind, type AddressAccept } from '../../utils/addressKind';
import { groupChars } from '../../utils/truncate';

export type AddressSource = 'snap' | 'test' | 'fund' | 'multisig' | 'test-shielded' | 'fund-shielded' | 'snap-shielded';

/** A stage-specific quick-fill entry. */
export interface CustomAddressSource {
  key: string;
  label: string;
  /** The address, or a loader for addresses that need deriving. */
  value: string | (() => Promise<string>);
  disabledReason?: string | null;
}

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Which quick-fill buttons to show */
  sources?: AddressSource[];
  customSources?: CustomAddressSource[];
  /** Pre-populate on mount (only if value is empty) */
  suggestedValue?: string;
  placeholder?: string;
  label?: string;
  /** Which kinds the field expects. Default 'transparent'. */
  accept?: AddressAccept;
  /** Validate against this network. Defaults to the active network; `null` accepts any. */
  network?: NetworkKey | null;
  id?: string;
}

interface FillSource {
  key: string;
  label: string;
  disabledReason: string | null;
  onClick: () => void;
}

const MAX_INLINE_SOURCES = 3;

export const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  sources = [],
  customSources = [],
  suggestedValue,
  placeholder = 'Address (base58)',
  label,
  accept = 'transparent',
  network: networkProp,
  id,
}) => {
  const activeNetwork = useSelector(selectActiveNetwork);
  const network = networkProp === undefined ? activeNetwork : (networkProp ?? undefined);
  const snapAddress = useSelector(selectSnapAddress);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const fundingWalletId = useSelector((state: RootState) => state.walletSelection.fundingWalletId);
  const { getWallet } = useWalletStore();
  const autoId = useId();
  const inputId = id ?? autoId;
  const menuRef = useRef<HTMLDetailsElement>(null);

  const testWallet = testWalletId ? getWallet(testWalletId) : null;
  const fundingWallet = fundingWalletId ? getWallet(fundingWalletId) : null;

  // Pre-populate once on mount
  const didSuggest = useRef(false);
  useEffect(() => {
    if (suggestedValue && !value && !didSuggest.current) {
      didSuggest.current = true;
      onChange(suggestedValue);
    }
  }, [suggestedValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const [fillError, setFillError] = useState<string | null>(null);

  const fillFromWallet = async (wallet: ReturnType<typeof getWallet> | null) => {
    if (!wallet?.instance) return;
    setFillError(null);
    try {
      onChange(await wallet.instance.getAddressAtIndex(0));
    } catch {
      /* ignore */
    }
  };

  /** Shielded addresses throw without a provider, while the scan key is locked, and for multisig. */
  const fillShieldedFromWallet = async (wallet: ReturnType<typeof getWallet> | null) => {
    if (!wallet?.instance) return;
    setFillError(null);
    try {
      onChange(await wallet.instance.getAddressAtIndex(0, { legacy: false }));
    } catch (err) {
      setFillError(`Shielded address unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const supportsShielded = (wallet: ReturnType<typeof getWallet> | null) =>
    !!wallet && NETWORK_CONFIG[wallet.metadata.network]?.supportsShielded;

  const walletReason = (wallet: ReturnType<typeof getWallet> | null, role: string, needReady: boolean) => {
    if (!wallet) return `No ${role} wallet selected`;
    if (needReady ? wallet.status !== 'ready' : !wallet.instance)
      return `${role[0].toUpperCase()}${role.slice(1)} wallet not started`;
    return null;
  };

  const fills: FillSource[] = [];
  const add = (src: FillSource) => {
    if (!fills.some((f) => f.key === src.key)) fills.push(src);
  };
  const addShielded = (role: 'test' | 'fund') => {
    const wallet = role === 'test' ? testWallet : fundingWallet;
    if (!supportsShielded(wallet)) return;
    add({
      key: `${role}-shielded`,
      label: role === 'test' ? 'Test shielded addr 0' : 'Funding shielded addr 0',
      disabledReason: walletReason(wallet, role === 'test' ? 'test' : 'funding', true),
      onClick: () => fillShieldedFromWallet(wallet),
    });
  };

  for (const src of sources) {
    switch (src) {
      case 'snap':
        add({
          key: 'snap',
          label: 'Snap addr 0',
          disabledReason: snapAddress ? null : 'Snap not connected',
          onClick: () => {
            if (snapAddress) onChange(snapAddress);
          },
        });
        break;
      case 'test':
        add({
          key: 'test',
          label: 'Test addr 0',
          disabledReason: walletReason(testWallet, 'test', false),
          onClick: () => fillFromWallet(testWallet),
        });
        addShielded('test');
        break;
      case 'fund':
        add({
          key: 'fund',
          label: 'Funding addr 0',
          disabledReason: walletReason(fundingWallet, 'funding', false),
          onClick: () => fillFromWallet(fundingWallet),
        });
        addShielded('fund');
        break;
      case 'test-shielded':
        addShielded('test');
        break;
      case 'fund-shielded':
        addShielded('fund');
        break;
      case 'snap-shielded':
        // The snap has no shielded address derivation yet; nothing to offer.
        break;
      case 'multisig':
        add({
          key: 'multisig',
          label: 'Multisig addr 0',
          disabledReason: null,
          onClick: () => onChange(WELL_KNOWN_ADDRESSES.MULTISIG_ADDR0),
        });
        break;
    }
  }

  for (const src of customSources) {
    add({
      key: `custom-${src.key}`,
      label: src.label,
      disabledReason: src.disabledReason ?? null,
      onClick: async () => {
        setFillError(null);
        if (typeof src.value === 'string') return onChange(src.value);
        try {
          onChange(await src.value());
        } catch (err) {
          setFillError(`${src.label} unavailable: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    });
  }

  const detection = useMemo(() => detectAddressKind(value, network), [value, network]);
  const error = addressAcceptError(detection, accept, network) ?? fillError;
  const hintId = `${inputId}-hint`;

  const runFill = (f: FillSource) => {
    menuRef.current?.removeAttribute('open');
    f.onClick();
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-body font-medium">
          {label}
        </label>
      )}
      <label className={`input w-full ${error ? 'input-error' : ''}`}>
        {detection.kind === 'shielded' && <MdShield className="h-3.5 w-3.5 flex-none text-accent" aria-hidden="true" />}
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={hintId}
          className="min-w-0 grow font-mono text-data"
        />
        {detection.kind === 'transparent' && (
          <span className="flex-none rounded-selector bg-base-200 px-1.5 text-caption font-semibold text-ink-muted">
            Transparent
          </span>
        )}
        {detection.kind === 'shielded' && (
          <span className="flex-none rounded-selector bg-tint-shielded px-1.5 text-caption font-semibold text-accent">
            Shielded
          </span>
        )}
      </label>

      <div id={hintId} className="flex flex-col gap-1">
        {error && <span className="text-caption text-error">{error}</span>}
        {!error && detection.kind === 'shielded' && (
          <>
            <span
              className="rounded-field border border-dashed border-base-300 bg-base-100 px-2 py-1.5 font-mono text-data-sm leading-[18px] [word-spacing:2px]"
              aria-label="Full address, grouped"
            >
              <b className="text-accent">{value.trim().slice(0, 2)}</b>
              {groupChars(value.trim().slice(2), 4)}
            </span>
            <span className="text-caption text-ink-muted">
              {value.trim().length} characters, valid shielded address for {detection.network}
            </span>
          </>
        )}
      </div>

      {fills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-caption text-ink-muted">Fill from</span>
          {fills.length <= MAX_INLINE_SOURCES ? (
            fills.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={f.onClick}
                disabled={f.disabledReason !== null}
                title={f.disabledReason ?? undefined}
                className="btn btn-secondary btn-xs whitespace-nowrap"
              >
                {f.label}
              </button>
            ))
          ) : (
            <details ref={menuRef} className="dropdown">
              <summary className="btn btn-secondary btn-xs list-none">
                Choose address
                <MdArrowDropDown aria-hidden="true" />
              </summary>
              <ul className="menu dropdown-content z-20 mt-1 w-64 rounded-box border border-base-300 bg-base-100 p-1 shadow-float">
                {fills.map((f) => (
                  <li key={f.key} className={f.disabledReason ? 'menu-disabled' : ''}>
                    <button type="button" disabled={f.disabledReason !== null} onClick={() => runFill(f)}>
                      <span className="flex flex-col items-start">
                        <span>{f.label}</span>
                        {f.disabledReason && <span className="text-caption text-ink-muted">{f.disabledReason}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
