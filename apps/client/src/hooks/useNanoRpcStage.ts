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
import {
  selectIsWalletConnectConnected,
  selectRpcNetwork,
  selectWalletConnectFirstAddress,
} from '../store/slices/walletConnectSlice';
import { selectFlowRunActive } from '../store/slices/flowRunSlice';
import { getStageUrl } from '../config/stageRoutes';
import { useWalletStore } from './useWalletStore';
import { useRequireRpcSession, useRequireTestAddress } from './useRequirements';
import { useTestWalletAddress0 } from './useTestWalletAddress';
import { isAddressOnly } from '../utils/addressOnlyWallet';
import { RpcRunError, useRpcMethod, type RpcHandlers } from './useRpcMethod';
import { addressMatchRequirement } from '../utils/addressMatch';
import { recordRpcFailure, recordRpcResult, type MethodSliceActions } from '../services/rpcRun';
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
 * The test wallet, the RPC network, the address at `addressIndex`, and the
 * stage preconditions: RPC session, test wallet address, and the session's
 * wallet being the test wallet (compared on address 0). Address-only test
 * wallets work at address index 0.
 */
export function useNanoStageWallet(addressIndex: number) {
  const { getWallet } = useWalletStore();
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const connectedAddress = useSelector(selectWalletConnectFirstAddress);
  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;
  const rpcNetwork = useSelector(selectRpcNetwork);

  const addressOnly = testWallet ? isAddressOnly(testWallet.metadata) : false;
  const address0 = useTestWalletAddress0();
  const runningAddress = useAddressAt(addressOnly ? undefined : testWallet, addressIndex);
  // An address-only wallet knows only address 0.
  const derivedAddress = addressOnly ? (addressIndex === 0 ? address0 : null) : runningAddress;

  const rpcSession = useRequireRpcSession();
  const testWalletReq = useRequireTestAddress();
  const match = isConnected
    ? addressMatchRequirement(connectedAddress || null, address0, getStageUrl('rpc-connection'))
    : null;
  const indexReq: Requirement | null =
    addressOnly && addressIndex !== 0
      ? {
          id: 'address-index',
          short: 'Address index',
          met: false,
          label: 'Only address 0 is known for an address-only wallet',
          action: 'Use address index 0',
        }
      : null;
  // A run's request may be open on the wallet; a second one would queue behind it.
  const flowActive = useSelector(selectFlowRunActive);
  const flowReq: Requirement | null = flowActive
    ? {
        id: 'flow-run',
        short: 'Automatic run',
        met: false,
        label: 'An automatic run is sending requests',
        action: 'Stop the automatic run to send by hand',
      }
    : null;
  const requirements: Requirement[] = [
    rpcSession,
    testWalletReq,
    ...(match ? [match] : []),
    ...(indexReq ? [indexReq] : []),
    ...(flowReq ? [flowReq] : []),
  ];

  return {
    testWallet,
    // The network the RPC requests act on (the session's chain), not the
    // test wallet's: it decides QA blueprints and explorer links.
    network: rpcNetwork,
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

  const sliceActions: MethodSliceActions = {
    setRequest: actions.request,
    setResponse: ({ response, duration }) => actions.response(response, duration),
    setError: actions.error,
  };

  const execute = async (
    call: (h: RpcHandlers) => Promise<HandlerResult>,
    dryRunRequest: { method: string; params: unknown }
  ) => {
    try {
      const result = await run(call, dryRunRequest);
      recordRpcResult(dispatch, sliceActions, isDryRun, result);
      return result.response;
    } catch (error) {
      recordRpcFailure(dispatch, sliceActions, isDryRun, error);
      throw error instanceof RpcRunError ? error.original : error;
    }
  };

  return { isDryRun, execute };
}
