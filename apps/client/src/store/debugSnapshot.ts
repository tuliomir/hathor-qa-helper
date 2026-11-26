/**
 * What the debug log's `GET /debug-state` shows for a tab: where the run
 * is and what it acts on, without replaying the log. Secrets are left out
 * here and redacted again by `sanitize`.
 */

import type { RootState } from './index';
import { selectActiveNetwork } from './slices/networkSlice';
import { selectRpcNetwork, selectWalletConnectFirstAddress } from './slices/walletConnectSlice';

function walletOf(state: RootState, id: string | null | undefined): Record<string, unknown> | null {
  const wallet = id ? state.walletStore.wallets[id] : undefined;
  if (!wallet) return null;
  const { metadata } = wallet;
  return {
    id,
    name: metadata.friendlyName,
    kind: metadata.kind,
    network: metadata.network,
    status: wallet.status,
    address0: wallet.firstAddress ?? null,
  };
}

export function debugSnapshot(state: RootState): Record<string, unknown> {
  const run = state.flowRun;
  return {
    networks: {
      active: selectActiveNetwork(state),
      preferred: state.network.preferredNetwork,
      rpc: selectRpcNetwork(state),
    },
    rpc: {
      connected: Boolean(state.walletConnect.session),
      chains: state.walletConnect.chains,
      address0: selectWalletConnectFirstAddress(state),
      dryRun: state.rpc.isDryRun,
    },
    testWallet: walletOf(state, state.walletSelection.testWalletId),
    fundingWallet: walletOf(state, state.walletSelection.fundingWalletId),
    flowRun:
      run.status === 'idle'
        ? null
        : {
            flowId: run.flowId,
            status: run.status,
            reason: run.reason,
            currentStep: run.currentStep,
            verdict: run.verdict,
            context: run.context,
            steps: run.steps.map((s) => ({
              id: s.id,
              status: s.status,
              expects: s.expects,
              txHash: s.txHash,
              review: s.review,
              checks: s.checks,
              attempts: s.attempts.slice(-3),
            })),
          },
  };
}
