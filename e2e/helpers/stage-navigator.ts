/**
 * Static data arrays for smoke test navigation.
 * Mirrors the app's config without importing app code.
 */

// ─── Main QA Stages (/) ──────────────────────────────────────────────────────

export interface StageEntry {
  id: string;
  title: string;
  groupTitle: string;
}

export const MAIN_QA_STAGES: StageEntry[] = [
  // Main QA
  { id: 'wallet-initialization', title: 'Wallet Initialization', groupTitle: 'Main QA' },
  { id: 'address-validation', title: 'Address Validation', groupTitle: 'Main QA' },
  { id: 'custom-tokens', title: 'Custom Tokens', groupTitle: 'Main QA' },
  // RPC Requests
  { id: 'rpc-connection', title: 'Connection', groupTitle: 'RPC Requests' },
  { id: 'rpc-basic-info', title: 'Basic Information', groupTitle: 'RPC Requests' },
  { id: 'rpc-get-address', title: 'Get Address', groupTitle: 'RPC Requests' },
  { id: 'rpc-get-balance', title: 'Get Balance', groupTitle: 'RPC Requests' },
  { id: 'rpc-get-utxos', title: 'Get UTXOs', groupTitle: 'RPC Requests' },
  { id: 'rpc-sign-with-address', title: 'Sign with Address', groupTitle: 'RPC Requests' },
  { id: 'rpc-create-token', title: 'Create Token', groupTitle: 'RPC Requests' },
  { id: 'rpc-send-transaction', title: 'Send Transaction', groupTitle: 'RPC Requests' },
  { id: 'rpc-sign-oracle-data', title: 'Sign Oracle Data', groupTitle: 'RPC Requests' },
  { id: 'rpc-raw-editor', title: 'Raw RPC Editor', groupTitle: 'RPC Requests' },
  // Bet Nano Contract
  { id: 'rpc-bet-initialize', title: 'Initialize Bet', groupTitle: 'Bet Nano Contract' },
  { id: 'rpc-bet-deposit', title: 'Place Bet', groupTitle: 'Bet Nano Contract' },
  { id: 'rpc-set-bet-result', title: 'Set Bet Result', groupTitle: 'Bet Nano Contract' },
  { id: 'rpc-bet-withdraw', title: 'Withdraw Prize', groupTitle: 'Bet Nano Contract' },
  // Push Notification
  { id: 'push-notifications', title: 'Push Notifications', groupTitle: 'Push Notification' },
  // Auditing
  { id: 'transaction-history', title: 'Transaction History', groupTitle: 'Auditing' },
  { id: 'tx-update-events', title: 'Tx Update Events', groupTitle: 'Auditing' },
  { id: 'test-wallet-cleanup', title: 'Test Wallet Cleanup', groupTitle: 'Auditing' },
  // MultiSig
  { id: 'multisig-wallet-management', title: 'MultiSig Wallets', groupTitle: 'MultiSig' },
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
