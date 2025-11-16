/**
 * Type definitions for the global wallet store
 */

// @ts-expect-error - Hathor wallet lib doesn't have TypeScript definitions
import type HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';
import type { NetworkType } from '../constants/network';
import type { WalletStatus } from './wallet';

/**
 * Metadata for a wallet that can be serialized to LocalStorage
 */
export interface WalletMetadata {
  id: string;
  friendlyName: string;
  seedWords: string;
  network: NetworkType;
  createdAt: number;
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
  error?: string;
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
  updateWalletInstance: (id: string, instance: HathorWallet | null) => void;
  updateWalletStatus: (id: string, status: WalletStatus, firstAddress?: string, error?: string) => void;
  getAllWallets: () => WalletInfo[];
}