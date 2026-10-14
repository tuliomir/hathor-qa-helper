/**
 * Static data arrays for smoke test navigation.
 * Mirrors the app's config without importing app code.
 */

// ─── Main QA Stages (/tools/:groupSlug/:stageSlug) ─────────────────────────

export interface StageEntry {
  id: string;
  title: string;
  groupTitle: string;
  familyTitle: string;
  url: string;
}

export const MAIN_QA_STAGES: StageEntry[] = [
  // Main QA
  {
    id: 'wallet-initialization',
    title: 'Wallet initialization',
    groupTitle: 'Main QA',
    familyTitle: 'Wallets',
    url: '/tools/main/wallet-initialization',
  },
  {
    id: 'address-validation',
    title: 'Address validation',
    groupTitle: 'Main QA',
    familyTitle: 'Wallets',
    url: '/tools/main/address-validation',
  },
  {
    id: 'custom-tokens',
    title: 'Custom tokens',
    groupTitle: 'Main QA',
    familyTitle: 'Wallets',
    url: '/tools/main/custom-tokens',
  },
  // RPC Requests
  {
    id: 'rpc-connection',
    title: 'Connection',
    groupTitle: 'RPC requests',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/rpc/connection',
  },
  {
    id: 'rpc-basic-info',
    title: 'Basic information',
    groupTitle: 'RPC requests',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/rpc/basic-info',
  },
  {
    id: 'rpc-get-address',
    title: 'Get address',
    groupTitle: 'RPC requests',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/rpc/get-address',
  },
  {
    id: 'rpc-get-balance',
    title: 'Get balance',
    groupTitle: 'RPC requests',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/rpc/get-balance',
  },
  {
    id: 'rpc-get-utxos',
    title: 'Get UTXOs',
    groupTitle: 'RPC requests',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/rpc/get-utxos',
  },
  {
    id: 'rpc-sign-with-address',
    title: 'Sign with address',
    groupTitle: 'RPC requests',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/rpc/sign-with-address',
  },
  {
    id: 'rpc-create-token',
    title: 'Create token',
    groupTitle: 'RPC requests',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/rpc/create-token',
  },
  {
    id: 'rpc-send-transaction',
    title: 'Send transaction',
    groupTitle: 'RPC requests',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/rpc/send-transaction',
  },
  {
    id: 'rpc-sign-oracle-data',
    title: 'Sign oracle data',
    groupTitle: 'RPC requests',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/rpc/sign-oracle-data',
  },
  {
    id: 'rpc-raw-editor',
    title: 'Raw RPC editor',
    groupTitle: 'RPC requests',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/rpc/raw-editor',
  },
  // Bet Nano Contract
  {
    id: 'rpc-bet-initialize',
    title: 'Initialize bet',
    groupTitle: 'Bet nano contract',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/bet-nc/initialize',
  },
  {
    id: 'rpc-bet-deposit',
    title: 'Place bet',
    groupTitle: 'Bet nano contract',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/bet-nc/deposit',
  },
  {
    id: 'rpc-set-bet-result',
    title: 'Set bet result',
    groupTitle: 'Bet nano contract',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/bet-nc/set-result',
  },
  {
    id: 'rpc-bet-withdraw',
    title: 'Withdraw prize',
    groupTitle: 'Bet nano contract',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/bet-nc/withdraw',
  },
  // Fee Nano Contract
  {
    id: 'rpc-fee-initialize',
    title: 'Initialize fee',
    groupTitle: 'Fee nano contract',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/fee-nc/initialize',
  },
  {
    id: 'rpc-fee-deposit',
    title: 'Deposit fee token',
    groupTitle: 'Fee nano contract',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/fee-nc/deposit',
  },
  {
    id: 'rpc-fee-withdraw',
    title: 'Withdraw fee token',
    groupTitle: 'Fee nano contract',
    familyTitle: 'WalletConnect RPC',
    url: '/tools/fee-nc/withdraw',
  },
  // Push Notification
  {
    id: 'push-notifications',
    title: 'Push notifications',
    groupTitle: 'Push notifications',
    familyTitle: 'Wallets',
    url: '/tools/notifications/push',
  },
  // Auditing
  {
    id: 'transaction-history',
    title: 'Transaction history',
    groupTitle: 'Auditing',
    familyTitle: 'Wallets',
    url: '/tools/auditing/transaction-history',
  },
  {
    id: 'tx-update-events',
    title: 'Tx update events',
    groupTitle: 'Auditing',
    familyTitle: 'Wallets',
    url: '/tools/auditing/tx-update-events',
  },
  {
    id: 'test-wallet-cleanup',
    title: 'Test wallet cleanup',
    groupTitle: 'Auditing',
    familyTitle: 'Wallets',
    url: '/tools/auditing/test-wallet-cleanup',
  },
  // MultiSig
  {
    id: 'multisig-wallet-management',
    title: 'Multisig wallets',
    groupTitle: 'Multisig',
    familyTitle: 'Wallets',
    url: '/tools/multisig/wallet-management',
  },
  // MetaMask Snap — ordered by progressive complexity
  {
    id: 'snap-connection',
    title: 'Connection',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/connection',
  },
  {
    id: 'snap-get-connected-network',
    title: 'Get network',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/get-network',
  },
  {
    id: 'snap-get-wallet-info',
    title: 'Wallet information',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/wallet-info',
  },
  {
    id: 'snap-get-address',
    title: 'Get address',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/get-address',
  },
  {
    id: 'snap-get-balance',
    title: 'Get balance',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/get-balance',
  },
  {
    id: 'snap-get-utxos',
    title: 'Get UTXOs',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/get-utxos',
  },
  {
    id: 'snap-get-xpub',
    title: 'Get xpub',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/get-xpub',
  },
  {
    id: 'snap-sign-with-address',
    title: 'Sign with address',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/sign-with-address',
  },
  {
    id: 'snap-sign-oracle-data',
    title: 'Sign oracle data',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/sign-oracle-data',
  },
  {
    id: 'snap-send-transaction',
    title: 'Send transaction',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/send-transaction',
  },
  {
    id: 'snap-create-token',
    title: 'Create token',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/create-token',
  },
  {
    id: 'snap-change-network',
    title: 'Change network',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/change-network',
  },
  {
    id: 'snap-send-nano-contract-tx',
    title: 'Nano contract tx',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/nano-contract-tx',
  },
  {
    id: 'snap-create-nc-token',
    title: 'NC + create token',
    groupTitle: 'Snap requests',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snaps/nc-create-token',
  },
  // Snap Bet Nano Contract
  {
    id: 'snap-bet-initialize',
    title: 'Initialize bet',
    groupTitle: 'Bet nano contract',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snap-bet-nc/initialize',
  },
  {
    id: 'snap-bet-deposit',
    title: 'Place bet',
    groupTitle: 'Bet nano contract',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snap-bet-nc/deposit',
  },
  {
    id: 'snap-set-bet-result',
    title: 'Set bet result',
    groupTitle: 'Bet nano contract',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snap-bet-nc/set-result',
  },
  {
    id: 'snap-bet-withdraw',
    title: 'Withdraw prize',
    groupTitle: 'Bet nano contract',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snap-bet-nc/withdraw',
  },
  // Snap Fee Nano Contract
  {
    id: 'snap-fee-initialize',
    title: 'Initialize fee',
    groupTitle: 'Fee nano contract',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snap-fee-nc/initialize',
  },
  {
    id: 'snap-fee-deposit',
    title: 'Deposit fee token',
    groupTitle: 'Fee nano contract',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snap-fee-nc/deposit',
  },
  {
    id: 'snap-fee-withdraw',
    title: 'Withdraw fee token',
    groupTitle: 'Fee nano contract',
    familyTitle: 'MetaMask Snap',
    url: '/tools/snap-fee-nc/withdraw',
  },
  // Shielded outputs
  {
    id: 'shielded-qa-server',
    title: 'QA server',
    groupTitle: 'Shielded outputs',
    familyTitle: 'Shielded',
    url: '/tools/shielded/qa-server',
  },
  {
    id: 'shielded-send',
    title: 'Shielded send',
    groupTitle: 'Shielded outputs',
    familyTitle: 'Shielded',
    url: '/tools/shielded/send',
  },
  {
    id: 'shielded-balances',
    title: 'Shielded balances',
    groupTitle: 'Shielded outputs',
    familyTitle: 'Shielded',
    url: '/tools/shielded/balances',
  },
  {
    id: 'shielded-inspector',
    title: 'Transaction inspector',
    groupTitle: 'Shielded outputs',
    familyTitle: 'Shielded',
    url: '/tools/shielded/inspector',
  },
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
  {
    id: 'register-same-name',
    title: 'Register Tokens with Same Name',
    firstStepTitle: 'Test duplicate name registration',
  },
  { id: 'spend-same-output', title: 'Try to Spend Same Output', firstStepTitle: 'Get spent output reference' },
  { id: 'create-nft', title: 'Create NFT', firstStepTitle: 'Create NFT' },
  { id: 'reset-locked', title: 'Reset from Locked Screen', firstStepTitle: 'Get to lock screen' },
  { id: 'reset-menu', title: 'Reset Menu', firstStepTitle: 'Open with debug flags' },
  { id: 'late-backup', title: 'Late Backup', firstStepTitle: 'Create wallet without backup' },
];
