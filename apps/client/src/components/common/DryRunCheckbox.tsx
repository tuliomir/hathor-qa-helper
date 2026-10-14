/**
 * Dry Run Checkbox Component
 *
 * A reusable checkbox that toggles the global dry run mode from Redux state.
 * Displays inline beside execute buttons in RPC cards.
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { toggleDryRunMode } from '../../store/slices/rpcSlice';

export const DryRunCheckbox: React.FC = () => {
  const dispatch = useDispatch();
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);

  const handleToggle = () => {
    dispatch(toggleDryRunMode());
  };

  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={isDryRun}
        onChange={handleToggle}
        className="checkbox checkbox-sm"
        aria-label="Toggle Dry Run mode"
      />
      <span className="text-sm text-muted whitespace-nowrap">Dry run</span>
    </label>
  );
};

export default DryRunCheckbox;
