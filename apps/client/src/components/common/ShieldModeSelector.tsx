/**
 * ShieldModeSelector — per-output privacy: Transparent, Amount shielded,
 * Fully shielded, with a subline saying what is hidden. The shielded
 * options can be disabled with a reason (wrong network, capability too low,
 * no prover in this context).
 */

import { MdOutlineShield, MdShield } from 'react-icons/md';
import { SegmentedControl } from '../ui/SegmentedControl';
import { PRIVACY_SUBLINE, type OutputPrivacy } from '../../utils/outputRows';

export interface ShieldModeSelectorProps {
  value: OutputPrivacy;
  onChange: (value: OutputPrivacy) => void;
  /** Disables the shielded modes and says why. */
  disabledReason?: string | null;
  size?: 'sm' | 'md';
  /** Render the subline under the control (default) or leave it to the caller. */
  showSubline?: boolean;
}

export function ShieldModeSelector({
  value,
  onChange,
  disabledReason = null,
  size = 'sm',
  showSubline = true,
}: ShieldModeSelectorProps) {
  const unavailable = disabledReason !== null && disabledReason !== '';
  return (
    <div className="flex flex-col items-start gap-1">
      <SegmentedControl<OutputPrivacy>
        aria-label="Output privacy"
        size={size}
        value={value}
        onChange={onChange}
        options={[
          { value: 'TRANSPARENT', label: 'Transparent' },
          {
            value: 'AMOUNT_SHIELDED',
            label: 'Amount shielded',
            icon: <MdOutlineShield aria-hidden="true" />,
            tone: 'shielded',
            disabled: unavailable,
            reason: disabledReason ?? undefined,
          },
          {
            value: 'FULLY_SHIELDED',
            label: 'Fully shielded',
            icon: <MdShield aria-hidden="true" />,
            tone: 'shielded',
            disabled: unavailable,
            reason: disabledReason ?? undefined,
          },
        ]}
      />
      {showSubline && <span className="text-caption text-ink-muted">{PRIVACY_SUBLINE[value]}</span>}
      {unavailable && <span className="text-caption text-ink-muted">{disabledReason}</span>}
    </div>
  );
}

export default ShieldModeSelector;
