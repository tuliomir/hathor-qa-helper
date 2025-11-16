# BigInt Handling in Hathor QA Helper

## Overview

The Hathor wallet library uses **BigInt** for all token amounts (balances, transaction values, etc.) to handle large numbers and avoid floating-point precision issues. This document explains how to properly handle BigInt values in the QA Helper application.

## Why BigInt?

- Cryptocurrency amounts can be very large (beyond JavaScript's `Number.MAX_SAFE_INTEGER`)
- Precise arithmetic is critical for financial calculations
- The Hathor wallet library returns all amounts as BigInt

## Storage Strategy

**Decision: Store balances as strings in Redux state**

This QA helper stores balances as **strings** for several reasons:

1. **Full serializability** - Redux state can be persisted to localStorage
2. **No Redux warnings** - Maintains Redux best practices
3. **Future-proof** - Easier to add persistence/debugging features
4. **Type safety** - Explicit conversions make data flow clearer

## Implementation Patterns

### 1. Type Definitions

```typescript
// WalletInfo type
interface WalletInfo {
  metadata: WalletMetadata;
  instance: HathorWallet | null;
  status: WalletStatus;
  firstAddress?: string;
  balance?: string; // Stored as string, not number or BigInt
  error?: string;
}
```

### 2. Fetching Balance from Wallet Library

```typescript
// In walletStoreSlice.ts - startWallet thunk
const balanceData = await walletInstance.getBalance(selectedTokenUid);
const balanceBigInt = balanceData?.[0]?.balance?.unlocked || 0n;

// Convert BigInt to string for storage
const balanceString = balanceBigInt.toString();

dispatch(updateWalletBalance({ id: walletId, balance: balanceString }));
```

### 3. Displaying Balance in UI

```typescript
import { numberUtils } from '@hathor/wallet-lib';

// Convert string back to BigInt for display
const balanceString = wallet.balance || '0';
const balanceBigInt = BigInt(balanceString);

// Use wallet-lib's prettyValue for formatting
const formattedBalance = numberUtils.prettyValue(balanceBigInt, decimalPlaces);
// Returns: "1,234.56789000" (with thousand separators and decimals)
```

### 4. Balance Arithmetic

```typescript
// Convert strings to BigInt for calculations
const balance1 = BigInt(wallet1.balance || '0');
const balance2 = BigInt(wallet2.balance || '0');

// Perform BigInt arithmetic
const total = balance1 + balance2;
const difference = balance1 - balance2;

// Convert back to string for storage
const totalString = total.toString();
```

### 5. Comparison Operations

```typescript
const balance = BigInt(wallet.balance || '0');

// Direct BigInt comparisons
if (balance > 0n) {
  // Wallet has funds
}

if (balance === 0n) {
  // Wallet is empty
}

// Comparing two balances
const balance1 = BigInt(wallet1.balance || '0');
const balance2 = BigInt(wallet2.balance || '0');

if (balance1 > balance2) {
  // wallet1 has more funds
}
```

### 6. Sorting Wallets by Balance

```typescript
// Sort by highest balance (descending)
const sortedDesc = wallets.sort((a, b) => {
  const balanceA = BigInt(a.balance || '0');
  const balanceB = BigInt(b.balance || '0');

  if (balanceA > balanceB) return -1;
  if (balanceA < balanceB) return 1;
  return 0;
});

// Sort by lowest balance (ascending)
const sortedAsc = wallets.sort((a, b) => {
  const balanceA = BigInt(a.balance || '0');
  const balanceB = BigInt(b.balance || '0');

  if (balanceA < balanceB) return -1;
  if (balanceA > balanceB) return 1;
  return 0;
});
```

## Common Pitfalls

### ❌ DON'T: Mix BigInt with Number

```typescript
// WRONG - TypeError: Cannot mix BigInt and other types
const balance = BigInt(wallet.balance);
const display = balance / 100; // ERROR!
```

### ✅ DO: Use Explicit Conversions

```typescript
// CORRECT
const balance = BigInt(wallet.balance);
const display = Number(balance) / 100; // Convert to Number first

// OR BETTER: Use wallet-lib utilities
const display = numberUtils.prettyValue(balance, decimalPlaces);
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

### ❌ DON'T: Store BigInt directly in Redux (in this app)

```typescript
// WRONG - Redux serialization error
dispatch(updateWalletBalance({
  id: walletId,
  balance: 12345n // Don't store BigInt!
}));
```

### ✅ DO: Convert to string before storing

```typescript
// CORRECT
const balanceBigInt = balanceData[0].balance.unlocked;
const balanceString = balanceBigInt.toString();

dispatch(updateWalletBalance({
  id: walletId,
  balance: balanceString // Store as string
}));
```

## Decimal Places

- **Native HTR token**: 2 decimal places (100 = 1 HTR, like cents)
- **Custom tokens**: Varies (typically 0-8 decimal places)
- **NFTs**: 0 decimal places (always whole numbers)

The `numberUtils.prettyValue()` function handles decimal conversion automatically:

```typescript
// balance = 12345n, decimalPlaces = 2
numberUtils.prettyValue(12345n, 2) // "123.45"

// balance = 12345n, decimalPlaces = 0 (NFT)
numberUtils.prettyValue(12345n, 0) // "12,345"
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

## Reference Implementation

See these files for complete examples:
- `/src/store/slices/walletStoreSlice.ts` - Balance fetching and storage
- `/src/components/stages/WalletInitialization.tsx` - Balance display and sorting
- `/src/components/QALayout.tsx` - Header balance display
- `/src/utils/balanceUtils.ts` - Conversion utilities (create this if needed)
