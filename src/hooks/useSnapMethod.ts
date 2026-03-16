/**
 * useSnapMethod Hook
 *
 * Shared hook for snap method stages. Provides invokeSnap, dry-run state,
 * snap connection check, and Redux dispatch helpers for snap method results.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useInvokeSnap } from '@hathor/snap-utils';
import type { AppDispatch, RootState } from '../store';
import { selectIsSnapConnected, selectSnapOrigin } from '../store/slices/snapSlice';
import {
  setSnapMethodRequest,
  setSnapMethodResponse,
  setSnapMethodError,
} from '../store/slices/snapMethodsSlice';
import type { SnapMethodData } from '../store/slices/snapMethodsSlice';
import { createSnapHandlers } from '../services/snapHandlers';
import { extractErrorMessage } from '../utils/errorUtils';

export function useSnapMethod(methodKey: string) {
  const dispatch = useDispatch<AppDispatch>();
  const isSnapConnected = useSelector(selectIsSnapConnected);
  const snapOrigin = useSelector(selectSnapOrigin);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const methodData: SnapMethodData | undefined = useSelector(
    (state: RootState) => state.snapMethods.methods[methodKey],
  );

  const invokeSnap = useInvokeSnap(snapOrigin || undefined);

  const handlers = useMemo(
    () => createSnapHandlers(invokeSnap, isDryRun),
    [invokeSnap, isDryRun],
  );

  const execute = useCallback(
    async (handlerFn: (handlers: ReturnType<typeof createSnapHandlers>) => Promise<{ request: { method: string; params?: Record<string, unknown> }; response: unknown }>) => {
      const startTime = Date.now();

      dispatch(
        setSnapMethodRequest({
          methodKey,
          method: '',
          params: null,
          isDryRun,
        }),
      );

      try {
        const { request, response } = await handlerFn(handlers);
        const duration = Date.now() - startTime;

        dispatch(
          setSnapMethodRequest({
            methodKey,
            method: request.method,
            params: request.params ?? null,
            isDryRun,
          }),
        );

        dispatch(
          setSnapMethodResponse({ methodKey, response, duration }),
        );

        return { request, response };
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = extractErrorMessage(error);

        dispatch(
          setSnapMethodError({ methodKey, error: errorMessage, duration }),
        );

        throw error;
      }
    },
    [dispatch, handlers, isDryRun, methodKey],
  );

  return {
    isSnapConnected,
    snapOrigin,
    isDryRun,
    methodData: methodData ?? null,
    execute,
    handlers,
  };
}
