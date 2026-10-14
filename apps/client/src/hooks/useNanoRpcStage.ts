/**
 * Shared plumbing for the bet and fee RPC stages: the test wallet and the
 * address they derive from it, their preconditions, and `execute()`, which
 * runs a handler through useRpcMethod and records the outcome in the
 * stage's slice.
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { UnknownAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { selectIsWalletConnectConnected, selectWalletConnectFirstAddress } from '../store/slices/walletConnectSlice';
import { selectActiveNetwork } from '../store/slices/networkSlice';
import { getStageUrl } from '../config/stageRoutes';
import { useWalletStore } from './useWalletStore';
import { useRequireRpcSession, useRequireTestWallet } from './useRequirements';
import { RpcRunError, useRpcMethod, type RpcHandlers } from './useRpcMethod';
import { addressMatchRequirement } from '../utils/addressMatch';
import { extractErrorMessage } from '../utils/errorUtils';
import type { Requirement } from '../utils/requirements';
import type { MethodData } from '../components/common/MethodCard';

type TestWallet = ReturnType<ReturnType<typeof useWalletStore>['getWallet']>;

function useAddressAt(testWallet: TestWallet, index: number | null): string | null {
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const instance = testWallet?.instance;
    if (!instance || index === null) {
      setAddress(null);
      return;
    }
    instance
      .getAddressAtIndex(index)
      .then((a: string) => {
        if (!cancelled) setAddress(a);
      })
      .catch((err: unknown) => {
        console.error(`[NanoRpcStage] Failed to derive address at index ${index}:`, err);
        if (!cancelled) setAddress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [testWallet, index]);
  return address;
}

/**
 * The test wallet, its network, the address at `addressIndex`, and the
 * stage preconditions: RPC session, test wallet, and the session's wallet
 * being the test wallet (compared on address 0).
 */
export function useNanoStageWallet(addressIndex: number) {
  const { getWallet } = useWalletStore();
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;
  const activeNetwork = useSelector(selectActiveNetwork);

  const address0 = useAddressAt(testWallet, 0);
  const derivedAddress = useAddressAt(testWallet, addressIndex);

  const rpcSession = useRequireRpcSession();
  const testWalletReq = useRequireTestWallet();
  const match = isConnected
    ? addressMatchRequirement(connectedAddress || null, address0, getStageUrl('rpc-connection'))
    : null;
  const requirements: Requirement[] = [rpcSession, testWalletReq, ...(match ? [match] : [])];

  return {
    testWallet,
    // The test wallet's network; without one, the network picked in the shell.
    network: testWallet?.metadata.network ?? activeNetwork,
    derivedAddress: derivedAddress ?? '',
    requirements,
  };
}

interface SliceRecord {
  request: { method: string; params: unknown } | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
}

export const methodDataOf = (s: SliceRecord): MethodData => ({
  request: s.request,
  response: s.rawResponse,
  error: s.error,
  timestamp: s.timestamp,
  duration: s.duration,
  isDryRun: s.isDryRun,
});

type HandlerResult = { request: { method: string; params: unknown }; response: unknown };

/** Runs a handler and records request, response or error with the given action creators. */
export function useNanoRpcExecute(actions: {
  request: (p: { method: string; params: unknown; isDryRun: boolean }) => UnknownAction;
  response: (response: unknown, duration: number) => UnknownAction;
  error: (p: { error: string; duration: number }) => UnknownAction;
}) {
  const dispatch = useDispatch();
  const { isDryRun, run } = useRpcMethod();

  const execute = async (
    call: (h: RpcHandlers) => Promise<HandlerResult>,
    dryRunRequest: { method: string; params: unknown }
  ) => {
    try {
      const { request, response, duration } = await run(call, dryRunRequest);
      dispatch(actions.request({ method: request.method, params: request.params, isDryRun }));
      dispatch(actions.response(response, duration));
      return response;
    } catch (error) {
      const original = error instanceof RpcRunError ? error.original : error;
      const requestParams = (original as { requestParams?: { method: string; params: unknown } } | null)?.requestParams;
      if (requestParams) {
        dispatch(actions.request({ method: requestParams.method, params: requestParams.params, isDryRun }));
      }
      dispatch(
        actions.error({
          error: extractErrorMessage(original),
          duration: error instanceof RpcRunError ? error.duration : 0,
        })
      );
      throw original;
    }
  };

  return { isDryRun, execute };
}
