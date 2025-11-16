# BigInt Handling in Hathor QA Helper

## Overview

The Hathor wallet library uses **BigInt** for all token amounts (balances, transaction values, etc.) to handle large numbers and avoid floating-point precision issues. This document explains how to properly handle BigInt values in the QA Helper application.

## Why BigInt?

- Cryptocurrency amounts can be very large (beyond JavaScript's `Number.MAX_SAFE_INTEGER`)
- Precise arithmetic is critical for financial calculations
- The Hathor wallet library returns all amounts as BigInt

## Storage Strategy

**Decision: Store as strings in Redux, expose as BigInt via selectors**

This QA helper uses a two-layer approach:

1. **Redux Layer**: Balances stored as **strings** (for serializability)
2. **Application Layer**: Balances exposed as **BigInt** (via selectors)

### Benefits:

1. **Type Safety** - TypeScript enforces `bigint` throughout the app
2. **Consistency** - Everything from wallet-lib is BigInt, everything in app is BigInt
3. **Less Error-Prone** - No manual conversions in components
4. **Future-Proof** - Works for all BigInt fields (amounts, locked balances, tx values, etc.)
5. **Redux Best Practices** - State remains serializable
6. **Better DX** - Components just use BigInt values directly

## Implementation Patterns

### 1. Type Definitions

```typescript
// WalletInfo type - what components work with (BigInt balance)
interface WalletInfo {
  metadata: WalletMetadata;
  instance: HathorWallet | null;
  status: WalletStatus;
  firstAddress?: string;
  balance?: bigint; // BigInt for type safety and consistency with wallet-lib
  error?: string;
}

// StoredWalletInfo - what Redux stores (string balance)
interface StoredWalletInfo {
  metadata: WalletMetadata;
  instance: null;
  status: WalletStatus;
  firstAddress?: string;
  balance?: string; // Stored as string for serializability
  error?: string;
}
```

### 2. Fetching and Storing Balance (Redux Slice)

```typescript
// In walletStoreSlice.ts - startWallet thunk
const balanceData = await walletInstance.getBalance(selectedTokenUid);
const balanceBigInt = balanceData?.[0]?.balance?.unlocked || 0n;

// Convert BigInt to string for Redux storage
const balanceString = balanceBigInt.toString();

dispatch(updateWalletBalance({ id: walletId, balance: balanceString }));
```

### 3. Selectors Convert String → BigInt

```typescript
// In walletStoreSelectors.ts
function convertWalletData(
  walletData: StoredWalletInfo,
  instance: WalletInfo['instance']
): WalletInfo {
  return {
    ...walletData,
    instance,
    // Convert string balance to BigInt
    balance: walletData.balance ? BigInt(walletData.balance) : undefined,
  };
}

export const selectWalletById = (state: RootState, id: string): WalletInfo | undefined => {
  const walletInfo = state.walletStore.wallets[id];
  if (!walletInfo) return undefined;

  return convertWalletData(
    walletInfo,
    walletInstancesMap.get(id) || null
  );
};
```

### 4. Components Work with BigInt Directly

```typescript
import { formatBalance } from '../../utils/balanceUtils';

// Get wallet from hook (already has BigInt balance via selector)
const { getAllWallets } = useWalletStore();
const wallets = getAllWallets();

// Balance is already BigInt - no conversion needed!
const wallet = wallets[0];

// Direct BigInt arithmetic
const total = wallet1.balance + wallet2.balance;
const difference = wallet1.balance - wallet2.balance;

// Format for display
const formattedBalance = formatBalance(wallet.balance);
// Returns: "1,234.56" (using wallet-lib's prettyValue)
```

### 5. Comparison Operations

```typescript
// Direct BigInt comparisons (no conversion needed)
if (wallet.balance > 0n) {
  // Wallet has funds
}

if (wallet.balance === 0n) {
  // Wallet is empty
}

// Comparing two balances
if (wallet1.balance > wallet2.balance) {
  // wallet1 has more funds
}
```

### 6. Sorting Wallets by Balance

```typescript
// Sort by highest balance (descending)
const sortedDesc = [...wallets].sort((a, b) => {
  const balanceA = a.balance || 0n;
  const balanceB = b.balance || 0n;

  if (balanceA > balanceB) return -1;
  if (balanceA < balanceB) return 1;
  return 0;
});

// Sort by lowest balance (ascending)
const sortedAsc = [...wallets].sort((a, b) => {
  const balanceA = a.balance || 0n;
  const balanceB = b.balance || 0n;

  if (balanceA < balanceB) return -1;
  if (balanceA > balanceB) return 1;
  return 0;
});
```

### 7. Displaying Balance in UI

```typescript
import { formatBalance } from '../../utils/balanceUtils';

// Balance is BigInt from selector
<div>
  Balance: {formatBalance(wallet.balance)} HTR
</div>

// formatBalance uses wallet-lib's prettyValue internally
// Returns: "1,234.56" with proper decimals and thousand separators
```

## Common Pitfalls

### ❌ DON'T: Mix BigInt with Number

```typescript
// WRONG - TypeError: Cannot mix BigInt and other types
const balance = wallet.balance; // BigInt
const display = balance / 100; // ERROR!
```

### ✅ DO: Use formatBalance() or wallet-lib utilities

```typescript
// CORRECT - Use formatBalance utility
const display = formatBalance(wallet.balance);

// OR use wallet-lib directly
import { numberUtils } from '@hathor/wallet-lib';
const display = numberUtils.prettyValue(wallet.balance, decimalPlaces);
```

### ❌ DON'T: Manually convert in components

```typescript
// WRONG - Selector already does this!
const balance = BigInt(wallet.balance || '0');
```

### ✅ DO: Trust the selector

```typescript
// CORRECT - balance is already BigInt from selector
const balance = wallet.balance || 0n;
```

### ❌ DON'T: Use JSON.stringify() with BigInt

```typescript
// WRONG - TypeError: Do not know how to serialize a BigInt
const data = { balance: 12345n };
JSON.stringify(data); // ERROR!
```

### ✅ DO: Use JSONBigInt from wallet-lib

```typescript
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';

const data = { balance: 12345n };
const json = JSONBigInt.stringify(data);
// Works correctly with BigInt values
```

## Decimal Places

- **Native HTR token**: 2 decimal places (100 = 1 HTR, like cents)
- **Custom tokens**: Varies (typically 0-8 decimal places)
- **NFTs**: 0 decimal places (always whole numbers)

The `formatBalance()` utility (via `numberUtils.prettyValue()`) handles decimal conversion automatically:

```typescript
// balance = 12345n, decimalPlaces = 2
formatBalance(12345n, 2) // "123.45"

// balance = 12345n, decimalPlaces = 0 (NFT)
formatBalance(12345n, 0) // "12,345"
```

## Wallet-lib Utilities

Import from `@hathor/wallet-lib`:

```typescript
import { numberUtils } from '@hathor/wallet-lib';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';
import { NATIVE_TOKEN_UID, DEFAULT_NATIVE_TOKEN_CONFIG } from '@hathor/wallet-lib/lib/constants';
```

### numberUtils.prettyValue()

```typescript
numberUtils.prettyValue(
  balanceBigInt,    // BigInt value
  decimalPlaces     // Number of decimals (0-8)
)
// Returns: formatted string like "1,234.56789000"
```

### JSONBigInt.stringify()

```typescript
JSONBigInt.stringify(
  objectWithBigInt, // Object containing BigInt values
  indent            // Optional: spaces for indentation (default 0)
)
// Returns: JSON string with BigInt values serialized
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Wallet Library (getBalance)                              │
│    Returns: { balance: { unlocked: 998703n } }              │
│    Type: BigInt                                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Redux Slice (startWallet thunk)                          │
│    Converts: balanceBigInt.toString()                       │
│    Stores: "998703"                                          │
│    Type: string (serializable)                               │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Selector (convertWalletData)                             │
│    Converts: BigInt(walletData.balance)                     │
│    Returns: WalletInfo { balance: 998703n }                 │
│    Type: BigInt                                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Components (via useWalletStore hook)                     │
│    Uses: wallet.balance (BigInt)                            │
│    Operations: +, -, >, <, === (all work natively)          │
│    Display: formatBalance(wallet.balance)                   │
└─────────────────────────────────────────────────────────────┘
```

## Reference Implementation

See these files for complete examples:
- `/src/types/walletStore.ts` - WalletInfo type definition (balance as BigInt)
- `/src/store/slices/walletStoreSlice.ts` - StoredWalletInfo and balance fetching
- `/src/store/selectors/walletStoreSelectors.ts` - String to BigInt conversion
- `/src/hooks/useWalletStore.ts` - Hook using selectors
- `/src/utils/balanceUtils.ts` - Display formatting utilities
- `/src/components/stages/WalletInitialization.tsx` - Balance display and sorting
- `/src/components/QALayout.tsx` - Header balance display

## Key Takeaways

1. **Never manually convert** - Selectors handle string → BigInt conversion
2. **Work with BigInt everywhere** - Components, calculations, comparisons
3. **Only format for display** - Use `formatBalance()` for UI
4. **Redux stores strings** - But you never touch them directly
5. **Type system helps** - TypeScript enforces correct usage
