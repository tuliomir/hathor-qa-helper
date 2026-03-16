/**
 * Type definitions for the QA stage system
 */

/**
 * Available QA stages
 */
export type StageId = 'wallet-initialization' | 'address-validation' | 'custom-tokens' | 'transaction-history' | 'tx-update-events' | 'rpc-connection' | 'rpc-basic-info' | 'rpc-get-address' | 'rpc-get-balance' | 'rpc-get-utxos' | 'rpc-sign-with-address' | 'rpc-create-token' | 'rpc-send-transaction' | 'rpc-sign-oracle-data' | 'rpc-raw-editor' | 'rpc-bet-initialize' | 'rpc-bet-deposit' | 'rpc-set-bet-result' | 'rpc-bet-withdraw' | 'rpc-fee-initialize' | 'rpc-fee-deposit' | 'rpc-fee-withdraw' | 'push-notifications' | 'test-wallet-cleanup' | 'multisig-wallet-management' | 'snap-connection' | 'snap-get-address' | 'snap-get-balance' | 'snap-get-connected-network' | 'snap-get-utxos' | 'snap-send-transaction' | 'snap-sign-with-address' | 'snap-create-token' | 'snap-send-nano-contract-tx' | 'snap-create-nc-token' | 'snap-sign-oracle-data' | 'snap-change-network';

/**
 * Available stage groups
 */
export type GroupId = 'main-qa' | 'rpc' | 'bet-nano-contracts' | 'fee-nano-contracts' | 'push-notifications' | 'auditing' | 'multisig' | 'snaps';

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
    id: 'fee-nano-contracts',
    title: 'Fee Nano Contract',
    stages: [
      {
        id: 'rpc-fee-initialize',
        title: 'Initialize Fee',
        description: 'Initialize a new fee nano contract with an HTR deposit',
        icon: '💎',
      },
      {
        id: 'rpc-fee-deposit',
        title: 'Deposit Fee Token',
        description: 'Deposit a fee-based token into the fee nano contract',
        icon: '📥',
      },
      {
        id: 'rpc-fee-withdraw',
        title: 'Withdraw Fee Token',
        description: 'Withdraw a fee-based token from the fee nano contract',
        icon: '📤',
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
  {
    id: 'multisig',
    title: 'MultiSig',
    stages: [
      {
        id: 'multisig-wallet-management',
        title: 'MultiSig Wallets',
        description: 'Manage multisig participant wallets and send transactions',
        icon: '🔐',
      },
    ],
  },
  {
    id: 'snaps',
    title: 'MetaMask Snaps',
    stages: [
      {
        id: 'snap-connection',
        title: 'Snap Connection',
        description: 'Connect to MetaMask Snap and configure snap origin',
        icon: '🦊',
      },
      {
        id: 'snap-get-address',
        title: 'Get Address',
        description: 'Retrieve addresses by type and index via Snap',
        icon: '📍',
      },
      {
        id: 'snap-get-balance',
        title: 'Get Balance',
        description: 'Query token balances via Snap',
        icon: '💰',
      },
      {
        id: 'snap-get-connected-network',
        title: 'Get Network',
        description: 'Get the connected network information via Snap',
        icon: '🌐',
      },
      {
        id: 'snap-get-utxos',
        title: 'Get UTXOs',
        description: 'Retrieve unspent transaction outputs via Snap',
        icon: '📦',
      },
      {
        id: 'snap-send-transaction',
        title: 'Send Transaction',
        description: 'Send a transaction with outputs via Snap',
        icon: '📤',
      },
      {
        id: 'snap-sign-with-address',
        title: 'Sign with Address',
        description: 'Sign a message using a specific address via Snap',
        icon: '✍️',
      },
      {
        id: 'snap-create-token',
        title: 'Create Token',
        description: 'Create a new custom token via Snap',
        icon: '🪙',
      },
      {
        id: 'snap-send-nano-contract-tx',
        title: 'Nano Contract TX',
        description: 'Send a nano contract transaction via Snap',
        icon: '📜',
      },
      {
        id: 'snap-create-nc-token',
        title: 'NC + Create Token',
        description: 'Create a nano contract with token creation via Snap',
        icon: '🔗',
      },
      {
        id: 'snap-sign-oracle-data',
        title: 'Sign Oracle Data',
        description: 'Sign oracle data for a nano contract via Snap',
        icon: '🔮',
      },
      {
        id: 'snap-change-network',
        title: 'Change Network',
        description: 'Change the connected network via Snap',
        icon: '🔄',
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
