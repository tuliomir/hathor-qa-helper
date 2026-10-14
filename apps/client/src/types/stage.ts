/**
 * Type definitions for the QA stage system
 */

/**
 * Available QA stages
 */
export type StageId =
  | 'wallet-initialization'
  | 'address-validation'
  | 'custom-tokens'
  | 'transaction-history'
  | 'tx-update-events'
  | 'rpc-connection'
  | 'rpc-basic-info'
  | 'rpc-get-address'
  | 'rpc-get-balance'
  | 'rpc-get-utxos'
  | 'rpc-sign-with-address'
  | 'rpc-create-token'
  | 'rpc-send-transaction'
  | 'rpc-sign-oracle-data'
  | 'rpc-raw-editor'
  | 'rpc-bet-initialize'
  | 'rpc-bet-deposit'
  | 'rpc-set-bet-result'
  | 'rpc-bet-withdraw'
  | 'rpc-fee-initialize'
  | 'rpc-fee-deposit'
  | 'rpc-fee-withdraw'
  | 'push-notifications'
  | 'test-wallet-cleanup'
  | 'multisig-wallet-management'
  | 'snap-connection'
  | 'snap-get-address'
  | 'snap-get-balance'
  | 'snap-get-connected-network'
  | 'snap-get-utxos'
  | 'snap-send-transaction'
  | 'snap-sign-with-address'
  | 'snap-create-token'
  | 'snap-send-nano-contract-tx'
  | 'snap-create-nc-token'
  | 'snap-sign-oracle-data'
  | 'snap-change-network'
  | 'snap-get-xpub'
  | 'snap-get-wallet-info'
  | 'snap-bet-initialize'
  | 'snap-bet-deposit'
  | 'snap-set-bet-result'
  | 'snap-bet-withdraw'
  | 'snap-fee-initialize'
  | 'snap-fee-deposit'
  | 'snap-fee-withdraw'
  | 'shielded-qa-server'
  | 'shielded-send'
  | 'shielded-balances'
  | 'shielded-inspector';

/**
 * Available stage groups
 */
export type GroupId =
  | 'main-qa'
  | 'rpc'
  | 'bet-nano-contracts'
  | 'fee-nano-contracts'
  | 'push-notifications'
  | 'auditing'
  | 'multisig'
  | 'snaps'
  | 'snap-bet-nc'
  | 'snap-fee-nc'
  | 'shielded';

/**
 * Families sit above groups in the stage navigation. They carry the
 * integration (RPC, Snap), so group and stage titles do not repeat it.
 */
export type FamilyId = 'wallets' | 'rpc' | 'snap' | 'shielded';

export interface StageFamily {
  id: FamilyId;
  title: string;
  /** Short name for chips (command palette results). */
  chip: string;
}

export const STAGE_FAMILIES: StageFamily[] = [
  { id: 'wallets', title: 'Wallets', chip: 'Wallets' },
  { id: 'rpc', title: 'WalletConnect RPC', chip: 'RPC' },
  { id: 'snap', title: 'MetaMask Snap', chip: 'Snap' },
  { id: 'shielded', title: 'Shielded', chip: 'Shielded' },
];

/**
 * Stage configuration
 */
export interface Stage {
  id: StageId;
  title: string;
  description: string;
  /** RPC / Snap methods the stage calls, for search and the stage header. */
  methods?: string[];
  /** @deprecated Stage emoji were dropped in the redesign; kept optional so nothing breaks. */
  icon?: string;
}

/**
 * Stage group configuration
 */
export interface StageGroup {
  id: GroupId;
  title: string;
  family: FamilyId;
  stages: Stage[];
}

/**
 * All available stage groups with their stages
 */
