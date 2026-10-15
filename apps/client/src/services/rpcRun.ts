/**
 * The React-free core of an RPC call, shared by useRpcMethod (the stages)
 * and the flow runner: time a handler call and make its response Redux-safe
 * (BigInt → string), plus the deep-link notification the handlers trigger.
 */

import type { UnknownAction } from '@reduxjs/toolkit';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';
import type { createRpcHandlers } from './rpcHandlers';
import { clearDeepLink, setDeepLink, showDeepLinkModal } from '../store/slices/deepLinkSlice';
import { removeToast } from '../store/slices/toastSlice';
import { extractErrorMessage } from '../utils/errorUtils';

export type RpcHandlers = ReturnType<typeof createRpcHandlers>;

export interface RpcRequest {
  method: string;
  params: unknown;
}

export interface RpcRunResult {
  request: RpcRequest;
  response: unknown;
  duration: number;
}

/** Thrown by `runRpc()`: the handler's error plus how long the call took. */
export class RpcRunError extends Error {
  readonly original: unknown;
  readonly duration: number;

  constructor(original: unknown, duration: number) {
    super(original instanceof Error ? original.message : String(original));
    this.original = original;
    this.duration = duration;
  }
}

export async function runRpc(
  handlers: RpcHandlers,
  call: (h: RpcHandlers) => Promise<{ request: RpcRequest; response: unknown }>
): Promise<RpcRunResult> {
  const start = Date.now();
  try {
    const { request, response } = await call(handlers);
    return {
      request,
      response: response ? JSON.parse(JSONBigInt.stringify(response)) : null,
      duration: Date.now() - start,
    };
  } catch (err) {
    throw new RpcRunError(err, Date.now() - start);
  }
}

/** The request a handler attaches to the error it throws, if any. */
export function sentRequestOf(error: unknown): RpcRequest | null {
  return (error as { requestParams?: RpcRequest } | null)?.requestParams ?? null;
}

type Dispatch = (action: UnknownAction) => unknown;

/** Shows the deep-link QR modal for a request, when deep links are enabled. */
export function showDeepLinkNotification(dispatch: Dispatch, enabled: boolean, url: string, title: string): void {
  if (!enabled) return;
  dispatch(setDeepLink({ url, title }));
  dispatch(showDeepLinkModal());
}

/** Dismisses the deep-link modal (and its toast) once the request settles. */
export function clearDeepLinkNotification(dispatch: Dispatch, toastId: string | null): void {
  if (toastId) dispatch(removeToast(toastId));
  dispatch(clearDeepLink());
}

/** Action creators of an RPC method slice (the request/response/error trio). */
export interface MethodSliceActions {
  setRequest: (payload: RpcRequest & { isDryRun: boolean }) => UnknownAction;
  setResponse: (payload: { response: unknown; duration: number }) => UnknownAction;
  setError: (payload: { error: string; duration: number }) => UnknownAction;
}

/** Stores a finished call in its method slice, as a stage does after its button. */
export function recordRpcResult(
  dispatch: Dispatch,
  actions: MethodSliceActions,
  isDryRun: boolean,
  { request, response, duration }: RpcRunResult
): void {
  dispatch(actions.setRequest({ method: request.method, params: request.params, isDryRun }));
  dispatch(actions.setResponse({ response, duration }));
}

/** Stores a failed call (`runRpc`'s error, or any error) in its method slice. */
export function recordRpcFailure(dispatch: Dispatch, actions: MethodSliceActions, isDryRun: boolean, error: unknown) {
  const original = error instanceof RpcRunError ? error.original : error;
  const sent = sentRequestOf(original);
  if (sent) dispatch(actions.setRequest({ method: sent.method, params: sent.params, isDryRun }));
  dispatch(
    actions.setError({
      error: extractErrorMessage(original),
      duration: error instanceof RpcRunError ? error.duration : 0,
    })
  );
}
