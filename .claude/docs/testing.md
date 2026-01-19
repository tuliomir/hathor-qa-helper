# Testing Guide

This document describes the testing infrastructure and practices for the Hathor QA Helper application.

## Overview

The project uses Bun's built-in test runner for all tests. Tests are located in the `/tests` directory and follow a modular structure that mirrors the source code organization.

## Test Runner

**Bun Test** is the native test runner used by this project. It provides:
- Fast execution with Bun's JavaScript runtime
- Built-in TypeScript support
- Jest-compatible API (`describe`, `test`, `expect`)
- Watch mode for development
- No additional dependencies required

## Running Tests

```bash
# Run all tests
bun test

# Watch mode (re-run on file changes)
bun test --watch

# Run specific test file
bun test tests/balanceUtils.test.ts

# Run tests matching a pattern
bun test --filter "stageSlice"

# Verbose output
bun test --verbose
```

## Test Organization

Tests are organized into categories matching the source code structure:

### Utility Tests (`tests/*Utils.test.ts`)

Test pure utility functions with no external dependencies:

- **balanceUtils.test.ts**: Balance formatting (`formatBalance`)
- **valuesUtils.test.ts**: Time formatting (`formatTimeUntil`)
- **walletUtils.test.ts**: Wallet operations (`didYouMean` for typo correction)
- **betHelpers.test.ts**: Nano contract utilities (`safeStringify` for BigInt handling)
- **transactionStatus.test.ts**: Transaction status determination and styling

### Redux Slice Tests (`tests/*Slice.test.ts`)

Test Redux reducers and actions:

- **stageSlice.test.ts**: Stage navigation, scroll position management
- **toastSlice.test.ts**: Toast notification state (add/remove)
- **navigationSlice.test.ts**: Cross-stage navigation data
- **multisigSlice.test.ts**: Multisig wallet management, transaction flow, memoized selectors

### Configuration Tests (`tests/*.test.ts`)

Test constants and type definitions:

- **network.test.ts**: Network configuration (testnet/mainnet URLs, blueprint IDs)
- **walletConnect.test.ts**: WalletConnect configuration (chains, relay URL)
- **stage.test.ts**: Stage types, groups, and helper functions

## Writing Tests

### Basic Structure

```typescript
import { describe, test, expect } from 'bun:test';
import { myFunction } from '../src/utils/myModule';

describe('myModule', () => {
  describe('myFunction', () => {
    test('handles valid input correctly', () => {
      const result = myFunction('input');
      expect(result).toBe('expected');
    });

    test('handles edge cases', () => {
      expect(myFunction(null)).toBe('');
    });
  });
});
```

### Testing Redux Reducers

```typescript
import { describe, test, expect } from 'bun:test';
import reducer, { actionCreator } from '../src/store/slices/mySlice';

describe('mySlice', () => {
  const initialState = { /* ... */ };

  test('handles action correctly', () => {
    const state = reducer(initialState, actionCreator(payload));
    expect(state.someField).toBe(expectedValue);
  });
});
```

### Testing Constants

```typescript
import { describe, test, expect } from 'bun:test';
import { MY_CONSTANT, CONFIG } from '../src/constants/myConfig';

describe('myConfig constants', () => {
  test('MY_CONSTANT has correct value', () => {
    expect(MY_CONSTANT).toBe('expected-value');
  });

  test('CONFIG has required properties', () => {
    expect(CONFIG.requiredProp).toBeDefined();
    expect(typeof CONFIG.requiredProp).toBe('string');
  });
});
```

### Testing Memoized Selectors

When testing selectors that use `createSelector` for memoization, create a mock `RootState`:

```typescript
import { describe, test, expect } from 'bun:test';
import reducer, { selectItems, selectFilteredItems } from '../src/store/slices/mySlice';
import type { RootState } from '../src/store';

// Helper to create mock RootState with slice state
const createMockRootState = (sliceState: ReturnType<typeof reducer>): RootState => ({
  mySlice: sliceState,
} as RootState);

describe('selectors', () => {
  test('selectItems returns array of items', () => {
    const state = reducer(undefined, { type: 'unknown' });
    const rootState = createMockRootState(state);
    const items = selectItems(rootState);

    expect(Array.isArray(items)).toBe(true);
  });

  test('selectFilteredItems filters correctly', () => {
    let state = reducer(undefined, { type: 'unknown' });
    state = reducer(state, addItem({ status: 'ready' }));
    state = reducer(state, addItem({ status: 'pending' }));

    const rootState = createMockRootState(state);
    const readyItems = selectFilteredItems(rootState);

    expect(readyItems.every((item) => item.status === 'ready')).toBe(true);
  });
});
```

