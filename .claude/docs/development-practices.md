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

## Security
- No sensitive data in commits
- Use env vars for config
- Run `bun audit` periodically

## Documentation
- Optimize Claude documentation for token usage, while maintaining clarity
