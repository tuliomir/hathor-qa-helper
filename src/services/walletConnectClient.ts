/**
 * WalletConnect Client Initialization
 *
 * Manages the WalletConnect client singleton instance
 */

import Client from '@walletconnect/sign-client';
import {
  DEFAULT_APP_METADATA,
  DEFAULT_LOGGER,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
  HATHOR_WALLET_DEEP_LINK_SCHEME,
} from '../constants/walletConnect';

let client: Client | null = null;

/**
 * Initialize the WalletConnect client
 * @returns Promise resolving to the initialized client
 */
export async function initializeClient(): Promise<Client> {
  if (client) {
    return client;
  }

  try {
    client = await Client.init({
      logger: DEFAULT_LOGGER,
      relayUrl: DEFAULT_RELAY_URL,
      projectId: DEFAULT_PROJECT_ID,
      metadata: DEFAULT_APP_METADATA,
    });

    client.core.relayer.once('relayer_connect', () => {
      console.log('[WalletConnect] Relayer connected');
    });

    return client;
  } catch (error) {
    console.error('[WalletConnect] Failed to initialize client:', error);
    throw error;
  }
}

/**
 * Get the initialized WalletConnect client
 * @returns The client instance
 * @throws Error if client is not initialized
 */
export function getClient(): Client {
  if (!client) {
    throw new Error('WalletConnect client is not initialized');
  }
  return client;
}

/**
 * Generate a deep link URL for connecting to Hathor Wallet via WalletConnect
 * @param wcUri The WalletConnect URI
 * @returns The deep link URL for the Hathor Wallet
 */
export function generateHathorWalletConnectionDeepLink(wcUri: string): string {
  return `${HATHOR_WALLET_DEEP_LINK_SCHEME}://wc?uri=${encodeURIComponent(wcUri)}`;
}

/**
 * Generate a deep link URL for a WalletConnect request
 * @param sessionTopic The WalletConnect session topic
 * @returns The deep link URL for the Hathor Wallet
 */
export function generateHathorWalletRequestDeepLink(sessionTopic: string): string {
  const wcUri = `wc:${sessionTopic}@2`;
  return `${HATHOR_WALLET_DEEP_LINK_SCHEME}://wc?uri=${encodeURIComponent(wcUri)}`;
}
