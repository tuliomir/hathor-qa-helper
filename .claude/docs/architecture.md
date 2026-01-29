# Architecture

React + TypeScript QA app for Hathor wallet functionality. Built with Vite.

## Structure

```
src/
├── components/     # React components (stages/, Wallet.tsx)
├── constants/      # network.ts (testnet/mainnet configs)
├── hooks/          # useWalletStore.ts, useStage.ts
├── store/          # Redux (slices/, selectors/, hooks.ts)
├── types/          # wallet.ts, walletStore.ts, stage.ts
└── utils/          # walletUtils.ts (seed generation)
```

## Key Patterns

### State Management: Redux Toolkit
- **Wallet Store**: Metadata in Redux, instances in external `walletInstancesMap`
- **Stage Slice**: Current active stage
- **Never** store `HathorWallet` objects in Redux (non-serializable)
- Access via `useWalletStore()` and `useStage()` hooks

### Wallet Component Lifecycle
```
idle → connecting → syncing → ready
  └─────────→ error
```

**Critical**:
- Instance in ref, only status/address/error in state
- Callbacks in refs (prevent re-initialization)
- Always cleanup: `wallet.stop()` on unmount

### Network Config
- TESTNET (default), MAINNET (rare)
- Switch via `DEFAULT_NETWORK` constant

## Common Pitfalls

❌ **Infinite Re-render**: Unstable useEffect deps → Use refs for callbacks
❌ **Stale Data**: Missing wallet events → Add listeners in useEffect
❌ **Memory Leaks**: No cleanup → Call `wallet.stop()` in cleanup

## Redux Store
```typescript
{
  walletStore: {
    wallets: {
      [id]: {
        metadata: { id, friendlyName, seedWords, network, createdAt },
        instance: null, // Always null in Redux
        status: 'idle' | 'connecting' | 'syncing' | 'ready' | 'error',
        firstAddress?: string,
        balance?: string,
        tokenUids?: string[],
        events: WalletEvent[], // All wallet events (new-tx, update-tx, state, etc.)
        error?: string
      }
    }
  },
  stage: { currentStage: 'wallet-initialization' | 'tx-update-events' | ... },
  transactionHistory: { transactions: TransactionRecord[] },
  tokens: { tokens: TokenInfo[], selectedTokenUid: string },
  walletSelection: { fundingWalletId?: string, testWalletId?: string },
  // ... RPC slices (getBalance, signWithAddress, betNanoContract, etc.)
}
```

## Scripts
- `bun run dev` - Dev server (localhost:5173)
- `bun run build` - Production build
- `bun run build:binary` - Compile standalone server binary
- `bun run lint` / `bun run lint:fix` - Linting
- `bun run format` / `bun run format:check` - Formatting

## Binary Build

The app can be compiled to a standalone binary using Bun's `--compile` feature.

```bash
# Build the app first
bun run build

# Compile the server binary
bun run build:binary

# Run the binary (serves dist/ folder)
./qa-helper-standalone

# Custom port
PORT=3000 ./qa-helper-standalone
```

The binary (`qa-helper`) is a static file server that serves the `dist/` folder. It requires the `dist/` folder to be present alongside it.

## Core Dependencies
- react, @reduxjs/toolkit, react-redux
- @hathor/wallet-lib (Hathor functionality)
- bitcore-mnemonic (BIP39 seeds)
- tesseract.js (OCR)
