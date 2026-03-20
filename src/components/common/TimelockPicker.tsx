/**
 * TimelockPicker Component
 *
 * Shared datetime-local input for selecting a timelock timestamp.
 * Used across RPC send transaction, Snap send transaction, and fund injection UIs.
 *
 * For utility functions (defaultTimelockValue, timelockToUnix), see utils/timelockUtils.ts.
 */

import React from 'react';

interface TimelockPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  className?: string;
}

const TimelockPicker: React.FC<TimelockPickerProps> = ({
  value,
  onChange,
  label = 'Timelock (optional)',
  hint = 'Output will be unspendable until this time',
  className = '',
}) => {
  return (
    <div className={className}>
      <label className="block mb-1 text-xs font-medium text-muted">{label}</label>
      <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className="input w-full" />
      <p className="text-xs text-muted mt-1">{hint}</p>
    </div>
  );
};

export default TimelockPicker;
