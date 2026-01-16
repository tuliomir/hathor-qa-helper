/**
 * Type definitions for the QA stage system
 */

/**
 * Available QA stages
 */
export type StageId = 'wallet-initialization' | 'address-validation' | 'custom-tokens' | 'transaction-history' | 'tx-update-events' | 'rpc-connection' | 'rpc-basic-info' | 'rpc-get-address' | 'rpc-get-balance' | 'rpc-get-utxos' | 'rpc-sign-with-address' | 'rpc-create-token' | 'rpc-send-transaction' | 'rpc-sign-oracle-data' | 'rpc-raw-editor' | 'rpc-bet-initialize' | 'rpc-bet-deposit' | 'rpc-set-bet-result' | 'rpc-bet-withdraw' | 'push-notifications' | 'test-wallet-cleanup';

/**
 * Available stage groups
 */
export type GroupId = 'main-qa' | 'rpc' | 'bet-nano-contracts' | 'push-notifications' | 'auditing';

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
 * Stage group configuration
 */
export interface StageGroup {
  id: GroupId;
  title: string;
  stages: Stage[];
}

/**
 * Section separator for organizing stages (deprecated - kept for backward compatibility)
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
 * All available stage groups with their stages
 */
export const STAGE_GROUPS: StageGroup[] = [
  {
    id: 'main-qa',
    title: 'Main QA',
    stages: [
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
    ],
  },
  {
    id: 'rpc',
    title: 'RPC Requests',
    stages: [
      {
        id: 'rpc-connection',
        title: 'Connection',
        description: 'Connect to wallet via WalletConnect and configure RPC options',
        icon: '🔌',
      },
      {
        id: 'rpc-basic-info',
        title: 'Basic Information',
        description: 'Test basic wallet information RPC methods',
        icon: 'ℹ️',
      },
      {
        id: 'rpc-get-address',
        title: 'Get Address',
        description: 'Retrieve addresses by type (first empty, index, or client)',
        icon: '📍',
      },
      {
        id: 'rpc-get-balance',
        title: 'Get Balance',
        description: 'Test htr_getBalance RPC method to query token balances',
        icon: '💰',
      },
      {
        id: 'rpc-get-utxos',
        title: 'Get UTXOs',
        description: 'Retrieve unspent transaction outputs for a specific token',
        icon: '📦',
      },
      {
        id: 'rpc-sign-with-address',
        title: 'Sign with Address',
        description: 'Test htr_signWithAddress RPC method to sign messages',
        icon: '✍️',
      },
      {
        id: 'rpc-create-token',
        title: 'Create Token',
        description: 'Create a new custom token with mint/melt authorities',
        icon: '🪙',
      },
      {
        id: 'rpc-send-transaction',
        title: 'Send Transaction',
        description: 'Send a transaction with one or more outputs',
        icon: '📤',
      },
      {
        id: 'rpc-sign-oracle-data',
        title: 'Sign Oracle Data',
        description: 'Sign data as oracle for a nano contract',
        icon: '🔮',
      },
      {
        id: 'rpc-raw-editor',
        title: 'Raw RPC Editor',
        description: 'Send raw JSON RPC requests directly to the wallet',
        icon: '{}',
      },
    ],
  },
  {
    id: 'bet-nano-contracts',
    title: 'Bet Nano Contract',
    stages: [
      {
        id: 'rpc-bet-initialize',
        title: 'Initialize Bet',
        description: 'Initialize a new bet nano contract with oracle and token configuration',
        icon: '🎲',
      },
      {
        id: 'rpc-bet-deposit',
        title: 'Place Bet',
        description: 'Place a bet on an existing bet nano contract',
        icon: '💸',
      },
      {
        id: 'rpc-set-bet-result',
        title: 'Set Bet Result',
        description: 'Set the result for a bet nano contract (oracle action)',
        icon: '⚖️',
      },
      {
        id: 'rpc-bet-withdraw',
        title: 'Withdraw Prize',
        description: 'Withdraw your prize from a bet nano contract',
        icon: '🏆',
      },
    ],
  },
  {
    id: 'push-notifications',
    title: 'Push Notification',
    stages: [
      {
        id: 'push-notifications',
        title: 'Push Notifications',
        description: 'Test push notifications by sending tokens to test wallet',
        icon: '🔔',
      },
    ],
  },
  {
    id: 'auditing',
    title: 'Auditing',
    stages: [
      {
        id: 'transaction-history',
        title: 'Transaction History',
        description: 'View transaction history for the test wallet',
        icon: '📜',
      },
      {
        id: 'tx-update-events',
        title: 'Tx Update Events',
        description: 'Monitor real-time wallet events (new-tx, update-tx, state, etc.)',
        icon: '📡',
      },
      {
        id: 'test-wallet-cleanup',
        title: 'Test Wallet Cleanup',
        description: 'Melt all tokens and return HTR to funding wallet',
        icon: '🧹',
      },
    ],
  },
];

/**
 * Find the group ID that contains a given stage
 */
export function getGroupForStage(stageId: StageId): GroupId | null {
  for (const group of STAGE_GROUPS) {
    if (group.stages.some(s => s.id === stageId)) {
      return group.id;
    }
  }
  return null;
}

/**
 * All available stages with section separators (deprecated - kept for backward compatibility)
 */
export const STAGES: StageItem[] = STAGE_GROUPS.flatMap(group => [
  { type: 'separator', title: group.title } as StageSection,
  ...group.stages,
]);
