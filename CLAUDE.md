# QA Helper — Hathor Wallet Testing Tool

React + TypeScript + Redux Toolkit + Vite app for testing Hathor wallet-lib, WalletConnect RPC, and MetaMask Snap integration.

## Commands

Only use `bun` — `npx` and `yarn` are forbidden.

| Command | Purpose |
|---|---|
| `bun dev` | Dev server on localhost:5173 |
| `bun run build` | Production build (`tsc -b && vite build`) |
| `bun run typecheck` | TypeScript check (`tsc --noEmit`) |
| `bun lint` / `bun lint:fix` | ESLint |
| `bun format` / `bun format:check` | Prettier |
| `bun test` | Unit tests (bun test runner, `tests/` dir) |
| `bun run test:e2e` | Playwright e2e (`e2e/` dir) |

## Domain Glossary

- **Stage** — A single QA screen/tool (e.g. "Send Transaction", "Get Balance"). Each is a React component in `src/components/stages/`. Defined as a `StageId` in `src/types/stage.ts`.
- **Group** — A collection of related stages shown together in the sidebar (e.g. "MetaMask Snaps", "RPC Requests"). Defined as `GroupId` in `src/types/stage.ts`. The full registry is `STAGE_GROUPS` in the same file.
- **Section** — Legacy term for group. The `StageSection` type exists for backward compat. When someone says "Snaps section" they mean the `snaps` group.
- **Snap stages** — Stages prefixed with `Snap*` (e.g. `SnapConnectionStage.tsx`). They use MetaMask Snap RPC via `useSnapMethod` hook and `snapHandlers.ts`.
- **RPC stages** — Stages using WalletConnect RPC via `rpcHandlers.ts` and the `rpcSlice`.

## Architecture

```
src/
├── components/stages/     # All QA stages (one file per stage)
├── components/common/     # Shared UI components
├── components/mobile/     # Mobile QA layout
├── components/desktop/    # Desktop QA layout
├── config/stageRoutes.ts  # URL ↔ StageId/GroupId bidirectional mapping
├── store/slices/          # Redux slices (one per feature/stage)
├── hooks/                 # useSnapMethod, useStage, useWalletStore, useToast, etc.
├── services/              # RPC/snap handlers, wallet connect client, cleanup logic
├── types/                 # TypeScript types (stage.ts is the stage/group registry)
├── constants/             # Network configs (TESTNET, MAINNET)
└── utils/                 # Utilities
```

**URL routing**: `/tools/{groupSlug}/{stageSlug}` — mapped via `config/stageRoutes.ts`.

## Key Patterns

### Wallet instances
- `HathorWallet` instances are **never stored in Redux** (non-serializable). They live in an external `walletInstancesMap`. Redux holds only metadata.
- BigInt values must be converted to strings before Redux storage.

### Snap architecture
- **`snapSlice.ts`** — Snap connection state: `isConnected`, `address` (addr0), `network`, `snapOrigin`.
- **`snapMethodsSlice.ts`** — Generic request/response storage for individual snap RPC calls.
- **`useSnapMethod` hook** (`hooks/useSnapMethod.ts`) — Wraps snap RPC execution with loading/error/response state. Most snap stages use this.
- **`snapHandlers.ts`** (`services/`) — Thin wrappers around `invokeSnap()` for each snap RPC method (`htr_changeNetwork`, `htr_getWalletInformation`, etc.).
- **Connection flow**: `SnapConnectionStage` → installs snap → calls `htr_getWalletInformation` → dispatches `setSnapWalletInfo({ address, network })` to `snapSlice`.
- **`selectSnapAddress`** — Selector for addr0, used by ~10 snap stages for address quick-fill buttons.

### Creating new stages
See `knowledge/creating-stages.md` for the full step-by-step guide. Summary: create Redux slice → handler in services → stage component → register in `types/stage.ts` and `config/stageRoutes.ts`.

## Critical Rules

- **NEVER** store `HathorWallet` in Redux — use `walletInstancesMap`
- **NEVER** store BigInt in Redux — convert to string
- **NEVER** modify `hathor-rpc-lib` — it belongs to another team
- **ALWAYS** use `bun`, never `npx` or `yarn`
- Commit titles: 50 chars max. Body lines: 72 chars max.
- Always stage new files for git commits.

## Detailed Docs

In-depth guides live in `knowledge/`:

| Doc | Topic |
|---|---|
| `architecture.md` | System structure, Redux patterns, two integration paths (RPC vs Snap) |
| `creating-stages.md` | Step-by-step guide for adding new stages (RPC and Snap paths) |
| `wallet-state-management.md` | Redux + external map pattern, wallet lifecycle, thunks |
| `wallet-event-monitoring.md` | Event capture, tx status tracking, settlement/confirmation utilities |
| `token-management.md` | Custom token handling, caching, melt authority, token flow tracking |
| `tx-template.md` | Transaction templates, melt patterns, atomic cleanup |
| `design-system.md` | Tailwind/DaisyUI classes, color system, component patterns |
| `daisyui-components.md` | DaisyUI component reference |
| `testing.md` | Bun unit tests + Playwright e2e |
| `playwright-debugging.md` | Playwright debugging workflow |
| `bigint-handling.md` | BigInt serialization, Redux compatibility |
| `development-practices.md` | Code style, render loop prevention, best practices |
| `new-transaction-handling.md` | Transaction ID display with ExplorerLink and TxStatus |
| `desktop-qa-development.md` | Desktop QA walkthrough: config-driven architecture, sections, steps |
| `manual-test-setup.md` | Manual testing setup with live wallets on testnet |
| `hathor-snap-api-sync.md` | Snap API surface sync reference |
| `cloudflare-deploy.md` | Cloudflare Pages deployment |
| `buffer-polyfill.md` | Buffer polyfill for browser environment |
