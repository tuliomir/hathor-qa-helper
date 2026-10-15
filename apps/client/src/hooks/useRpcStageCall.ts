/**
 * useRpcStageCall — runs an RPC handler through useRpcMethod and stores
 * request, response or error in a method slice (the request/response/error
 * trio every RPC method slice exposes). Returns MethodCard's `methodData`
 * mapping too, so RPC stages stay a few lines long.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store';
import type { MethodData } from '../components/common/MethodCard';
import { RpcRunError, useRpcMethod, type RpcHandlers, type RpcMethodOptions } from './useRpcMethod';
import { recordRpcFailure, recordRpcResult, type MethodSliceActions, type RpcRequest } from '../services/rpcRun';

export type { MethodSliceActions } from '../services/rpcRun';

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

export function useRpcStageCall(actions: MethodSliceActions, options?: RpcMethodOptions) {
  const dispatch = useDispatch<AppDispatch>();
  const rpc = useRpcMethod(options);
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
        const result = await run(call, dryRunRequest);
        recordRpcResult(dispatch, actions, isDryRun, result);
        return result.response;
      } catch (error) {
        recordRpcFailure(dispatch, actions, isDryRun, error);
        throw error instanceof RpcRunError ? error.original : error;
      }
    },
    [actions, dispatch, isDryRun, run]
  );

  return { ...rpc, execute };
}
