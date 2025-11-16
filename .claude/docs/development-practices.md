# Development Practices

## Git
- Add new files immediately: `git add path/to/file.ts`
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## Code Quality
- TypeScript: Avoid `any`, use `@ts-expect-error` for untyped libs
- Pre-commit: `yarn build && yarn lint && yarn format:check`
- Auto-fix: `yarn lint:fix && yarn format`

## State Management
- Never store non-serializable objects in Redux
- Use custom hooks for state access
- See `wallet-state-management.md`

## Performance
- Monitor bundle size
- Use dynamic imports for large/rare components
- Check re-renders with React DevTools Profiler

## Security
- No sensitive data in commits
- Use env vars for config
- Run `yarn audit` periodically
