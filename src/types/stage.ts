/**
 * Type definitions for the QA stage system
 */

/**
 * Available QA stages
 */
export type StageId = 'wallet-initialization' | 'address-validation' | 'custom-tokens' | 'transaction-history' | 'rpc-connection' | 'rpc-get-balance' | 'rpc-sign-with-address';

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
 * Section separator for organizing stages
 */
export interface StageSection {
  type: 'separator';
  title: string;
}

/**
 * Union type for stage items (stage or separator)
 */
export type StageItem = Stage | StageSection;

/**
 * All available stages with section separators
 */
export const STAGES: StageItem[] = [
  {
    type: 'separator',
    title: 'Main QA',
  },
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
    type: 'separator',
    title: 'RPC',
  },
  {
    id: 'rpc-connection',
    title: 'Connection',
    description: 'Connect to wallet via WalletConnect and configure RPC options',
    icon: '🔌',
  },
  {
    id: 'rpc-get-balance',
    title: 'Get Balance',
    description: 'Test htr_getBalance RPC method to query token balances',
    icon: '💰',
  },
  {
    id: 'rpc-sign-with-address',
    title: 'Sign with Address',
    description: 'Test htr_signWithAddress RPC method to sign messages',
    icon: '✍️',
  },
  {
    type: 'separator',
    title: 'Auditing',
  },
  {
    id: 'transaction-history',
    title: 'Transaction History',
    description: 'View transaction history for the test wallet',
    icon: '📜',
  },
];
