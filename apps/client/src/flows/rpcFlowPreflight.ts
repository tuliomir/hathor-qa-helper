/**
 * What every RPC flow needs before it sends anything: real requests, an RPC
 * session on a testnet (where the flow's blueprint is deployed, if it uses
 * one), and the test wallet on the other end of it, so the runner's address
 * 0 is the one the wallet signs with. Flows that read the wallet's balances
 * or derive its addresses also need it started from its seed.
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
import { isAddressOnly, walletAddress0 } from '../utils/addressOnlyWallet';

/** The test wallet's address 0: the address every flow step sends from. */
export function address0Of(state: RootState): string {
  const id = state.walletSelection.testWalletId;
  const address = walletAddress0(id ? state.walletStore.wallets[id] : undefined);
  if (!address) throw new Error('The test wallet has no address 0 yet');
  return address;
}

export const SEED_WALLET_NEEDED = 'Start the test wallet from its seed: the flow reads its balances and addresses';

/** Why an RPC flow can't run now, or null. */
export function rpcFlowPreflight(
  state: RootState,
  flowName: string,
  needs: { blueprint?: keyof BlueprintIds; seedWallet?: boolean } = {}
): string | null {
  if (state.rpc.isDryRun) return 'Turn dry run off: the flow sends real requests';
  if (!state.walletConnect.session) return 'Connect the wallet over RPC first';
  if (selectRpcSessionIsMainnet(state)) return `The ${flowName} runs on testnets only`;
  const network = selectRpcNetwork(state);
  if (needs.blueprint && !blueprintIdFor(network, needs.blueprint)) {
    return `No ${needs.blueprint} blueprint on ${NETWORK_CONFIG[network].label}`;
  }
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
  if (needs.seedWallet) {
    const id = state.walletSelection.testWalletId;
    const wallet = id ? state.walletStore.wallets[id] : undefined;
    if (!wallet || isAddressOnly(wallet.metadata) || wallet.status !== 'ready') return SEED_WALLET_NEEDED;
  }
  return null;
}
