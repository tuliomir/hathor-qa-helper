# Smoke Test Suite

This directory contains smoke tests for the Hathor QA Helper application using Bun's built-in test runner.

## Overview

Smoke tests verify that critical functionality works at a basic level. This test suite covers:

- **Utility Functions**: Pure functions with no external dependencies
- **Constants**: Configuration values and network settings
- **Redux Slices**: State management reducers and actions
- **Type Definitions**: Stage configuration and type structures
- **Core Business Logic**: Transaction status determination, formatting, and navigation

## Test Structure

Tests are organized by module:

### Utility Tests
- `balanceUtils.test.ts` - Balance formatting utilities
- `valuesUtils.test.ts` - Time formatting utilities
- `walletUtils.test.ts` - Wallet operations (seed validation, word suggestions)
- `betHelpers.test.ts` - Bet nano contract helpers (BigInt-safe JSON stringify)
- `transactionStatus.test.ts` - Transaction status and styling logic

### Redux Slice Tests
- `stageSlice.test.ts` - Stage navigation and scroll position management
- `toastSlice.test.ts` - Toast notification state management
- `navigationSlice.test.ts` - Cross-stage navigation data passing

### Configuration & Type Tests
- `network.test.ts` - Network configuration constants (testnet/mainnet)
- `walletConnect.test.ts` - WalletConnect configuration constants
- `stage.test.ts` - Stage types, groups, and helper functions

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/balanceUtils.test.ts

# Run tests matching a pattern
bun test tests/slice

# Run with verbose output
bun test --verbose
```

## Test Conventions

- Tests use Bun's native test runner (`bun:test`)
- Test files follow the pattern `*.test.ts`
- Each test file focuses on a single module
- Tests are descriptive and follow the Arrange-Act-Assert pattern
- Test names describe what is being tested and expected behavior

### Example Test Structure

```typescript
import { describe, test, expect } from 'bun:test';
import { myFunction } from '../src/utils/myModule';

describe('myModule', () => {
  describe('myFunction', () => {
    test('returns expected result for valid input', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = myFunction(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Test Categories

### 1. Unit Tests (Current)
Pure function testing with no external dependencies:
- Utility functions
- Redux reducers (synchronous logic)
- Type validators
- Configuration constants

### 2. Future Expansion
This test suite can be expanded to include:

- **Integration Tests**: Multi-module workflows
- **Component Tests**: React component rendering and interaction (requires testing library setup)
- **Hook Tests**: Custom React hooks behavior (requires testing library setup)
- **Service Tests**: RPC handlers and WalletConnect integration (requires mocking)
- **E2E Tests**: Full user workflows (requires browser automation)

## Coverage

Current test coverage includes:

| Module | Coverage |
|--------|----------|
| `utils/balanceUtils.ts` | Full |
| `utils/valuesUtils.ts` | Full |
| `utils/walletUtils.ts` | Partial (didYouMean function) |
| `utils/betHelpers.ts` | Full (safeStringify) |
| `utils/transactionStatus.ts` | Full |
| `constants/network.ts` | Full |
| `constants/walletConnect.ts` | Full |
| `types/stage.ts` | Full |
| `store/slices/stageSlice.ts` | Full |
| `store/slices/toastSlice.ts` | Full |
| `store/slices/navigationSlice.ts` | Full |

## Adding New Tests

When adding new tests, follow these guidelines:

1. Create a new test file: `tests/<module>.test.ts`
2. Import from `bun:test`: `import { describe, test, expect } from 'bun:test'`
3. Import the module being tested from `../src/...`
4. Group related tests with `describe` blocks
5. Use descriptive test names that explain the expected behavior
6. Follow the Arrange-Act-Assert pattern

## Dependencies

Tests use only Bun's built-in test runner - no additional testing libraries required.

For component testing, consider adding:
- `@testing-library/react` - React component testing
- `@testing-library/user-event` - User interaction simulation
- `happy-dom` or `jsdom` - DOM environment
