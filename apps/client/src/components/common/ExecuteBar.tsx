/**
 * ExecuteBar — bottom row of a Compose panel: dry-run toggle (the global
 * `rpc.isDryRun`), secondary actions and the primary button.
 *
 * - The label is the action ("Send transaction"), not "Execute X".
 * - A disabled button always shows its reason next to it. Dry run stays
 *   available when only preconditions block the real send.
 * - On mainnet (not dry run) the button turns into a red outline ("Send on
 *   mainnet") and needs a second click within 4s. No modal. Without an
 *   explicit `isMainnet`, the active network decides.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { setDryRunMode } from '../../store/slices/rpcSlice';
import { selectActiveNetworkKind } from '../../store/slices/networkSlice';
import {
  ARM_TIMEOUT_MS,
  executeButtonLabel,
  executeClick,
  needsArming,
  type ArmingState,
} from '../../utils/executeArming';

export interface ExecuteBarProps {
  label: string;
  onExecute: () => void | Promise<unknown>;
  /** Defaults to whether the active network is mainnet. */
  isMainnet?: boolean;
  /** Show the dry-run toggle (bound to the global dry-run mode). */
  showDryRun?: boolean;
  running?: boolean;
  runningLabel?: string;
  /** Why the real action can't run (first unmet precondition). */
  disabledReason?: string | null;
  /** Override the mainnet label ("Create token on mainnet"). */
  mainnetLabel?: string;
  secondary?: React.ReactNode;
}

export function ExecuteBar({
  label,
  onExecute,
  isMainnet: isMainnetProp,
  showDryRun = true,
  running = false,
  runningLabel,
  disabledReason = null,
  mainnetLabel,
  secondary,
}: ExecuteBarProps) {
  const dispatch = useDispatch();
  const globalDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const activeIsMainnet = useSelector(selectActiveNetworkKind) === 'main';
  const isMainnet = isMainnetProp ?? activeIsMainnet;
  const isDryRun = showDryRun && globalDryRun;
  const ctx = { isMainnet, isDryRun };
  const reasonId = useId();
  const [arm, setArm] = useState<ArmingState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Disarm on timeout, and whenever the context changes under an armed button.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (arm === 'armed') timer.current = setTimeout(() => setArm('idle'), ARM_TIMEOUT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [arm]);
  useEffect(() => setArm('idle'), [isMainnet, isDryRun]);

  const blockedReason = isDryRun ? null : disabledReason;
  const disabled = running || blockedReason !== null;
  const mainnet = needsArming(ctx);

  const handleClick = () => {
    const next = executeClick(arm, ctx);
    setArm(next.state);
    if (next.fire) void onExecute();
  };

  const text = running ? (runningLabel ?? `${label}…`) : executeButtonLabel(label, ctx, arm, mainnetLabel);

  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      {showDryRun && (
        <label className="flex cursor-pointer select-none items-center gap-2 text-body">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={globalDryRun}
            onChange={(e) => dispatch(setDryRunMode(e.target.checked))}
          />
          Dry run
        </label>
      )}
      <span className="ml-auto" />
      {blockedReason && (
        <span className="text-caption text-ink-muted" id={reasonId}>
          {blockedReason}
        </span>
      )}
      {secondary}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-describedby={blockedReason ? reasonId : undefined}
        className={`btn ${mainnet ? 'border-2 border-error bg-base-100 text-error hover:bg-tint-error' : 'btn-primary'}`}
      >
        {running && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
        {text}
      </button>
    </div>
  );
}

export default ExecuteBar;
