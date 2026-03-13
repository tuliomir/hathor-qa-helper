/**
 * Transaction Status Utilities
 * Helpers for determining and displaying transaction confirmation status
 */

export type TransactionStatus = 'Unconfirmed' | 'Valid' | 'Voided' | 'Unknown';

interface Transaction {
  nc_context?: unknown;
  nc_address?: unknown;
  nc_args?: unknown;
  nc_method?: string;
  nc_blueprint_id?: string;
  nc_id?: string;
  firstBlock?: number | string | null;
  first_block?: number | string | null;
  voided?: boolean;
  is_voided?: boolean;
}

/**
 * Determine transaction status based on firstBlock/first_block and voided/is_voided properties
 * Handles both naming conventions for compatibility with different wallet-lib versions
 *
 * Regular transactions are Valid as soon as they exist (no first_block needed).
 * Nano contract transactions require a first_block to be considered confirmed.
 *
 * @param tx Transaction object with block, voided, and optionally nc_* properties
 * @returns Status: "Unconfirmed", "Valid", or "Voided"
 */
export function getTransactionStatus(tx: Transaction): TransactionStatus {
  const firstBlock = tx.firstBlock ?? tx.first_block;
  const isVoided = tx.voided ?? tx.is_voided;
  const isNano = tx.nc_id || tx.nc_blueprint_id || tx.nc_method || tx.nc_args || tx.nc_address || tx.nc_context;

  if (isVoided) return 'Voided';
  if (!isNano) return 'Valid';
  if (!firstBlock) return 'Unconfirmed';
  return 'Valid';
}

/**
 * Get Tailwind CSS classes for status badge styling
 * @param status Transaction status
 * @returns Tailwind class string for badge
 */
export function getStatusColorClass(status: TransactionStatus): string {
  switch (status) {
    case 'Valid':
      return 'bg-success/10 text-success';
    case 'Unconfirmed':
      return 'bg-warning/10 text-warning';
    case 'Voided':
      return 'bg-danger/10 text-danger';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}
