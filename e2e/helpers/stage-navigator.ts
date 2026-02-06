/**
 * Static data arrays for smoke test navigation.
 * Mirrors the app's config without importing app code.
 */

// ─── Main QA Stages (/tools/:groupSlug/:stageSlug) ─────────────────────────

export interface StageEntry {
  id: string;
  title: string;
  groupTitle: string;
  url: string;
}

export const MAIN_QA_STAGES: StageEntry[] = [
  // Main QA
  { id: 'wallet-initialization', title: 'Wallet Initialization', groupTitle: 'Main QA', url: '/tools/main/wallet-initialization' },
  { id: 'address-validation', title: 'Address Validation', groupTitle: 'Main QA', url: '/tools/main/address-validation' },
  { id: 'custom-tokens', title: 'Custom Tokens', groupTitle: 'Main QA', url: '/tools/main/custom-tokens' },
  // RPC Requests
  { id: 'rpc-connection', title: 'Connection', groupTitle: 'RPC Requests', url: '/tools/rpc/connection' },
  { id: 'rpc-basic-info', title: 'Basic Information', groupTitle: 'RPC Requests', url: '/tools/rpc/basic-info' },
  { id: 'rpc-get-address', title: 'Get Address', groupTitle: 'RPC Requests', url: '/tools/rpc/get-address' },
  { id: 'rpc-get-balance', title: 'Get Balance', groupTitle: 'RPC Requests', url: '/tools/rpc/get-balance' },
  { id: 'rpc-get-utxos', title: 'Get UTXOs', groupTitle: 'RPC Requests', url: '/tools/rpc/get-utxos' },
  { id: 'rpc-sign-with-address', title: 'Sign with Address', groupTitle: 'RPC Requests', url: '/tools/rpc/sign-with-address' },
  { id: 'rpc-create-token', title: 'Create Token', groupTitle: 'RPC Requests', url: '/tools/rpc/create-token' },
  { id: 'rpc-send-transaction', title: 'Send Transaction', groupTitle: 'RPC Requests', url: '/tools/rpc/send-transaction' },
  { id: 'rpc-sign-oracle-data', title: 'Sign Oracle Data', groupTitle: 'RPC Requests', url: '/tools/rpc/sign-oracle-data' },
  { id: 'rpc-raw-editor', title: 'Raw RPC Editor', groupTitle: 'RPC Requests', url: '/tools/rpc/raw-editor' },
  // Bet Nano Contract
  { id: 'rpc-bet-initialize', title: 'Initialize Bet', groupTitle: 'Bet Nano Contract', url: '/tools/bet-nc/initialize' },
  { id: 'rpc-bet-deposit', title: 'Place Bet', groupTitle: 'Bet Nano Contract', url: '/tools/bet-nc/deposit' },
  { id: 'rpc-set-bet-result', title: 'Set Bet Result', groupTitle: 'Bet Nano Contract', url: '/tools/bet-nc/set-result' },
  { id: 'rpc-bet-withdraw', title: 'Withdraw Prize', groupTitle: 'Bet Nano Contract', url: '/tools/bet-nc/withdraw' },
  // Push Notification
  { id: 'push-notifications', title: 'Push Notifications', groupTitle: 'Push Notification', url: '/tools/notifications/push' },
  // Auditing
  { id: 'transaction-history', title: 'Transaction History', groupTitle: 'Auditing', url: '/tools/auditing/transaction-history' },
  { id: 'tx-update-events', title: 'Tx Update Events', groupTitle: 'Auditing', url: '/tools/auditing/tx-update-events' },
  { id: 'test-wallet-cleanup', title: 'Test Wallet Cleanup', groupTitle: 'Auditing', url: '/tools/auditing/test-wallet-cleanup' },
  // MultiSig
  { id: 'multisig-wallet-management', title: 'MultiSig Wallets', groupTitle: 'MultiSig', url: '/tools/multisig/wallet-management' },
];

// ─── Mobile QA Sections (/mobile) ────────────────────────────────────────────

export interface SectionEntry {
  id: string;
  title: string;
  firstStepTitle: string;
}

export const MOBILE_QA_SECTIONS: SectionEntry[] = [
  { id: 'app-update', title: 'App Update', firstStepTitle: 'Load last release' },
  { id: 'new-wallet', title: 'New Wallet', firstStepTitle: 'Launch app' },
  { id: 'generate-token-error', title: 'Generate Token Error', firstStepTitle: 'Go to Settings' },
];

// ─── Desktop QA Sections (/desktop) ──────────────────────────────────────────

export const DESKTOP_QA_SECTIONS: SectionEntry[] = [
  { id: 'wallet-update', title: 'Wallet Update', firstStepTitle: 'Document state and upgrade' },
  { id: 'initialization', title: 'Initialization', firstStepTitle: 'Welcome screen and wallet type' },
  { id: 'token-empty-wallet', title: 'New Token with Empty Wallet', firstStepTitle: 'Navigate to Custom tokens' },
  { id: 'addresses', title: 'Addresses', firstStepTitle: 'Copy address and receive HTR' },
  { id: 'lock-unlock', title: 'Lock/Unlock', firstStepTitle: 'Lock wallet' },
  { id: 'create-token', title: 'Create New Token', firstStepTitle: 'Create token' },
  { id: 'send-tokens', title: 'Send Tokens', firstStepTitle: 'Send HTR' },
  { id: 'token-details', title: 'Token Registration', firstStepTitle: 'Fetch Config String' },
  { id: 'administrative-tools', title: 'Administrative Tools', firstStepTitle: 'Verify token data' },
  { id: 'hide-zero-balance', title: 'Hide Zero-Balance Tokens', firstStepTitle: 'Test hide setting' },
  { id: 'token-bar-scroll', title: 'Token Bar Scroll', firstStepTitle: 'Test scroll behavior' },
  { id: 'change-server', title: 'Change Server', firstStepTitle: 'Switch to mainnet' },
  { id: 'add-passphrase', title: 'Add Passphrase', firstStepTitle: 'Set a passphrase' },
  { id: 'notifications-bug-report', title: 'Notifications and Bug Report', firstStepTitle: 'Toggle settings' },
  { id: 'reload-wallet', title: 'Reload Wallet', firstStepTitle: 'Test offline/online transitions' },
  { id: 'register-same-name', title: 'Register Tokens with Same Name', firstStepTitle: 'Test duplicate name registration' },
  { id: 'spend-same-output', title: 'Try to Spend Same Output', firstStepTitle: 'Get spent output reference' },
  { id: 'create-nft', title: 'Create NFT', firstStepTitle: 'Create NFT' },
  { id: 'reset-locked', title: 'Reset from Locked Screen', firstStepTitle: 'Get to lock screen' },
  { id: 'reset-menu', title: 'Reset Menu', firstStepTitle: 'Open with debug flags' },
  { id: 'late-backup', title: 'Late Backup', firstStepTitle: 'Create wallet without backup' },
];
