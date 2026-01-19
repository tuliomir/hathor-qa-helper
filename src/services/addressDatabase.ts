/**
 * IndexedDB Address Database Service
 *
 * Provides a reverse lookup table (address → walletId) for tracking
 * addresses across test wallets. Uses IndexedDB for persistent storage
 * that can handle larger datasets than localStorage.
 *
 * Uses singleton pattern matching walletConnectClient.ts
 */

import { type IDBPDatabase, openDB } from 'idb';
import type { AddressEntry, AddressRecord } from '../types/addressDatabase';

const DB_NAME = 'qa-helper-addresses';
const DB_VERSION = 1;
const STORE_NAME = 'addresses';

/** Singleton database instance */
let db: IDBPDatabase | null = null;

/**
 * Opens and initializes the address database
 * Creates the object store and indexes if they don't exist
 */
export async function openAddressDatabase(): Promise<IDBPDatabase> {
  if (db) {
    return db;
  }

  try {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        // Create the addresses object store if it doesn't exist
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, {
            keyPath: 'address',
          });
          // Index for querying all addresses belonging to a wallet
          store.createIndex('walletId', 'walletId', { unique: false });
        }
      },
    });

    return db;
  } catch (error) {
    console.error('[AddressDB] Failed to open database:', error);
    throw error;
  }
}

/**
 * Store multiple addresses for a wallet
 * Uses upsert behavior but preserves original discoveredAt timestamp
 *
 * @param walletId - The wallet ID these addresses belong to
 * @param addresses - Array of address entries to store
 */
export async function storeAddresses(
  walletId: string,
  addresses: AddressEntry[]
): Promise<void> {
  try {
    const database = await openAddressDatabase();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const now = Date.now();

    for (const entry of addresses) {
      // Check if address already exists to preserve original discoveredAt
      const existing = await store.get(entry.address);

      if (!existing) {
        const record: AddressRecord = {
          address: entry.address,
          walletId,
          index: entry.index ?? null,
          discoveredAt: now,
        };
        await store.put(record);
      }
      // If address exists, we don't update it (preserves original discoveredAt)
    }

    await tx.done;
  } catch (error) {
    console.error('[AddressDB] Failed to store addresses:', error);
    // Non-blocking: don't throw, just log
  }
}

/**
 * Extract addresses from transaction data and store them
 * Handles various transaction formats from wallet-lib events
 *
 * @param walletId - The wallet ID to associate with discovered addresses
 * @param txData - Transaction data from wallet events
 */
export async function storeAddressesFromTransaction(
  walletId: string,
  txData: unknown
): Promise<void> {
  try {
    const addresses: AddressEntry[] = [];

    if (txData && typeof txData === 'object') {
      // Extract addresses from inputs and outputs
      const tx = txData as {
        inputs?: Array<{ decoded?: { address?: string } }>;
        outputs?: Array<{ decoded?: { address?: string } }>;
      };

      // Process inputs
      if (Array.isArray(tx.inputs)) {
        for (const input of tx.inputs) {
          if (input.decoded?.address) {
            addresses.push({ address: input.decoded.address });
          }
        }
      }

      // Process outputs
      if (Array.isArray(tx.outputs)) {
        for (const output of tx.outputs) {
          if (output.decoded?.address) {
            addresses.push({ address: output.decoded.address });
          }
        }
      }
    }

    if (addresses.length > 0) {
      await storeAddresses(walletId, addresses);
    }
  } catch (error) {
    console.error('[AddressDB] Failed to store addresses from transaction:', error);
    // Non-blocking: don't throw, just log
  }
}

/**
 * Delete all addresses associated with a wallet
 * Called when a wallet is removed
 *
 * @param walletId - The wallet ID to remove addresses for
 */
export async function deleteAddressesForWallet(walletId: string): Promise<void> {
  try {
    const database = await openAddressDatabase();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('walletId');

    // Get all addresses for this wallet using the index
    const addresses = await index.getAllKeys(walletId);

    // Delete each address
    for (const address of addresses) {
      await store.delete(address);
    }

    await tx.done;
  } catch (error) {
    console.error('[AddressDB] Failed to delete addresses for wallet:', error);
    // Non-blocking: don't throw, just log
  }
}

/**
 * Find which wallet an address belongs to
 * Primary use case for reverse lookup
 *
 * @param address - The address to look up
 * @returns The wallet ID if found, null otherwise
 */
export async function findWalletByAddress(address: string): Promise<string | null> {
  try {
    const database = await openAddressDatabase();
    const record = await database.get(STORE_NAME, address);
    return record?.walletId ?? null;
  } catch (error) {
    console.error('[AddressDB] Failed to find wallet by address:', error);
    return null;
  }
}

/**
 * Get all addresses stored for a specific wallet
 *
 * @param walletId - The wallet ID to get addresses for
 * @returns Array of address records
 */
export async function getAddressesForWallet(walletId: string): Promise<AddressRecord[]> {
  try {
    const database = await openAddressDatabase();
    const index = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).index('walletId');
    return await index.getAll(walletId);
  } catch (error) {
    console.error('[AddressDB] Failed to get addresses for wallet:', error);
    return [];
  }
}

/**
 * Get all stored addresses (useful for debugging)
 *
 * @returns Array of all address records
 */
export async function getAllAddresses(): Promise<AddressRecord[]> {
  try {
    const database = await openAddressDatabase();
    return await database.getAll(STORE_NAME);
  } catch (error) {
    console.error('[AddressDB] Failed to get all addresses:', error);
    return [];
  }
}
