/**
 * Type definitions for the QA stage system
 */

/**
 * Available QA stages
 */
export type StageId = 'wallet-initialization' | 'address-validation' | 'custom-tokens' | 'transaction-history' | 'rpc-testing';

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
  {
    id: 'custom-tokens',
    title: 'Custom Tokens',
    description: 'View custom tokens for funding and test wallets',
    icon: '🪙',
  },
  {
    id: 'transaction-history',
    title: 'Transaction History',
    description: 'View transaction history for the test wallet',
    icon: '📜',
  },
  {
    id: 'rpc-testing',
    title: 'RPC Testing',
    description: 'Test RPC calls with detailed request/response inspection',
    icon: '🔌',
  },
];
