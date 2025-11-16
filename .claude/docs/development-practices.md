# Development Practices

## Git
- Add new files immediately: `git add path/to/file.ts`
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## Code Quality
- TypeScript: Avoid `any`, use `@ts-expect-error` for untyped libs
- Pre-commit: `yarn build && yarn lint && yarn format:check`
- Auto-fix: `yarn lint:fix && yarn format`

## State Management
- **Always use Redux** for global state (not Context API)
- Never store non-serializable objects in Redux
- Use custom hooks for state access (e.g., `useToast`, `useWalletStore`)
- See `wallet-state-management.md`

## UI Components
- **Reusable components**: Store in `src/components/common/`
- **Stage-specific**: Store in `src/components/stages/`
- **Global feedback**: Use `useToast()` hook (success/error/warning/info)
- Example: `const { success } = useToast(); success('Copied!');`

## Performance
- Monitor bundle size
- Use dynamic imports for large/rare components
- Check re-renders with React DevTools Profiler

## Security
- No sensitive data in commits
- Use env vars for config
- Run `yarn audit` periodically
