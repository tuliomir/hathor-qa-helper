/**
 * The slice of wallet-lib the server depends on. `walletFactory.ts` is the
 * only module that builds real wallets; tests plug in fakes through these
 * types. Type-only imports from wallet-lib are erased at runtime.
 */

import type { NetworkKey } from '@qa-helper/shared/networks';
import type {
  GetBalanceFullnodeFacadeReturnType,
  ProposedOutput,
  SendManyOutputsOptions,
  ShieldedOpeningEntry,
  UtxoDetails,
  UtxoOptions,
} from '@hathor/wallet-lib/lib/new/types';
import type { IShieldedCapability } from '@hathor/wallet-lib/lib/shielded/types';

/** Structural subset of `HathorWallet`. */
export interface LibWallet {
  start(options: { pinCode: string; password: string }): Promise<unknown>;
  isReady(): boolean;
  stop(): Promise<void>;
  getAddressAtIndex(index: number, options: { legacy: boolean }): Promise<string>;
  getShieldedCapability(): Promise<IShieldedCapability>;
  getBalance(token: string): Promise<GetBalanceFullnodeFacadeReturnType[]>;
  getUtxos(options: UtxoOptions): Promise<UtxoDetails>;
  sendManyOutputsTransaction(
    outputs: ProposedOutput[],
    options: SendManyOutputsOptions
  ): Promise<{ hash?: string | null } | null>;
  getShieldedUnblindingForTx(
    txId: string
  ): Promise<{ outputs: ShieldedOpeningEntry[]; inputs: ShieldedOpeningEntry[] }>;
}

export interface WalletFactory {
  /** Legacy address at index 0, derived offline from the seed. Throws on an invalid seed. */
  deriveId(seed: string, network: NetworkKey): string;
  /** Builds an unstarted wallet, with the native shielded provider when the network supports it. */
  create(seed: string, network: NetworkKey): LibWallet;
  /**
   * Applies process-global wallet-lib config for `network` (the tx-mining URL).
   * Must run right before every start and every send.
   */
  applyNetworkConfig(network: NetworkKey): void;
}
