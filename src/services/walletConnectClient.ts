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
