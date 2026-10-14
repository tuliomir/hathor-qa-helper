/**
 * Registers the browser shielded crypto provider on wallets whose network
 * supports shielded outputs. It must run before `wallet.start()`; afterwards
 * wallet-lib rescans the history.
 *
 * Never call it for multisig wallets: their shielded keys are
 * single-signature keys and shielded addresses throw.
 */

import type { IShieldedCryptoProvider } from '@hathor/wallet-lib';
import { NETWORK_CONFIG, type NetworkKey } from '../constants/network';

type ProviderLoader = () => Promise<IShieldedCryptoProvider>;
type ShieldedCapableWallet = { setShieldedCryptoProvider(provider: IShieldedCryptoProvider): void };

let browserProvider: Promise<IShieldedCryptoProvider> | null = null;

/** One WASM provider for the whole app; loading it fetches and instantiates the .wasm once. */
function loadBrowserProvider(): Promise<IShieldedCryptoProvider> {
  if (!browserProvider) {
    browserProvider = import('@hathor/ct-crypto-wasm/provider')
      .then(({ createBrowserShieldedCryptoProvider }) => createBrowserShieldedCryptoProvider())
      .catch((error: unknown) => {
        browserProvider = null;
        throw error;
      });
  }
  return browserProvider;
}

/** @returns whether a provider was registered */
export async function enableShieldedProvider(
  wallet: ShieldedCapableWallet,
  network: NetworkKey,
  loadProvider: ProviderLoader = loadBrowserProvider
): Promise<boolean> {
  if (!NETWORK_CONFIG[network].supportsShielded) return false;
  wallet.setShieldedCryptoProvider(await loadProvider());
  return true;
}
