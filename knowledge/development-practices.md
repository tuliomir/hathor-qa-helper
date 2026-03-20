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
