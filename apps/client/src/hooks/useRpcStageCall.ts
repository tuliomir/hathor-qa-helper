/**
 * useRpcStageCall — runs an RPC handler through useRpcMethod and stores
 * request, response or error in a method slice (the request/response/error
 * trio every RPC method slice exposes). Returns MethodCard's `methodData`
 * mapping too, so RPC stages stay a few lines long.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { UnknownAction } from '@reduxjs/toolkit';
import type { AppDispatch } from '../store';
import type { MethodData } from '../components/common/MethodCard';
import { RpcRunError, useRpcMethod, type RpcHandlers } from './useRpcMethod';
import { extractErrorMessage } from '../utils/errorUtils';

type RpcRequest = { method: string; params: unknown };

export interface MethodSliceActions {
  setRequest: (payload: RpcRequest & { isDryRun: boolean }) => UnknownAction;
  setResponse: (payload: { response: unknown; duration: number }) => UnknownAction;
  setError: (payload: { error: string; duration: number }) => UnknownAction;
}

/** The persisted shape shared by the RPC method slices. */
export interface MethodSliceState {
  request: RpcRequest | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
}

export function toMethodData(state: MethodSliceState): MethodData {
  return {
    request: state.request,
    response: state.rawResponse,
    error: state.error,
    timestamp: state.timestamp,
    duration: state.duration,
    isDryRun: state.isDryRun,
  };
}

export function useRpcStageCall(actions: MethodSliceActions) {
  const dispatch = useDispatch<AppDispatch>();
  const rpc = useRpcMethod();
  const { isDryRun, run } = rpc;

  /**
   * `dryRunRequest` is what the handler would send; it is reported when
   * dry run is on and no session exists. Rethrows for MethodCard.
   */
  const execute = useCallback(
    async (
      call: (h: RpcHandlers) => Promise<{ request: RpcRequest; response: unknown }>,
      dryRunRequest?: RpcRequest
    ) => {
      try {
        const { request, response, duration } = await run(call, dryRunRequest);
        dispatch(actions.setRequest({ method: request.method, params: request.params, isDryRun }));
        dispatch(actions.setResponse({ response, duration }));
        return response;
      } catch (error) {
        const original = error instanceof RpcRunError ? error.original : error;
        const sent = (original as { requestParams?: RpcRequest } | null)?.requestParams;
        if (sent) dispatch(actions.setRequest({ method: sent.method, params: sent.params, isDryRun }));
        dispatch(
          actions.setError({
            error: extractErrorMessage(original),
            duration: error instanceof RpcRunError ? error.duration : 0,
          })
        );
        throw original;
      }
    },
    [actions, dispatch, isDryRun, run]
  );

  return { ...rpc, execute };
}