## Test Patterns

### 1. Arrange-Act-Assert

All tests follow the AAA pattern:

```typescript
test('formats balance correctly', () => {
  // Arrange
  const balance = BigInt(123456);
  const decimals = 2;

  // Act
  const result = formatBalance(balance, decimals);

  // Assert
  expect(result).toContain('1,234.56');
});
```

### 2. Edge Case Testing

Always test edge cases:

```typescript
test('handles null input', () => {
  expect(myFunction(null)).toBe('');
});

test('handles empty string', () => {
  expect(myFunction('')).toBe('');
});

test('handles very large values', () => {
  const huge = BigInt('999999999999999999');
  expect(myFunction(huge)).toBeDefined();
});
```

### 3. Type Validation

Test that types and structures are correct:

```typescript
test('all groups have required properties', () => {
  STAGE_GROUPS.forEach((group) => {
    expect(group.id).toBeDefined();
    expect(group.title).toBeDefined();
    expect(Array.isArray(group.stages)).toBe(true);
  });
});
```

### 4. Workflow/Flow Simulation

Test complete workflows by chaining multiple reducer actions:

```typescript
describe('transaction flow simulation', () => {
  test('complete flow from idle to complete', () => {
    let state = getInitialState();

    // Setup: mark participants ready
    state = reducer(state, updateStatus({ id: 'p1', status: 'ready' }));
    state = reducer(state, updateStatus({ id: 'p2', status: 'ready' }));

    // Select signers
    state = reducer(state, toggleSigner('p1'));
    state = reducer(state, toggleSigner('p2'));
    expect(state.selectedSigners.length).toBe(2);

    // Create transaction
    state = reducer(state, setStep('creating'));
    state = reducer(state, setTxHex('0001020304'));
    state = reducer(state, setStep('signing'));

    // Collect signatures
    state = reducer(state, addSignature({ id: 'p1', sig: 'sig1' }));
    state = reducer(state, addSignature({ id: 'p2', sig: 'sig2' }));
    expect(state.signatures.length).toBe(2);

    // Complete
    state = reducer(state, setResult({ hash: 'txhash' }));
    state = reducer(state, setStep('complete'));

    expect(state.step).toBe('complete');
    expect(state.result?.hash).toBe('txhash');
  });

  test('flow with error handling', () => {
    let state = getInitialState();
    state = reducer(state, setStep('creating'));
    state = reducer(state, setError('Insufficient funds'));

    expect(state.step).toBe('error');
    expect(state.error).toBe('Insufficient funds');
  });
});
```

## Coverage

The current test suite covers:

| Category       | Modules Tested | Coverage Level            |
|----------------|----------------|---------------------------|
| Utilities      | 5 modules      | Core functions            |
| Redux Slices   | 4 slices       | Reducers + selectors      |
| Constants      | 2 modules      | All exported values       |
| Types          | 1 module       | Functions + structures    |

## Expanding Tests

When adding new functionality:

1. **Create test file**: `tests/<module>.test.ts`
2. **Import test utilities**: `import { describe, test, expect } from 'bun:test'`
3. **Import module under test**: `import { fn } from '../src/...'`
4. **Write descriptive tests**: Cover happy path and edge cases
5. **Run tests**: `bun test` to verify

### Future Testing Additions

The test suite can be expanded to include:

- **Component Tests**: Using `@testing-library/react` with `happy-dom`
- **Hook Tests**: Testing custom React hooks
- **Integration Tests**: Testing multi-module workflows
- **Service Tests**: Mocking WalletConnect for RPC handler tests
- **E2E Tests**: Browser automation with Playwright

## Best Practices

1. **Test behavior, not implementation**: Focus on what functions do, not how
2. **Keep tests independent**: Each test should run in isolation
3. **Use descriptive names**: Test names should explain the expected behavior
4. **Don't test external libraries**: Trust that Redux Toolkit, React, etc. work correctly
5. **Avoid testing private functions**: Only test public API
6. **Keep tests fast**: Avoid timeouts, network calls, or file I/O in unit tests

## Debugging Tests

```bash
# Run single test with full output
bun test tests/myModule.test.ts --verbose

# Run tests matching pattern
bun test --filter "specific test name"
```

## CI/CD Integration

Tests should run on every PR and merge to main:

```yaml
# Example GitHub Actions step
- name: Run tests
  run: bun test
```
