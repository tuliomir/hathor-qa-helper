/**
 * Type definitions for wallet-related structures
 */

import type HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';
import type { NetworkKey } from '../constants/network';

/** `address-only`: an address-only wallet, which is never started. */
export type WalletStatus = 'idle' | 'connecting' | 'syncing' | 'ready' | 'error' | 'address-only';

export interface WalletState {
  status: WalletStatus;
  seedPhrase?: string;
  firstAddress?: string;
  error?: string;
}

export interface WalletConfig {
  seed: string;
  network: NetworkKey;
  password?: string;
  pinCode?: string;
  connectionTimeout?: number;
}

export interface WalletProps {
  seedPhrase: string;
  network: NetworkKey;
  walletId?: string; // Optional ID to integrate with global wallet store
  onStatusChange?: (state: WalletState) => void;
  onWalletReady?: (wallet: HathorWallet) => void;
}
