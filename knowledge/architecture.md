# Architecture

React + TypeScript QA app for testing Hathor wallet-lib, WalletConnect RPC, and MetaMask Snap integration. Built with Vite + Redux Toolkit.

## Structure

```
src/
├── components/
│   ├── stages/           # QA stage components (one per stage, e.g. SnapConnectionStage.tsx)
│   ├── rpc/              # RPC request/response card components (RpcGetBalanceCard.tsx, etc.)
│   ├── common/           # Reusable components (CopyButton, ExplorerLink, TxStatus, Select, etc.)
│   ├── desktop/          # Desktop QA walkthrough layout
│   └── mobile/           # Mobile QA layout
├── config/
│   ├── stageRoutes.ts    # URL ↔ StageId/GroupId bidirectional mapping
│   ├── desktopQA/        # Desktop QA section configs (config-driven architecture)
│   └── mobileQA/         # Mobile QA section configs
├── store/
│   └── slices/           # Redux slices (one per feature: snapSlice, walletStoreSlice, etc.)
├── hooks/                # useSnapMethod, useWalletStore, useStage, useToast, useSendTransaction
├── services/             # snapHandlers, rpcHandlers, walletConnectClient, tokenFlowTracker, cleanupTemplateBuilder
├── types/                # TypeScript types (stage.ts is the stage/group registry)
├── constants/            # Network configs (TESTNET, MAINNET)
├── utils/                # Utilities (balanceUtils, transactionStatus, waitForTxSettlement)
└── polyfills/            # Buffer polyfill for browser
```

## URL Routing

Pattern: `/tools/{groupSlug}/{stageSlug}` — defined in `config/stageRoutes.ts`.

Desktop QA: `/desktop/*`, Mobile QA: `/mobile/*`.

Default route redirects to `/tools/main/wallet-initialization`.

## State Management: Redux Toolkit

- **Wallet Store** (`walletStoreSlice`): Metadata in Redux, instances in external `walletInstancesMap` (never store `HathorWallet` in Redux — non-serializable)
- **Snap State** (`snapSlice`): Connection state, addr0 (`address`), `network`, `snapOrigin`
- **Snap Methods** (`snapMethodsSlice`): Generic per-method request/response storage for snap RPC calls
- **RPC Slices**: One slice per WalletConnect RPC method (getBalanceSlice, sendTransactionSlice, etc.)
- **Navigation** (`stageSlice`): No longer used for routing — URL is the source of truth via `stageRoutes.ts`
- Access via hooks: `useWalletStore()`, `useSnapMethod()`, `useStage()`, `useToast()`

### BigInt in Redux
BigInt values (balances) are stored as strings in Redux, converted to BigInt by selectors. Components work with BigInt directly. See `bigint-handling.md`.

## Wallet Lifecycle

```
idle → connecting → syncing → ready
  └─────────→ error
```

- Instance stored in ref/external map, only status/address/error in Redux
- Event listeners set up in `startWallet` thunk, cleaned up in `stopWallet`
- Auto-start via `WalletAutoLoader` component (root-level, starts selected wallets on any route)

## Two Integration Paths

### WalletConnect RPC (stages prefixed with `Rpc*`)
- Connection via `walletConnectClient.ts` → WalletConnect protocol
- Handlers in `services/rpcHandlers.ts` — each returns `{ request, response }`
- Each method has its own Redux slice and RPC card component
- State in `rpcSlice` (connection, session) + individual method slices

### MetaMask Snap (stages prefixed with `Snap*`)
- Connection via EIP-6963 provider discovery + `wallet_invokeSnap`
- `useSnapMethod` hook — bypasses snap-utils' useRequest (which swallows errors) and calls `provider.request()` directly
- Handlers in `services/snapHandlers.ts` — thin wrappers around `invokeSnap()` for each `htr_*` method
- State in `snapSlice` (connection, addr0, network) + `snapMethodsSlice` (per-method results)

## Network Config
- TESTNET (default), MAINNET
- Network constants in `src/constants/network.ts`

## Common Pitfalls

- **Infinite re-render**: Unstable useEffect deps or selectors returning new objects → use `createSelector` and `useMemo`
- **Stale wallet data**: Missing event listeners → events are auto-captured by `startWallet` thunk
- **Memory leaks**: Always call `wallet.stop()` on cleanup
- **BigInt serialization**: Use `JSONBigInt.stringify()` from wallet-lib, not `JSON.stringify()`

## Core Dependencies
- react, @reduxjs/toolkit, react-redux, react-router-dom
- @hathor/wallet-lib (Hathor blockchain)
- @hathor/snap-utils (MetaMask Snap integration)
- @walletconnect/* (WalletConnect v2 protocol)
- tailwindcss + daisyui (styling)
- bitcore-mnemonic (BIP39 seeds)
- tesseract.js (OCR for address validation)
