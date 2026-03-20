/**
 * TimelockPicker Component
 *
 * Shared datetime-local input for selecting a timelock timestamp.
 * Used across RPC send transaction, Snap send transaction, and fund injection UIs.
 *
 * For utility functions (defaultTimelockValue, timelockToUnix), see utils/timelockUtils.ts.
 */

import React from 'react';
import { defaultTimelockValue } from '../../utils/timelockUtils';

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
      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button"
          onClick={() => onChange(defaultTimelockValue(1))}
          className="btn-secondary py-1 px-2.5 text-xs whitespace-nowrap"
        >
          +1 min
        </button>
        <button
          type="button"
          onClick={() => onChange(defaultTimelockValue(5))}
          className="btn-secondary py-1 px-2.5 text-xs whitespace-nowrap"
        >
          +5 min
        </button>
        <span className="text-xs text-muted">{hint}</span>
      </div>
    </div>
  );
};

export default TimelockPicker;
