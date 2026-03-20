# Testing Guide

## Test Runner

**Bun Test** — native test runner with Jest-compatible API. No additional dependencies.

## Commands

```bash
bun test               # Run all unit tests (tests/ directory)
bun test --watch       # Watch mode
bun test tests/file.test.ts  # Single file
bun test --filter "pattern"  # Filter by name

bun run test:e2e       # Playwright e2e tests (e2e/ directory)
bun run test:e2e:headed    # Headed mode (visible browser)
bun run test:e2e:debug     # Debug mode
bun run test:e2e:report    # Show HTML report
```

**Important**: `bun test` runs from `tests/` dir. Playwright tests live in `e2e/` and use separate config (`playwright.config.ts`).

## Unit Test Organization

Tests in `tests/` mirror the source structure:

| Category | Files | What's Tested |
|----------|-------|---------------|
| Utilities | `balanceUtils`, `valuesUtils`, `walletUtils`, `betHelpers`, `transactionStatus` | Pure functions |
| Redux Slices | `stageSlice`, `toastSlice`, `navigationSlice`, `multisigSlice` | Reducers + selectors |
| Config | `network`, `walletConnect`, `stage` | Constants + types |

## Writing Tests

```typescript
import { describe, test, expect } from 'bun:test';
import { myFunction } from '../src/utils/myModule';

describe('myFunction', () => {
  test('handles valid input', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### Testing Redux Slices

```typescript
import reducer, { actionCreator } from '../src/store/slices/mySlice';

test('handles action', () => {
  const state = reducer(initialState, actionCreator(payload));
  expect(state.field).toBe(expected);
});
```

### Testing Memoized Selectors

```typescript
const createMockRootState = (sliceState: ReturnType<typeof reducer>): RootState =>
  ({ mySlice: sliceState } as RootState);

test('selector filters correctly', () => {
  let state = reducer(undefined, { type: 'unknown' });
  state = reducer(state, addItem({ status: 'ready' }));
  expect(selectFiltered(createMockRootState(state)).every(i => i.status === 'ready')).toBe(true);
});
```

## E2E Tests (Playwright)

Located in `e2e/`. Config in `playwright.config.ts`.

Projects:
- `dev` — tests against `localhost:5173`
- `preview` — tests against preview deployment (`SMOKE_ENV=preview`)

See `playwright-debugging.md` for debugging workflows.

## Best Practices

- Test behavior, not implementation
- Keep tests independent — each runs in isolation
- Always test edge cases (null, empty, large values)
- Don't mock wallet-lib or Redux Toolkit internals — trust framework guarantees
- Use `--filter` to run targeted tests during development
