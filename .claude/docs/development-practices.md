# Development Practices

## Package Management
- **Always use bun** (not npm or yarn)
  - Install: `bun add <package>` or `bun add -d <package>` for dev deps
  - Run scripts: `bun <script>` (e.g., `bun test`, `bun build`)
  - Execute: `bunx <command>` instead of `npx`

## Git
- Add all new files at the end of the session: `git add path/to/file.ts`
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## Code Quality
- TypeScript: Avoid `any`, use `@ts-expect-error` for untyped libs
- When `unknown` is necessary, cast the type at usage time
- Pre-commit: `bun format:check && bun lint && bun run build`
- Auto-fix: `bun lint:fix && bun format`

## State Management
- **Always use Redux** for global state (not Context API)
- Never store non-serializable objects in Redux
- **BigInt values**: Store as strings in Redux, convert to BigInt for operations
  - See `bigint-handling.md` for detailed patterns
- Use custom hooks for state access (e.g., `useToast`, `useWalletStore`)
- See `wallet-state-management.md`

## UI Components
- **Reusable components**: Store in `src/components/common/`
- **Stage-specific**: Store in `src/components/stages/`
- **Global feedback**: Use `useToast()` hook (success/error/warning/info)
  - Example: `const { success } = useToast(); success('Copied!');`
- **Styling**: Use Tailwind CSS + DaisyUI components
  - Custom classes defined in `src/index.css` (@layer components)
  - See `daisyui-components.md` for available components
  - Docs: https://daisyui.com/components/
- **Icons**: Use react-icons library
  - Import from `react-icons/md` for Material Design icons
  - Example: `import { MdDelete } from 'react-icons/md';`

## Performance
- Monitor bundle size
- Use dynamic imports for large/rare components
- Check re-renders with React DevTools Profiler

### Preventing Infinite Render Loops

**Symptom**: CPU spikes, "Maximum update depth exceeded" errors in console.

#### 1. Redux Selectors Must Use `createSelector`

Selectors that return objects/arrays create new references on every call, causing re-renders:

```tsx
// ❌ BAD - Creates new object every call, triggers re-render loop
export const selectProgress = (state: RootState) => ({
  isLoading: state.scan.isLoading,
  progress: state.scan.progress,
});

// ✅ GOOD - Memoized, only creates new object when inputs change
import { createSelector } from '@reduxjs/toolkit';

export const selectProgress = createSelector(
  [(state: RootState) => state.scan],
  (scan) => ({
    isLoading: scan.isLoading,
    progress: scan.progress,
  })
);
```

#### 2. Never Call Array-Creating Functions During Render

Functions that create new arrays must be memoized:

```tsx
// ❌ BAD - getAllWallets() returns new array every render
const allWallets = getAllWallets();

useEffect(() => {
  // This runs EVERY render because allWallets is always new
  loadData(allWallets);
}, [allWallets]);

// ✅ GOOD - Memoize the array based on stable input
const { wallets: walletsMap } = useWalletStore();
const allWallets = useMemo(
  () => Array.from(walletsMap.values()),
  [walletsMap]
);
```

#### 3. Debug Render Loops

1. Check console for "Maximum update depth exceeded"
2. Use Playwright's `browser_console_messages` to capture errors
3. Look for `useEffect` hooks with unstable dependencies
4. Verify selectors use `createSelector` when returning objects/arrays

## Security
- No sensitive data in commits
- Use env vars for config
- Run `bun audit` periodically

## Documentation
- Optimize Claude documentation for token usage, while maintaining clarity
