/**
 * Transaction Status Utilities
 * Helpers for determining and displaying transaction confirmation status
 */

export type TransactionStatus = 'Unconfirmed' | 'Valid' | 'Voided';

interface Transaction {
  firstBlock?: number;
  voided?: boolean;
}

/**
 * Determine transaction status based on firstBlock and voided properties
 * @param tx Transaction object with firstBlock and voided properties
 * @returns Status: "Unconfirmed", "Valid", or "Voided"
 */
export function getTransactionStatus(tx: Transaction): TransactionStatus {
  if (!tx.firstBlock) return 'Unconfirmed';
  return tx.voided ? 'Voided' : 'Valid';
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
