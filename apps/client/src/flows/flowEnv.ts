/**
 * The app side of the flow runner: the store, the WalletConnect session in
 * it, the fullnode of the session's network and the router. The run panel
 * registers the router's `navigate`, since the run outlives the component
 * that started it.
 */

import { store } from '../store';
import type { StageId } from '../types/stage';
import { getStageUrl } from '../config/stageRoutes';
import { createRpcHandlers } from '../services/rpcHandlers';
import { clearDeepLinkNotification, runRpc, showDeepLinkNotification } from '../services/rpcRun';
import { selectDeepLinksEnabled, selectDeepLinkToastId } from '../store/slices/deepLinkSlice';
import { selectRpcNetwork } from '../store/slices/walletConnectSlice';
import { NETWORK_CONFIG } from '../constants/network';
import { waitForNanoTx } from '../utils/nanoTxConfirmation';
import { walletInstancesMap } from '../store/slices/walletStoreSlice';
import { isFeeToken } from '../fees';
import { scatterHtr } from '../services/scatterHtr';
import type { FlowReview } from '../store/slices/flowRunSlice';
import type { FlowEnv, FlowWallet } from './flowRunner';

let navigateTo: ((path: string) => void) | null = null;

/** Called by the run panel with the router's navigate; null on unmount. */
export function setFlowNavigator(navigate: ((path: string) => void) | null): void {
  navigateTo = navigate;
}

let answerReview: ((review: FlowReview | null) => void) | null = null;

/** The run panel's answer to the question the run is asking. */
export function answerFlowReview(review: FlowReview): void {
  answerReview?.(review);
}

/** Waits for `answerFlowReview`, or null once the run ends. */
function askReview(_question: string, shouldAbort: () => boolean): Promise<FlowReview | null> {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (shouldAbort()) settle(null);
    }, 500);
    function settle(review: FlowReview | null) {
      clearInterval(timer);
      answerReview = null;
      resolve(review);
    }
    answerReview = settle;
  });
}

function testWallet(): FlowWallet | null {
  const id = store.getState().walletSelection.testWalletId;
  const instance = id ? walletInstancesMap.get(id) : null;
  const network = id ? store.getState().walletStore.wallets[id]?.metadata.network : undefined;
  if (!instance || !network) return null;
  return {
    tokenUids: () => instance.getTokens(),
    balance: async (uid) => {
      const balance: Array<{ balance?: { unlocked?: bigint } }> = await instance.getBalance(uid);
      return balance?.[0]?.balance?.unlocked ?? 0n;
    },
    isFeeToken: (uid) => isFeeToken(instance, uid),
    addressAt: (index) => instance.getAddressAtIndex(index),
    addressIndex: async (address) =>
      (await instance.isAddressMine(address)) ? instance.getAddressIndex(address) : null,
    addressTxCount: async (address) => (await instance.storage.getAddressInfo(address))?.numTransactions ?? 0,
    scatterHtr: () => scatterHtr(instance, network),
  };
}

export function createFlowEnv(): FlowEnv {
  return {
    getState: store.getState,
    dispatch: store.dispatch,
    navigate: (stageId: StageId) => navigateTo?.(getStageUrl(stageId)),
    send: async (call) => {
      const { client, session } = store.getState().walletConnect;
      if (!client || !session) throw new Error('The RPC session is gone: reconnect the wallet');
      const handlers = createRpcHandlers({
        client,
        session,
        dryRun: false,
        onDeepLinkAvailable: (url, title) =>
          showDeepLinkNotification(store.dispatch, selectDeepLinksEnabled(store.getState()), url, title),
      });
      try {
        return await runRpc(handlers, call);
      } finally {
        clearDeepLinkNotification(store.dispatch, selectDeepLinkToastId(store.getState()));
      }
    },
    waitForTx: (hash, shouldAbort) =>
      waitForNanoTx(NETWORK_CONFIG[selectRpcNetwork(store.getState())].fullNodeUrl, hash, { shouldAbort }),
    testWallet,
    askReview,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: Date.now,
  };
}
