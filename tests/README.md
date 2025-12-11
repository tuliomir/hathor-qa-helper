# Smoke Test Suite

This directory contains smoke tests for the Hathor QA Helper application using Bun's built-in test runner.

## Overview

Smoke tests verify that critical functionality works at a basic level. This conservative test suite focuses on:

- **Utility Functions**: Pure functions with no external dependencies
- **Constants**: Configuration values and network settings
- **Core Business Logic**: Transaction status determination and formatting

## Test Structure

Tests are organized by module:

- `balanceUtils.test.ts` - Balance formatting utilities
- `valuesUtils.test.ts` - Time formatting utilities
- `transactionStatus.test.ts` - Transaction status and styling logic
- `network.test.ts` - Network configuration constants

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/balanceUtils.test.ts

# Run with coverage (if configured)
bun test --coverage
```

## Test Conventions

- Tests use Bun's native test runner (`bun:test`)
- Test files follow the pattern `*.test.ts`
- Each test file focuses on a single module
- Tests are descriptive and follow the Arrange-Act-Assert pattern

## Expanding the Test Suite

This is a conservative initial test suite. It can be expanded to include:

- **Redux Store Tests**: Slice reducers, selectors, and state management
- **Component Tests**: React component rendering and interaction
- **Integration Tests**: Multi-module workflows
- **Service Tests**: RPC handlers and WalletConnect integration
- **Hook Tests**: Custom React hooks behavior
- **E2E Tests**: Full user workflows

When adding new tests, maintain the same structure and conventions established here.

## Dependencies

Tests use only Bun's built-in test runner - no additional testing libraries required.
