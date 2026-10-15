/**
 * Shows a flow run's values in a stage form: calls `apply` with the values
 * the runner filled in for `stageId`, on mount and whenever it fills them
 * again. Call it after the stage's own restore effects so it wins.
 */

import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { StageId } from '../types/stage';

export function useFlowPrefill(stageId: StageId, apply: (values: Record<string, unknown>) => void): void {
  const prefill = useSelector((state: RootState) => state.flowRun.prefill[stageId]);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const nonce = prefill?.nonce;

  useEffect(() => {
    if (prefill) applyRef.current(prefill.values);
    // Only a new fill (nonce) re-applies; the values object follows it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
}

/** The value at `key` if it is a string. */
export const str = (values: Record<string, unknown>, key: string): string | undefined =>
  typeof values[key] === 'string' ? (values[key] as string) : undefined;

/** The value at `key` if it is a number. */
export const num = (values: Record<string, unknown>, key: string): number | undefined =>
  typeof values[key] === 'number' ? (values[key] as number) : undefined;

/** The value at `key` if it is a boolean. */
export const bool = (values: Record<string, unknown>, key: string): boolean | undefined =>
  typeof values[key] === 'boolean' ? (values[key] as boolean) : undefined;