export const STAGE_GROUPS: StageGroup[] = [
  {
    id: 'main-qa',
    title: 'Main QA',
    family: 'wallets',
    stages: [
      {
        id: 'wallet-initialization',
        title: 'Wallet initialization',
        description: 'Initialize wallets by entering seed words',
      },
      {
        id: 'address-validation',
        title: 'Address validation',
        description: 'Validate addresses using initialized wallets',
      },
      {
        id: 'custom-tokens',
        title: 'Custom tokens',
        description: 'View custom tokens for funding and test wallets',
      },
    ],
  },
  {
    id: 'rpc',
    title: 'RPC requests',
    family: 'rpc',
    stages: [
      {
        id: 'rpc-connection',
        title: 'Connection',
        description: 'Connect to wallet via WalletConnect and configure RPC options',
      },
      {
        id: 'rpc-basic-info',
        title: 'Basic information',
        description: 'Test basic wallet information RPC methods',
        methods: ['htr_getWalletInformation', 'htr_getConnectedNetwork'],
      },
      {
        id: 'rpc-get-address',
        title: 'Get address',
        description: 'Retrieve addresses by type (first empty, index, or client)',
        methods: ['htr_getAddress'],
      },
      {
        id: 'rpc-get-balance',
        title: 'Get balance',
        description: 'Test htr_getBalance RPC method to query token balances',
        methods: ['htr_getBalance'],
      },
      {
        id: 'rpc-get-utxos',
        title: 'Get UTXOs',
        description: 'Retrieve unspent transaction outputs for a specific token',
        methods: ['htr_getUtxos'],
      },
      {
        id: 'rpc-sign-with-address',
        title: 'Sign with address',
        description: 'Test htr_signWithAddress RPC method to sign messages',
        methods: ['htr_signWithAddress'],
      },
      {
        id: 'rpc-create-token',
        title: 'Create token',
        description: 'Create a new custom token with mint/melt authorities',
        methods: ['htr_createToken'],
      },
      {
        id: 'rpc-send-transaction',
        title: 'Send transaction',
        description: 'Send a transaction with one or more outputs',
        methods: ['htr_sendTransaction'],
      },
      {
        id: 'rpc-sign-oracle-data',
        title: 'Sign oracle data',
        description: 'Sign data as oracle for a nano contract',
        methods: ['htr_signOracleData'],
      },
      {
        id: 'rpc-raw-editor',
        title: 'Raw RPC editor',
        description: 'Send raw JSON RPC requests directly to the wallet',
      },
    ],
  },
  {
    id: 'bet-nano-contracts',
    title: 'Bet nano contract',
    family: 'rpc',
    stages: [
      {
        id: 'rpc-bet-initialize',
        title: 'Initialize bet',
        description: 'Initialize a new bet nano contract with oracle and token configuration',
        methods: ['htr_sendNanoContractTx'],
      },
      {
        id: 'rpc-bet-deposit',
        title: 'Place bet',
        description: 'Place a bet on an existing bet nano contract',
        methods: ['htr_sendNanoContractTx'],
      },
      {
        id: 'rpc-set-bet-result',
        title: 'Set bet result',
        description: 'Set the result for a bet nano contract (oracle action)',
        methods: ['htr_sendNanoContractTx'],
      },
      {
        id: 'rpc-bet-withdraw',
        title: 'Withdraw prize',
        description: 'Withdraw your prize from a bet nano contract',
        methods: ['htr_sendNanoContractTx'],
      },
    ],
  },
  {
    id: 'fee-nano-contracts',
    title: 'Fee nano contract',
    family: 'rpc',
    stages: [
      {
        id: 'rpc-fee-initialize',
        title: 'Initialize fee',
        description: 'Initialize a new fee nano contract with an HTR deposit',
        methods: ['htr_sendNanoContractTx'],
      },
      {
        id: 'rpc-fee-deposit',
        title: 'Deposit fee token',
        description: 'Deposit a fee-based token into the fee nano contract',
        methods: ['htr_sendNanoContractTx'],
      },
      {
        id: 'rpc-fee-withdraw',
        title: 'Withdraw fee token',
        description: 'Withdraw a fee-based token from the fee nano contract',
        methods: ['htr_sendNanoContractTx'],
      },
    ],
  },
  {
    id: 'push-notifications',
    title: 'Push notifications',
    family: 'wallets',
    stages: [
      {
        id: 'push-notifications',
        title: 'Push notifications',
        description: 'Test push notifications by sending tokens to test wallet',
      },
    ],
  },
  {
    id: 'auditing',
    title: 'Auditing',
    family: 'wallets',
    stages: [
      {
        id: 'transaction-history',
        title: 'Transaction history',
        description: 'View transaction history for the test wallet',
      },
      {
        id: 'tx-update-events',
        title: 'Tx update events',
        description: 'Monitor real-time wallet events (new-tx, update-tx, state, etc.)',
      },
      {
        id: 'test-wallet-cleanup',
        title: 'Test wallet cleanup',
        description: 'Melt all tokens and return HTR to funding wallet',
      },
    ],
  },
  {
    id: 'multisig',
    title: 'Multisig',
    family: 'wallets',
    stages: [
      {
        id: 'multisig-wallet-management',
        title: 'Multisig wallets',
        description: 'Manage multisig participant wallets and send transactions',
      },
    ],
  },
  {
    id: 'snaps',
    title: 'Snap requests',
    family: 'snap',
    stages: [
      // 1. Connection
      {
        id: 'snap-connection',
        title: 'Connection',
        description: 'Connect to MetaMask Snap and configure snap origin',
      },
      // 2. No-approval reads
      {
        id: 'snap-get-connected-network',
        title: 'Get network',
        description: 'Get the connected network information via Snap',
        methods: ['htr_getConnectedNetwork'],
      },
      {
        id: 'snap-get-wallet-info',
        title: 'Wallet information',
        description: 'Get wallet network and address via Snap',
        methods: ['htr_getWalletInformation'],
      },
      // 3. Read-only (require approval)
      {
        id: 'snap-get-address',
        title: 'Get address',
        description: 'Retrieve addresses by type and index via Snap',
        methods: ['htr_getAddress'],
      },
      {
        id: 'snap-get-balance',
        title: 'Get balance',
        description: 'Query token balances via Snap',
        methods: ['htr_getBalance'],
      },
      {
        id: 'snap-get-utxos',
        title: 'Get UTXOs',
        description: 'Retrieve unspent transaction outputs via Snap',
        methods: ['htr_getUtxos'],
      },
      {
        id: 'snap-get-xpub',
        title: 'Get xpub',
        description: 'Retrieve the wallet extended public key via Snap',
        methods: ['htr_getXpub'],
      },
      // 4. Signatures (no side effects)
      {
        id: 'snap-sign-with-address',
        title: 'Sign with address',
        description: 'Sign a message using a specific address via Snap',
        methods: ['htr_signWithAddress'],
      },
      {
        id: 'snap-sign-oracle-data',
        title: 'Sign oracle data',
        description: 'Sign oracle data for a nano contract via Snap',
        methods: ['htr_signOracleData'],
      },
      // 5. Transactions & token creation
      {
        id: 'snap-send-transaction',
        title: 'Send transaction',
        description: 'Send a transaction with outputs via Snap',
        methods: ['htr_sendTransaction'],
      },
      {
        id: 'snap-create-token',
        title: 'Create token',
        description: 'Create a new custom token via Snap',
        methods: ['htr_createToken'],
      },
      {
        id: 'snap-change-network',
        title: 'Change network',
        description: 'Change the connected network via Snap',
        methods: ['htr_changeNetwork'],
      },
      // 6. Nano contract stages
      {
        id: 'snap-send-nano-contract-tx',
        title: 'Nano contract tx',
        description: 'Send a nano contract transaction via Snap',
        methods: ['htr_sendNanoContractTx'],
      },
      {
        id: 'snap-create-nc-token',
        title: 'NC + create token',
        description: 'Create a nano contract with token creation via Snap',
        methods: ['htr_createNanoContractCreateTokenTx'],
      },
    ],
  },
  {
    id: 'snap-bet-nc',
    title: 'Bet nano contract',
    family: 'snap',
    stages: [
      {
        id: 'snap-bet-initialize',
        title: 'Initialize bet',
        description: 'Initialize a bet nano contract via Snap',
        methods: ['htr_sendNanoContractTx'],
      },
      {
        id: 'snap-bet-deposit',
        title: 'Place bet',
        description: 'Place a bet on a nano contract via Snap',
        methods: ['htr_sendNanoContractTx'],
      },
      {
        id: 'snap-set-bet-result',
        title: 'Set bet result',
        description: 'Set the result for a bet nano contract via Snap',
        methods: ['htr_sendNanoContractTx'],
      },
      {
        id: 'snap-bet-withdraw',
        title: 'Withdraw prize',
        description: 'Withdraw prize from a bet nano contract via Snap',
        methods: ['htr_sendNanoContractTx'],
      },
    ],
  },
  {
    id: 'snap-fee-nc',
    title: 'Fee nano contract',
    family: 'snap',
    stages: [
      {
        id: 'snap-fee-initialize',
        title: 'Initialize fee',
        description: 'Initialize a fee nano contract via Snap',
        methods: ['htr_sendNanoContractTx'],
      },
      {
        id: 'snap-fee-deposit',
        title: 'Deposit fee token',
        description: 'Deposit a fee-based token via Snap',
        methods: ['htr_sendNanoContractTx'],
      },
      {
        id: 'snap-fee-withdraw',
        title: 'Withdraw fee token',
        description: 'Withdraw a fee-based token via Snap',
        methods: ['htr_sendNanoContractTx'],
      },
    ],
  },
  {
    id: 'shielded',
    title: 'Shielded outputs',
    family: 'shielded',
    stages: [
      {
        id: 'shielded-qa-server',
        title: 'QA server',
        description: 'Run client wallets on the local QA server, which can create shielded outputs, and fund them',
      },
      {
        id: 'shielded-send',
        title: 'Shielded send',
        description: 'Send shielded, fully shielded and transparent outputs from a QA server wallet',
      },
      {
        id: 'shielded-balances',
        title: 'Shielded balances',
        description: 'Compare transparent and shielded balances decoded by the server and by the browser',
      },
      {
        id: 'shielded-inspector',
        title: 'Transaction inspector',
        description: 'Look up a transaction and see its shielded outputs and what each wallet can unblind',
      },
    ],
  },
];

/**
 * Find the group ID that contains a given stage
 */
export function getGroupForStage(stageId: StageId): GroupId | null {
  for (const group of STAGE_GROUPS) {
    if (group.stages.some((s) => s.id === stageId)) {
      return group.id;
    }
  }
  return null;
}
