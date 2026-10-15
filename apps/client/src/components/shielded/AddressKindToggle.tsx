/** Transparent or shielded address, with the same shield glyph as the output modes. */

import { MdShield } from 'react-icons/md';
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
        { value: 'transparent', label: 'Transparent' },
        { value: 'shielded', label: 'Shielded', icon: <MdShield aria-hidden="true" />, tone: 'shielded' },
      ]}
    />
  );
}
