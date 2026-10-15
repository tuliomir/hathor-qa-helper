/**
 * useRpcMethod — the RPC counterpart of useSnapMethod: session state, the
 * global dry-run flag, RPC handlers bound to the session, and `run()`,
 * which times a handler call, clears the deep-link notification and makes
 * the response Redux-safe (BigInt → string). Stages still decide where the
 * result is stored.
 */

import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { selectIsWalletConnectConnected } from '../store/slices/walletConnectSlice';
import { createRpcHandlers } from '../services/rpcHandlers';
import { runRpc, type RpcHandlers, type RpcRunResult } from '../services/rpcRun';
import { useDeepLinkCallback } from './useDeepLinkCallback';

export { RpcRunError, type RpcHandlers, type RpcRunResult } from '../services/rpcRun';

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
      if (!handlers) {
        if (isDryRun && dryRunRequest) return { request: dryRunRequest, response: null, duration: 0 };
        throw new Error('Connect an RPC session first');
      }
      try {
        return await runRpc(handlers, call);
      } finally {
        clearDeepLinkNotification();
      }
    },
    [handlers, isDryRun, clearDeepLinkNotification]
  );

  return { isConnected, isDryRun, handlers, run };
}
