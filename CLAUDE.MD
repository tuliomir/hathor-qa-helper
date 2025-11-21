# QA Helper - Hathor Wallet Testing Tool

React + TypeScript app for testing Hathor wallet functionality, RPC methods, and nano contracts. Built with Redux Toolkit + Vite.

## Quick Overview

**Purpose**: Comprehensive QA tool for Hathor wallet-lib integration and WalletConnect RPC testing

**Key Features**:
- Multi-wallet management (testnet/mainnet)
- Real-time wallet event monitoring
- WalletConnect RPC testing (getBalance, signWithAddress, etc.)
- Nano contract workflows (Bet NC: initialize, deposit, set result, withdraw)
- Transaction history and event auditing
- Address validation with OCR support
- Custom token management

**Tech Stack**: React, TypeScript, Redux Toolkit, @hathor/wallet-lib, WalletConnect, Vite

## Documentation

### Core Architecture
- **[architecture.md](.claude/docs/architecture.md)** - System structure, Redux patterns, component lifecycle, common pitfalls

### State Management
- **[wallet-state-management.md](.claude/docs/wallet-state-management.md)** - Redux + external map pattern, wallet lifecycle, event handling, critical serialization rules
- **[wallet-event-monitoring.md](.claude/docs/wallet-event-monitoring.md)** - Real-time event capture, transaction status tracking (Unconfirmed/Valid/Voided), NC confirmation monitoring, selectors

### Data Handling
- **[bigint-handling.md](.claude/docs/bigint-handling.md)** - BigInt serialization patterns, Redux compatibility, balance calculations
- **[token-management.md](.claude/docs/token-management.md)** - Custom token handling, token selection, caching patterns

### UI/UX
- **[design-system.md](.claude/docs/design-system.md)** - Tailwind classes, color system, component patterns, spacing/typography
- **[daisyui-components.md](.claude/docs/daisyui-components.md)** - DaisyUI component usage, theme configuration

### Development
- **[development-practices.md](.claude/docs/development-practices.md)** - Code style, best practices, testing patterns, common mistakes

## Quick Start

```bash
# Install dependencies
yarn install

# Start dev server (localhost:5173)
yarn dev

# Build for production
yarn build

# Lint & format
yarn lint:fix
yarn format
```

## Project Structure

```
src/
├── components/
│   ├── stages/           # QA stages (WalletInitialization, TxUpdateEvents, RPC stages, etc.)
│   └── common/           # Reusable components (Loading, CopyButton, etc.)
├── store/
│   └── slices/           # Redux slices (walletStore, tokens, transactionHistory, etc.)
├── hooks/                # Custom hooks (useWalletStore, useStage, useToast)
├── constants/            # Network configs (TESTNET, MAINNET)
├── types/                # TypeScript definitions
└── utils/                # Utilities (walletUtils, transactionStatus)
```

## Key Concepts

### Wallet Management
- Wallets stored in Redux (metadata) + external map (instances)
- Never store `HathorWallet` in Redux (non-serializable)
- Automatic event capture for all wallet events
- Status lifecycle: idle → connecting → syncing → ready

### Event Monitoring
- All wallet events automatically captured and stored
- Four event types: new-tx, update-tx, state, more-addresses-loaded
- Selectors for cross-stage access (by wallet, by tx hash, latest)
- Transaction status: Unconfirmed (no first_block) → Valid/Voided

### Stage System
- Organized into sections: Main QA, RPC, Bet Nano Contracts, Auditing
- Each stage is a standalone component
- Shared state via Redux hooks
- Navigation preserved on refresh

## Common Workflows

### Test Nano Contract Transaction
1. **Initialize** - Create wallet → start → get ready status
2. **RPC Connection** - Connect via WalletConnect → configure RPC
3. **Bet Initialize** - Create NC → get tx hash
4. **Monitor Events** - Navigate to "Tx Update Events" → watch for `first_block`
5. **Status Check** - Use selectors to track: Unconfirmed → Valid

### Track Transaction Confirmation
```typescript
const latestEvent = useAppSelector(state =>
  selectLatestEventForTx(state, txHash)
);

const status = getTransactionStatus({
  first_block: latestEvent?.data.first_block,
  is_voided: latestEvent?.data.is_voided,
});
// "Unconfirmed" | "Valid" | "Voided"
```

## Critical Rules

❌ **NEVER** store `HathorWallet` instances in Redux (non-serializable)
❌ **NEVER** store BigInt directly in Redux (use string conversion)
❌ **NEVER** forget to cleanup wallet instances on unmount
✅ **ALWAYS** use `walletInstancesMap` for wallet instances
✅ **ALWAYS** use selectors for event access
✅ **ALWAYS** handle both naming conventions (tx_id/txId, first_block/firstBlock, is_voided/voided)

## Good Practices

1. Always add new files to git and stage updated files for commit as well

## Need Help?

1. Check relevant doc in `.claude/docs/`
2. Search for similar patterns in `src/components/stages/`
3. Review Redux slice comments in `src/store/slices/`
4. Check design system for UI patterns

## Scripts Reference

| Command | Purpose |
|---------|---------|
| `yarn dev` | Start dev server |
| `yarn build` | Production build |
| `yarn preview` | Preview production build |
| `yarn lint` | Run ESLint |
| `yarn lint:fix` | Fix lint issues |
| `yarn format` | Format with Prettier |
| `yarn format:check` | Check formatting |
