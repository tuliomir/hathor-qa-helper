/**
 * useRpcMethod — the RPC counterpart of useSnapMethod: session state, the
 * global dry-run flag, RPC handlers bound to the session, and `run()`,
 * which times a handler call, clears the deep-link notification and makes
 * the response Redux-safe (BigInt → string). Stages still decide where the
 * result is stored.
 */

import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';
import type { RootState } from '../store';
import { selectIsWalletConnectConnected } from '../store/slices/walletConnectSlice';
import { createRpcHandlers } from '../services/rpcHandlers';
import { useDeepLinkCallback } from './useDeepLinkCallback';

export type RpcHandlers = ReturnType<typeof createRpcHandlers>;

export interface RpcRunResult {
  request: { method: string; params: unknown };
  response: unknown;
  duration: number;
}

/** Thrown by `run()`: the handler's error plus how long the call took. */
export class RpcRunError extends Error {
  readonly original: unknown;
  readonly duration: number;

  constructor(original: unknown, duration: number) {
    super(original instanceof Error ? original.message : String(original));
    this.original = original;
    this.duration = duration;
  }
}

export interface RpcMethodOptions {
  /** Token UIDs htr_getBalance asks for (the handlers default to HTR only). */
  balanceTokens?: string[];
}

export function useRpcMethod({ balanceTokens }: RpcMethodOptions = {}) {
  const client = useSelector((state: RootState) => state.walletConnect.client);
  const session = useSelector((state: RootState) => state.walletConnect.session);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const { onDeepLinkAvailable, clearDeepLinkNotification } = useDeepLinkCallback();

  // Keyed by content, so a new array with the same tokens keeps the handlers.
  const balanceTokensKey = balanceTokens?.join(',');
  const handlers = useMemo<RpcHandlers | null>(
    () =>
      client && session
        ? createRpcHandlers({
            client,
            session,
            dryRun: isDryRun,
            onDeepLinkAvailable,
            balanceTokens: balanceTokensKey ? balanceTokensKey.split(',') : undefined,
          })
        : null,
    [client, session, isDryRun, onDeepLinkAvailable, balanceTokensKey]
  );

  const run = useCallback(
    async (
      call: (h: RpcHandlers) => Promise<{ request: { method: string; params: unknown }; response: unknown }>,
      /** Request to report in dry run when no session exists (dry run works without one). */
      dryRunRequest?: { method: string; params: unknown }
    ): Promise<RpcRunResult> => {
      const start = Date.now();
      if (!handlers) {
        if (isDryRun && dryRunRequest) return { request: dryRunRequest, response: null, duration: 0 };
        throw new Error('Connect an RPC session first');
      }
      try {
        const { request, response } = await call(handlers);
        return {
          request,
          response: response ? JSON.parse(JSONBigInt.stringify(response)) : null,
          duration: Date.now() - start,
        };
      } catch (err) {
        throw new RpcRunError(err, Date.now() - start);
      } finally {
        clearDeepLinkNotification();
      }
    },
    [handlers, isDryRun, clearDeepLinkNotification]
  );

  return { isConnected, isDryRun, handlers, run };
}
