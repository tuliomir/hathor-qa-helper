# Development Practices

## Package Management
- **Always use bun** — never npm or yarn
  - Install: `bun add <package>` or `bun add -d <package>`
  - Run scripts: `bun <script>` (e.g., `bun test`, `bun run build`)
  - Execute: `bunx <command>` instead of `npx`

## Git
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Title: 50 chars max. Body lines: 72 chars max.
- Always stage new files for commits

## Code Quality
- TypeScript: Avoid `any`, prefer `unknown` with type narrowing
- Use `@ts-expect-error` for untyped libs (not `@ts-ignore`)
- Pre-commit checks: `bun format:check && bun lint && bun run build`
- Auto-fix: `bun lint:fix && bun format`

## State Management
- **Redux for all global state** — not Context API
- Never store non-serializable objects (HathorWallet, functions, etc.)
- BigInt: store as strings in Redux, convert via selectors (see `bigint-handling.md`)
- Use custom hooks: `useWalletStore()`, `useSnapMethod()`, `useToast()`

## UI Components
- Reusable: `src/components/common/`
- Stage-specific: `src/components/stages/`
- RPC cards: `src/components/rpc/`
- Toast feedback: `const { showToast } = useToast(); showToast('Message', 'success');`
- Styling: Tailwind CSS + DaisyUI (see `design-system.md`, `daisyui-components.md`)
- Icons: react-icons (`import { MdDelete } from 'react-icons/md'`)

## Preventing Infinite Render Loops

### Selectors returning objects/arrays must use `createSelector`
```typescript
// BAD — new object every call
const selectProgress = (state: RootState) => ({ isLoading: state.scan.isLoading });

// GOOD — memoized
const selectProgress = createSelector(
  [(state: RootState) => state.scan],
  (scan) => ({ isLoading: scan.isLoading })
);
```

### Never create arrays during render
```typescript
// BAD — new array every render
const allWallets = getAllWallets();

// GOOD — memoized
const { wallets: walletsMap } = useWalletStore();
const allWallets = useMemo(() => Array.from(walletsMap.values()), [walletsMap]);
```

### Debugging
1. Check console for "Maximum update depth exceeded"
2. Look for `useEffect` hooks with unstable dependencies
3. Verify selectors use `createSelector` when returning objects/arrays

## Pitfalls we've hit

Each entry is a real bug or near miss: the symptom, the cause, and the rule that prevents it.

### Reuse the existing transaction code; don't rebuild it per screen
- **Symptom:** sending a fee-based token failed with `full validation failed: Fee amount is different than expected (amount=0, expected=1)`.
- **Cause:** a new stage built its own send template. wallet-lib only adds the fee when the complete action has `calculateFee: true`; five other screens had copied the same template without it, and one (CustomTokens) had hand-rolled a token-version check to decide the flag.
- **Rule:** build every "send outputs, return change" transaction with `buildTransferTemplate` (`services/tokenTransfer.ts`, see `tx-template.md`). Before writing transaction, fee or token logic, grep for an existing helper (`services/`, `utils/`, `hooks/`) and read what wallet-lib already does. wallet-lib is the battle-tested code; prefer its behaviour over app-side rules. If you find the same logic in two places, move it into one module instead of adding a third copy.

### Run the dev server on Node, not Bun
- **Symptom:** wallets stayed "syncing" forever; HTTP to the fullnode worked.
- **Cause:** fullnode traffic goes through the Vite proxy (`/hathor-node/*`), and the wallet needs its websocket. `bun x vite` without `node` on `PATH` (as in a systemd unit) shims `node` with Bun, whose proxy never answers the websocket upgrade. `ps` still shows `node`.
- **Rule:** `bun` is the package manager and script runner; Vite runs on Node (`#!/usr/bin/env node`), as `bun dev` does. `scripts/qa-helper.sh` puts the real Node on the unit's `PATH`. To check a process, read `readlink /proc/<pid>/exe`, not `ps`.

### Scroll containers must be positioned
- **Symptom:** a white band under the app; the top bar and the end of the nav scrolled out of view, on some stages and window heights only.
- **Cause:** `sr-only` labels are `position: absolute`. `overflow: hidden/auto` contains absolute descendants only if the overflow box (or something between) is positioned. Without that they resolve against the page and make it taller than the `h-dvh` shell, so the page scrolls.
- **Rule:** the shell's nav and content slots are `relative overflow-hidden` (`components/shell/AppShell.tsx`); keep it, and give any new scroll container `relative`. To test, check `document.scrollingElement.scrollHeight === innerHeight` on every stage at several window heights, with inner panes scrolled both to the top and to the bottom. A sweep at one height missed the nav case.

### Wallet events must not swap content for a loading state
- **Symptom:** the stage scrolls back up when a transaction arrives (seen on Address validation).
- **Cause:** every wallet event replaces the wallet's Redux record (events, balance), so effects keyed on the whole record (`[wallet]`, `[testWallet]`) re-run. Address validation then re-derived its address and hid the sections below behind "Loading address…"; the pane shrank for a frame and its scroll was clamped.
- **Rule:** key effects on what they read: `wallet?.instance` for address derivation, which no transaction changes. An effect that must reload on events keeps its old content on screen while it does (`loading` only while there is nothing to show). `e2e/wallet-event-scroll.spec.ts` checks Address validation; it starts a testnet wallet and reaches app modules by dev-server URL, so run it against a dev server.

### Prove a check can fail before trusting it
- A clean sweep only counts if it would have caught the bug: run it once with the fix reverted. Doing that here is what showed the first shell fix covered the content pane but not the nav.

### Don't disturb the QA's running app
- The user tests from the main checkout (`helper:up`: client :5173, QA server :5180, tailnet :8443). Any edit there hot-reloads their app and can drop running wallets; `git stash`, `git switch` and `helper:down/up` do too.
- Develop in a sibling worktree (`~/code/qa-helper-dev`, branch `dev`) on other ports: `QA_SERVER_PORT=5181 bun src/index.ts` in `apps/server`, `QA_SERVER_PORT=5181 bun x vite --port 5174` in `apps/client`. `vite.config.ts` reads `QA_SERVER_PORT` for its `/qa-server` proxy; without it the copy talks to the user's QA server. localStorage is per origin, so wallets don't mix.
- Switching branches rewrites files under a running dev server. A branch without the `QA_SERVER_PORT` change silently pointed the worktree's proxy back at the user's server.
- Playwright e2e (`playwright.config.ts`) targets :5173, the user's app; don't run it while they work.
- Merge into `main` only when asked, after typecheck, test, lint and build pass.

### Amount fields go through `AmountInput`
- Plain amount inputs drift from the convention: Multisig parsed decimals with `parseFloat(amount) * 100` while every other field took base units. Use `AmountInput` (digits enter from the right: `500` → `5.00`; see `design-system.md` → Amounts) and keep amounts as base-unit strings.

### Run tests with `bun run test`
- A bare `bun test` in `apps/client` also loads the Playwright specs in `e2e/` and fails with `Playwright Test did not expect test.use() to be called here`. The workspace script runs only `tests/`.
