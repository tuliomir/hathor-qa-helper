/**
 * The only module that builds wallet-lib wallets or loads the native crypto
 * provider. Everything else talks to the `LibWallet` port.
 */

import { addressUtils, config, Connection, HathorWallet, walletUtils } from '@hathor/wallet-lib';
import { GAP_LIMIT } from '@hathor/wallet-lib/lib/constants';
import { SCANNING_POLICY, type ILogger } from '@hathor/wallet-lib/lib/types';
import { NodeShieldedProvider } from '@hathor/ct-crypto-node/provider';
import { NETWORKS } from '@qa-helper/shared/networks';
import type { LibWallet, WalletFactory } from './walletPort.ts';
import { WALLET_PASSWORD, WALLET_PIN } from './walletRegistry.ts';

const CONNECTION_TIMEOUT_MS = 30_000;

/** Drops the lib's chatty debug/info lines; warnings and errors still reach stderr. */
const logger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: (...args) => console.warn('[wallet-lib]', ...args),
  error: (...args) => console.error('[wallet-lib]', ...args),
};

export function createWalletFactory(): WalletFactory {
  // One provider is enough: it is stateless and the NAPI addon loads once.
  let provider: InstanceType<typeof NodeShieldedProvider> | null = null;

  return {
    deriveId(seed, network) {
      const { valid } = walletUtils.wordsValid(seed);
      if (!valid) throw new Error('Invalid seed');
      const networkName = NETWORKS[network].libName;
      // Account xpub (m/44'/280'/0') → external chain (/0) → address 0, as
      // HathorWallet derives its legacy addresses.
      const accountXpub = walletUtils.getXPubKeyFromSeed(seed, { networkName });
      const chainXpub = walletUtils.xpubDeriveChild(accountXpub, 0);
      return addressUtils.deriveAddressFromXPubP2PKH(chainXpub, 0, networkName).base58;
    },

    create(seed, network) {
      const net = NETWORKS[network];
      const connection = new Connection({
        network: net.libName,
        servers: [net.fullNodeUrl],
        connectionTimeout: CONNECTION_TIMEOUT_MS,
        logger,
      });
      const wallet = new HathorWallet({
        seed,
        connection,
        password: WALLET_PASSWORD,
        pinCode: WALLET_PIN,
        logger,
        // Same as the client's WALLET_SCAN_POLICY: lib 3.x+ defaults to
        // SINGLE_ADDRESS, which would miss funds on addresses 1+.
        scanPolicy: { policy: SCANNING_POLICY.GAP_LIMIT, gapLimit: GAP_LIMIT },
      });
      if (net.supportsShielded) {
        // Must precede start(): setting it later triggers a rescan.
        provider ??= new NodeShieldedProvider();
        wallet.setShieldedCryptoProvider(provider);
      }
      return wallet as unknown as LibWallet;
    },

    applyNetworkConfig(network) {
      // A process-global in wallet-lib, read on every tx-mining request
      // (api/txMiningAxios). Without it the lib picks the URL from the network
      // name, so SHIELDED_TESTNET ('testnet') would mine on the regular testnet
      // service. Only the send queue sets it, before each send, and sends are
      // serialized so no two networks share it at once.
      config.setTxMiningUrl(NETWORKS[network].txMiningUrl);
    },
  };
}
