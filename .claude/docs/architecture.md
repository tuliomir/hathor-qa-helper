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
        error?: string
      }
    }
  },
  stage: { currentStage: 'wallet-initialization' | 'address-validation' }
}
```

## Scripts
- `yarn dev` - Dev server (localhost:5173)
- `yarn build` - Production build
- `yarn lint` / `yarn lint:fix` - Linting
- `yarn format` / `yarn format:check` - Formatting

## Core Dependencies
- react, @reduxjs/toolkit, react-redux
- @hathor/wallet-lib (Hathor functionality)
- bitcore-mnemonic (BIP39 seeds)
- tesseract.js (OCR)
