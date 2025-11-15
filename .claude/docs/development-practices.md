# Development Practices & Guidelines

This document contains development practices and guidelines for the Hathor QA Helper project.

## Git Workflow

### File Management

**IMPORTANT**: Every new file created during development should be added to git immediately after creation.

**Practice**:
```bash
# After creating new files, always add them to git
git add path/to/new/file.ts
```

**Rationale**:
- Ensures all new work is tracked
- Prevents accidental omission of important files
- Makes it easier to review changes
- Maintains a complete project history

**Examples**:

When creating new Redux slices:
```bash
# After creating the files
git add src/store/slices/walletStoreSlice.ts
git add src/store/slices/stageSlice.ts
git add src/store/index.ts
git add src/store/hooks.ts
```

When creating new components:
```bash
git add src/components/NewComponent.tsx
```

When creating new documentation:
```bash
git add .claude/docs/new-documentation.md
```

### Commit Guidelines

- Create meaningful commit messages that describe what was changed and why
- Group related changes together in a single commit
- Use conventional commit format when possible:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `refactor:` for code refactoring
  - `test:` for test additions/changes
  - `chore:` for maintenance tasks

## Code Organization

### File Structure

- Keep related files together (e.g., all Redux slices in `src/store/slices/`)
- Use clear, descriptive file names
- Follow existing naming conventions in the project

### TypeScript

- Always add proper type definitions
- Avoid using `any` type
- Use `@ts-expect-error` with comments for third-party libraries without types

### State Management

- Follow the Redux Toolkit patterns documented in `wallet-state-management.md`
- Never store non-serializable objects in Redux state
- Use custom hooks for accessing state

## Documentation

### When to Update Documentation

Update documentation when:
- Architecture changes (update `architecture.md`)
- State management patterns change (update `wallet-state-management.md`)
- New development practices are established (update this file)
- New dependencies are added (update `architecture.md` dependencies section)

### Documentation Standards

- Use clear, concise language
- Include code examples
- Mark anti-patterns clearly with ❌
- Mark correct patterns with ✅
- Keep documentation up-to-date with code changes

## Testing

### Before Committing

Always run before committing:
```bash
# Type check and build
yarn build

# Lint check
yarn lint

# Format check
yarn format:check
```

### Fix Issues

If there are issues, fix them:
```bash
# Auto-fix linting issues
yarn lint:fix

# Auto-format code
yarn format
```

## Code Quality

### Linting

- Follow ESLint rules configured in the project
- Run `yarn lint:fix` before committing
- Fix all linting errors before committing
- Don't disable linting rules without good reason

### Formatting

- Use Prettier for consistent code formatting
- Run `yarn format` before committing
- Use consistent indentation (configured in Prettier)

### Code Review

Before submitting changes:
- Review your own changes first
- Check for console.log statements
- Ensure no commented-out code
- Verify imports are used
- Check for proper error handling

## Performance

### Bundle Size

- Be mindful of bundle size when adding dependencies
- Use dynamic imports for large, rarely-used components
- Monitor bundle size warnings during build

### Re-renders

- Use React DevTools Profiler to check for unnecessary re-renders
- Follow state management best practices
- Use memoization when appropriate (React.memo, useMemo, useCallback)

## Security

### Sensitive Data

- Never commit sensitive data (API keys, credentials, etc.)
- Use environment variables for configuration
- Add sensitive files to `.gitignore`

### Dependencies

- Keep dependencies up-to-date
- Review dependency security advisories
- Use `yarn audit` to check for vulnerabilities
