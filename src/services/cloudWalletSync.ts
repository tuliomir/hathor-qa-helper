/**
 * Cloud Wallet Sync Service
 * Handles syncing wallets with a remote JSON storage API
 */

import type { WalletMetadata } from '../types/walletStore';
import { CLOUD_API_URL } from '../constants/network';

/**
 * Response from the cloud API when storing wallets
 */
interface CloudStoreResponse {
  success: boolean;
  stored: number;
  filtered: number;
  error?: string;
}

/**
 * Fetch wallets from the cloud storage
 * Returns an array of wallet metadata
 */
export async function fetchCloudWallets(): Promise<WalletMetadata[]> {
  try {
    const response = await fetch(CLOUD_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    // Validate the response is an array
    if (!Array.isArray(data)) {
      console.warn('[CloudSync] Unexpected response format, expected array');
      return [];
    }

    // Filter and validate wallet objects
    return data.filter((item): item is WalletMetadata => {
      return (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.friendlyName === 'string' &&
        typeof item.seedWords === 'string' &&
        typeof item.network === 'string' &&
        typeof item.createdAt === 'number'
      );
    });
  } catch (error) {
    console.error('[CloudSync] Failed to fetch wallets:', error);
    throw error;
  }
}

/**
 * Store wallets to the cloud storage
 * Note: The API filters out a specific test seed phrase server-side
 */
export async function storeCloudWallets(wallets: WalletMetadata[]): Promise<CloudStoreResponse> {
  try {
    const response = await fetch(CLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(wallets),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data as CloudStoreResponse;
  } catch (error) {
    console.error('[CloudSync] Failed to store wallets:', error);
    throw error;
  }
}
