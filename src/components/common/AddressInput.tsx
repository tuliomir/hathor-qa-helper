/**
 * AddressInput — Centralized address input with quick-fill buttons.
 *
 * Replaces ad-hoc address inputs + button rows across all stages.
 * Each button source is opt-in via props so stages only show relevant options.
 */

import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useWalletStore } from '../../hooks/useWalletStore';
import { selectSnapAddress } from '../../store/slices/snapSlice';
import { WELL_KNOWN_ADDRESSES } from '../../constants/addresses';
import type { RootState } from '../../store';

export type AddressSource = 'snap' | 'test' | 'fund' | 'multisig';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Which quick-fill buttons to show */
  sources?: AddressSource[];
  /** Pre-populate on mount (only if value is empty) */
  suggestedValue?: string;
  placeholder?: string;
  label?: string;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  sources = [],
  suggestedValue,
  placeholder = 'Address (base58)',
  label,
}) => {
  const snapAddress = useSelector(selectSnapAddress);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const fundingWalletId = useSelector((state: RootState) => state.walletSelection.fundingWalletId);
  const { getWallet } = useWalletStore();

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

  const fillFromWallet = async (wallet: ReturnType<typeof getWallet>) => {
    if (!wallet?.instance) return;
    try {
      onChange(await wallet.instance.getAddressAtIndex(0));
    } catch {
      /* ignore */
    }
  };

  const buttons: { key: AddressSource; label: string; disabled: boolean; onClick: () => void }[] = [];

  for (const src of sources) {
    switch (src) {
      case 'snap':
        buttons.push({
          key: 'snap',
          label: 'Snap Addr0',
          disabled: !snapAddress,
          onClick: () => { if (snapAddress) onChange(snapAddress); },
        });
        break;
      case 'test':
        buttons.push({
          key: 'test',
          label: 'Test Addr0',
          disabled: !testWallet?.instance,
          onClick: () => fillFromWallet(testWallet),
        });
        break;
      case 'fund':
        buttons.push({
          key: 'fund',
          label: 'Fund Addr0',
          disabled: !fundingWallet?.instance,
          onClick: () => fillFromWallet(fundingWallet),
        });
        break;
      case 'multisig':
        buttons.push({
          key: 'multisig',
          label: 'Multisig Addr0',
          disabled: false,
          onClick: () => onChange(WELL_KNOWN_ADDRESSES.MULTISIG_ADDR0),
        });
        break;
    }
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1.5">{label}</label>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
      />
      {buttons.length > 0 && (
        <div className="flex gap-2 mt-1.5">
          {buttons.map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={btn.onClick}
              disabled={btn.disabled}
              className="btn-secondary py-1 px-2.5 text-xs whitespace-nowrap"
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
