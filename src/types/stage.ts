/**
 * Type definitions for the QA stage system
 */

/**
 * Available QA stages
 */
export type StageId = 'wallet-initialization' | 'address-validation';

/**
 * Stage configuration
 */
export interface Stage {
  id: StageId;
  title: string;
  description: string;
  icon?: string;
}

/**
 * All available stages
 */
export const STAGES: Stage[] = [
  {
    id: 'wallet-initialization',
    title: 'Wallet Initialization',
    description: 'Initialize wallets by entering seed words',
    icon: '🔑',
  },
  {
    id: 'address-validation',
    title: 'Address Validation',
    description: 'Validate addresses using initialized wallets',
    icon: '✅',
  },
];
