/**
 * TimelockPicker Component
 *
 * Shared datetime-local input for selecting a timelock timestamp.
 * Used across RPC send transaction, Snap send transaction, and fund injection UIs.
 *
 * For utility functions (defaultTimelockValue, timelockToUnix), see utils/timelockUtils.ts.
 */

import React, { useId } from 'react';
import { defaultTimelockValue } from '../../utils/timelockUtils';
import { Field } from '../ui/Field';

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
  label = 'Timelock',
  hint = 'Optional. The output cannot be spent before this time.',
  className = '',
}) => {
  const id = useId();
  return (
    <Field label={label} hint={hint} className={className} htmlFor={id} wireControl={false}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input min-w-0 flex-1"
        />
        <button type="button" onClick={() => onChange(defaultTimelockValue(1))} className="btn btn-secondary btn-sm">
          +1 min
        </button>
        <button type="button" onClick={() => onChange(defaultTimelockValue(5))} className="btn btn-secondary btn-sm">
          +5 min
        </button>
      </div>
    </Field>
  );
};

export default TimelockPicker;
