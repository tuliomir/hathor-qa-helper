/**
 * Type definitions for the global wallet store
 */

import type HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';
import type { NetworkKey } from '../constants/network';
import type { WalletStatus } from './wallet';
import type { ShieldedCapabilitySummary } from '../services/shieldedCapability';

/**
 * Metadata for a wallet that can be serialized to LocalStorage
 */
export interface WalletMetadata {
  id: string;
  friendlyName: string;
  /** Empty for address-only wallets. */
  seedWords: string;
  network: NetworkKey;
  /**
   * `address`: a wallet known only by its address 0 (e.g. a passkey wallet,
   * which has no seed to copy). It is never started; stages that only need
   * the address accept it. Absent on wallets saved before this existed.
   */
  kind?: 'seed' | 'address';
  /** Address 0 of an address-only wallet. */
  address0?: string;
  /**
   * Tokens added by hand to an address-only wallet, which can't list its own.
   * Name and symbol are known when added from a configuration string.
   */
  tokens?: Array<{ uid: string; name?: string; symbol?: string }>;
  createdAt: number;
  lastUsedAt?: number; // Timestamp of last wallet interaction (start, select, etc.)
  lastInitDurationMs?: number; // Time to reach ready state (ms), used for scan time estimation
}

/**
 * Runtime wallet information including the instance
 * Note: Balance is BigInt in the app layer, but stored as string in Redux for serializability
 */
export interface WalletInfo {
  metadata: WalletMetadata;
  instance: HathorWallet | null;
  status: WalletStatus;
  firstAddress?: string;
  balance?: bigint; // BigInt for type safety and consistency with wallet-lib
  tokenUids?: string[]; // Array of token UIDs for this wallet
  error?: string;
  /** Set only for wallets started on a network that supports shielded outputs. */
  shieldedCapability?: ShieldedCapabilitySummary;
}

/**
 * Context value for the wallet store
 */
export interface WalletStoreContextValue {
  wallets: Map<string, WalletInfo>;
  addWallet: (metadata: Omit<WalletMetadata, 'id' | 'createdAt'>) => string;
  removeWallet: (id: string) => void;
  getWallet: (id: string) => WalletInfo | undefined;
  updateFriendlyName: (id: string, friendlyName: string) => void;
  updateNetwork: (id: string, network: NetworkKey) => void;
  updateWalletInstance: (id: string, instance: HathorWallet | null) => void;
  updateWalletStatus: (id: string, status: WalletStatus, firstAddress?: string, error?: string) => void;
  getAllWallets: () => WalletInfo[];
}
