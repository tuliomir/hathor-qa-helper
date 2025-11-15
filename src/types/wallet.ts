/**
 * Type definitions for wallet-related structures
 */

// @ts-expect-error - Hathor wallet lib doesn't have TypeScript definitions
import type HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';
import type { NetworkType } from '../constants/network';

export type WalletStatus = 'idle' | 'connecting' | 'syncing' | 'ready' | 'error';

export interface WalletState {
  status: WalletStatus;
  seedPhrase?: string;
  firstAddress?: string;
  error?: string;
}

export interface WalletConfig {
  seed: string;
  network: NetworkType;
  password?: string;
  pinCode?: string;
  connectionTimeout?: number;
}

export interface WalletProps {
  seedPhrase: string;
  network: NetworkType;
  walletId?: string; // Optional ID to integrate with global wallet store
  onStatusChange?: (state: WalletState) => void;
  onWalletReady?: (wallet: HathorWallet) => void;
}
