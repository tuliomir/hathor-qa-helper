/**
 * useSnapMethod Hook
 *
 * Shared hook for snap method stages. Provides invokeSnap, dry-run state,
 * snap connection check, and Redux dispatch helpers for snap method results.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useInvokeSnap, useMetaMaskContext } from '@hathor/snap-utils';
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

/**
 * Detect responses that look like errors — MetaMask may resolve instead of
 * reject for some snap error types, returning the error as a response object.
 *
 * The snap stringifies ALL responses via JSONBigInt.stringify(), so error
 * responses may arrive as JSON strings, not objects.
 */
function isErrorLikeResponse(response: unknown): boolean {
  let obj: Record<string, unknown> | null = null;

  if (response && typeof response === 'object') {
    obj = response as Record<string, unknown>;
  } else if (typeof response === 'string') {
    try {
      const parsed = JSON.parse(response);
      if (parsed && typeof parsed === 'object') obj = parsed;
    } catch { /* not JSON */ }
  }

  if (!obj) return false;

  // JSON-RPC error shape: { error: { code, message } }
  if (obj.error && typeof obj.error === 'object') return true;
  // Snap error shape: { code: negative number, message }
  if (typeof obj.code === 'number' && obj.code < 0 && typeof obj.message === 'string') return true;
  return false;
}

export function useSnapMethod(methodKey: string) {
  const dispatch = useDispatch<AppDispatch>();
  const isSnapConnected = useSelector(selectIsSnapConnected);
  const snapOrigin = useSelector(selectSnapOrigin);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const methodData: SnapMethodData | undefined = useSelector(
    (state: RootState) => state.snapMethods.methods[methodKey],
  );

  const invokeSnap = useInvokeSnap(snapOrigin || undefined);
  const { error: metaMaskContextError } = useMetaMaskContext();

  // Track whether we're in the middle of an execute call
  const executingRef = useRef(false);

  // Fallback: if MetaMask context captures an error that didn't propagate
  // through the promise chain, dispatch it to Redux so the UI shows it.
  // This mirrors the web-wallet's approach of monitoring context error state.
  useEffect(() => {
    if (metaMaskContextError && executingRef.current) {
      const errorMessage = metaMaskContextError instanceof Error
        ? metaMaskContextError.message
        : String(metaMaskContextError);
      console.error(`[snap:${methodKey}] MetaMask context error (fallback):`, metaMaskContextError);
      dispatch(
        setSnapMethodError({ methodKey, error: errorMessage, duration: 0 }),
      );
    }
  }, [metaMaskContextError, dispatch, methodKey]);

  const handlers = useMemo(
    () => createSnapHandlers(invokeSnap, isDryRun),
    [invokeSnap, isDryRun],
  );

  const execute = useCallback(
    async (handlerFn: (handlers: ReturnType<typeof createSnapHandlers>) => Promise<{ request: { method: string; params?: Record<string, unknown> }; response: unknown }>) => {
      const startTime = Date.now();
      executingRef.current = true;

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

        // Guard: detect error-like responses that MetaMask may resolve
        // instead of reject (e.g., snap errors returned as response objects
        // or stringified error JSON from the snap)
        if (isErrorLikeResponse(response)) {
          // Parse string responses so extractErrorMessage can dig into them
          const parsed = typeof response === 'string'
            ? (() => { try { return JSON.parse(response); } catch { return response; } })()
            : response;
          const errorMessage = extractErrorMessage(parsed);
          console.error(`[snap:${methodKey}] Error-like response:`, parsed);
          dispatch(
            setSnapMethodError({ methodKey, error: errorMessage, duration }),
          );
          throw parsed; // Throw the parsed object so isSnapUserRejection can detect rejections
        }

        dispatch(
          setSnapMethodResponse({ methodKey, response, duration }),
        );

        return { request, response };
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = extractErrorMessage(error);
        console.error(`[snap:${methodKey}] Error:`, error);

        dispatch(
          setSnapMethodError({ methodKey, error: errorMessage, duration }),
        );

        throw error;
      } finally {
        executingRef.current = false;
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
