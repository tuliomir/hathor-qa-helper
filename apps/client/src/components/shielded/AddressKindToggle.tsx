/** Transparent (eye: visible on chain) or shielded address, with the same shield glyph as the output modes. */

import { MdShield, MdVisibility } from 'react-icons/md';
import { SegmentedControl } from '../ui/SegmentedControl';
import type { AddressKind } from '../../hooks/useWalletAddress';

export function AddressKindToggle({
  value,
  onChange,
  size = 'sm',
}: {
  value: AddressKind;
  onChange: (kind: AddressKind) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <SegmentedControl<AddressKind>
      aria-label="Address kind"
      size={size}
      value={value}
      onChange={onChange}
      options={[
        { value: 'transparent', label: 'Transparent', icon: <MdVisibility aria-hidden="true" /> },
        { value: 'shielded', label: 'Shielded', icon: <MdShield aria-hidden="true" />, tone: 'shielded' },
      ]}
    />
  );
}
