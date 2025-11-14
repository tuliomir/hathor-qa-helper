# Hathor QA Helper - Architecture Documentation

## Project Overview

A React + TypeScript application for testing and QA of Hathor wallet functionality. Built with Vite for fast development and optimized builds.

## Directory Structure

```
src/
├── components/          # React components
│   ├── Wallet.tsx      # Reusable wallet component (manages wallet lifecycle)
│   └── WalletDisplay.tsx # Display component (auto-generates seed)
├── constants/          # Application constants
│   └── network.ts      # Network configs (testnet/mainnet)
├── types/              # TypeScript type definitions
│   └── wallet.ts       # Wallet-related types
├── utils/              # Utility functions
│   └── walletUtils.ts  # Seed generation and validation
└── App.tsx, main.tsx   # Entry points
```

## Component Hierarchy

```
App
└── WalletDisplay
    └── Wallet (reusable)
        └── HathorWallet instance (in ref)
```

## Key Design Decisions

### 1. Separation of Concerns

- **Wallet.tsx**: Core wallet logic (initialization, lifecycle, events)
- **WalletDisplay.tsx**: UI/UX layer (seed display, user interaction)
- **Constants**: Network configuration separate from logic
- **Utils**: Pure functions (no side effects)

### 2. State Management Pattern

See `wallet-state-management.md` for detailed patterns.

**Core Principle**: Never store complex wallet objects in React state.

- Wallet instance → `useRef`
- Specific properties (status, balance, address) → `useState`
- Callbacks from parent → `useRef` with sync effect

### 3. Network Configuration

Two networks supported:
- **TESTNET** (default): For development and testing
- **MAINNET**: Production network (almost never used in QA helper)

Easy to switch via `DEFAULT_NETWORK` constant.

### 4. Type Safety

All wallet-related types centralized in `types/wallet.ts`:
- `WalletStatus`: State machine for wallet lifecycle
- `WalletState`: What we track in React state
- `WalletProps`: Component interface
- `WalletConfig`: Initialization parameters

## Component Patterns

### Wallet Component

**Responsibility**: Manage HathorWallet lifecycle and expose specific state

**Props**:
- `seedPhrase`: BIP39 seed
- `network`: TESTNET | MAINNET
- `onStatusChange?`: Callback for state updates
- `onWalletReady?`: Callback when wallet is initialized

**State Flow**:
```
idle → connecting → syncing → ready
  └─────────→ error (any step)
```

**Critical Implementation Details**:
1. Wallet instance stored in ref (`walletRef`)
2. Only status, address, error stored in state
3. Callbacks stored in refs to prevent re-initialization
4. Cleanup on unmount via useEffect

### WalletDisplay Component

**Responsibility**: Generate seed and display wallet

**Features**:
- Auto-generates seed phrase on mount
- Shows seed phrase with warning
- Delegates wallet logic to Wallet component
- Network indicator

## Code Quality

### Linting & Formatting

- **ESLint**: TypeScript + React rules
- **Prettier**: Standard formatting (120 char width, single quotes)
- **Scripts**:
  - `yarn lint` - Check for issues
  - `yarn lint:fix` - Auto-fix issues
  - `yarn format` - Format all code
  - `yarn format:check` - Check formatting (CI)

### TypeScript Configuration

- Strict mode enabled
- Path aliases not used (prefer relative imports)
- Type definitions for third-party libs via `@ts-expect-error`

## Performance Considerations

### 1. Prevent Unnecessary Re-renders

- Refs for callbacks (prevents effect re-runs)
- Refs for wallet instance (prevents re-renders on internal changes)
- Minimal state (only what's needed for UI)

### 2. Hot Module Reload (HMR)

- React Refresh enabled
- Critical: Avoid infinite loops via stable dependencies
- Use refs for objects that change frequently

### 3. Bundle Size

- Current: ~2.7MB (includes Hathor wallet-lib)
- Consider code splitting for future features
- Use dynamic imports for rarely-used components

## Common Pitfalls

### 1. Infinite Re-render Loop

**Symptom**: CPU spike, browser freeze, hot-reload errors

**Cause**: Unstable dependencies in useEffect

**Solution**: Use refs for callbacks and complex objects

### 2. Stale Wallet Data

**Symptom**: UI doesn't update when wallet state changes

**Cause**: Not listening to wallet events

**Solution**: Add event listeners in useEffect, extract specific data

### 3. Memory Leaks

**Symptom**: Multiple wallet instances running

**Cause**: Not cleaning up on unmount

**Solution**: Always call `wallet.stop()` in cleanup function

## Future Enhancements

### Suggested Improvements

1. **Custom Hook**: `useWallet(seedPhrase, network)`
   - Encapsulate wallet logic
   - Reusable across components

2. **Context API**: Share wallet across component tree
   - One wallet instance for entire app
   - Avoid prop drilling

3. **Transaction History**: Display recent transactions
   - Listen to 'new-tx' event
   - Store only tx IDs and amounts (not full tx objects)

4. **Balance Tracking**: Real-time balance updates
   - Listen to 'balance-update' event
   - Update specific balance state

5. **Multi-wallet Support**: Manage multiple wallets
   - Array of wallet refs
   - Active wallet ID in state

6. **Error Boundaries**: Graceful error handling
   - Catch wallet initialization errors
   - Display user-friendly messages

## Testing Strategy

### Unit Tests

- Utils: `generateSeed()`, `validateSeed()`
- Pure functions only (no wallet instance needed)

### Integration Tests

- Wallet component lifecycle
- Mock HathorWallet for testing
- Verify state transitions

### E2E Tests

- Full wallet flow
- Use testnet for real transactions
- Verify address generation

## Dependencies

### Core

- `react` + `react-dom`: UI framework
- `@hathor/wallet-lib`: Hathor wallet functionality
- `bitcore-mnemonic`: BIP39 seed generation

### Dev

- `vite`: Build tool (using rolldown-vite)
- `typescript`: Type safety
- `eslint` + `prettier`: Code quality

## Build & Deployment

### Development

```bash
yarn dev  # Start dev server on http://localhost:5173
```

### Production

```bash
yarn build  # TypeScript check + Vite build → dist/
```

### Preview

```bash
yarn preview  # Preview production build locally
```

## References

- Hathor Wallet Lib: https://github.com/HathorNetwork/hathor-wallet-lib
- React Best Practices: https://react.dev/
- TypeScript Handbook: https://www.typescriptlang.org/docs/
