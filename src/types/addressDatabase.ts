/**
 * Type definitions for the IndexedDB address database
 *
 * The address database provides a reverse lookup table (address → walletId)
 * to enable cleanup features like token tracking across test wallets.
 */

/**
 * Record stored in the IndexedDB addresses object store
 */
export interface AddressRecord {
  /** The Hathor address (base58 format) - Primary key */
  address: string;
  /** The wallet ID this address belongs to */
  walletId: string;
  /** Derivation index if known (null for addresses discovered from transactions) */
  index: number | null;
  /** Timestamp when this address was first discovered */
  discoveredAt: number;
}

/**
 * Simplified address entry for batch storage operations
 */
export interface AddressEntry {
  /** The Hathor address */
  address: string;
  /** Optional derivation index */
  index?: number;
}
