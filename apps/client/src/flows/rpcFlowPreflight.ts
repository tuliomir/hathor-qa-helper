/**
 * What every RPC flow needs before it sends anything: real requests, an RPC
 * session on a testnet where the flow's blueprint is deployed, and the test
 * wallet on the other end of it, so the runner's address 0 is the one the
 * wallet signs with.
 */

import type { BlueprintIds } from '@qa-helper/shared/networks';
import type { RootState } from '../store';
import {
  selectRpcNetwork,
  selectRpcSessionIsMainnet,
  selectWalletConnectFirstAddress,
} from '../store/slices/walletConnectSlice';
import { NETWORK_CONFIG } from '../constants/network';
import { blueprintIdFor } from '../utils/blueprints';
import { walletAddress0 } from '../utils/addressOnlyWallet';

/** The test wallet's address 0: the address every flow step sends from. */
export function address0Of(state: RootState): string {
  const id = state.walletSelection.testWalletId;
  const address = walletAddress0(id ? state.walletStore.wallets[id] : undefined);
  if (!address) throw new Error('The test wallet has no address 0 yet');
  return address;
}

/** Why a flow on the `blueprint` contract can't run now, or null. */
export function rpcFlowPreflight(state: RootState, blueprint: keyof BlueprintIds, flowName: string): string | null {
  if (state.rpc.isDryRun) return 'Turn dry run off: the flow sends real requests';
  if (!state.walletConnect.session) return 'Connect the wallet over RPC first';
  if (selectRpcSessionIsMainnet(state)) return `The ${flowName} runs on testnets only`;
  const network = selectRpcNetwork(state);
  if (!blueprintIdFor(network, blueprint)) return `No ${blueprint} blueprint on ${NETWORK_CONFIG[network].label}`;
  let address0: string;
  try {
    address0 = address0Of(state);
  } catch (err) {
    return (err as Error).message;
  }
  const connected = selectWalletConnectFirstAddress(state);
  if (connected.toLowerCase() !== address0.toLowerCase()) {
    return 'The connected wallet is not the test wallet (address 0 differs)';
  }
  return null;
}
