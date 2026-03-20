
# BigInt Handling in Hathor QA Helper

## Storage Strategy
**Store as strings in Redux, expose as BigInt via selectors**
- Redux stores balances as strings (serializable)
- Selectors convert to BigInt automatically
- Components work with BigInt directly (type-safe, consistent with wallet-lib)

## Implementation Patterns

### 1. Type Definitions

```typescript
// Components work with BigInt
interface WalletInfo { balance?: bigint; }

// Redux stores as string
interface StoredWalletInfo { balance?: string; }
```

### 2. Redux Slice - Store Balance

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
// Selector converts string to BigInt automatically
function convertWalletData(walletData: StoredWalletInfo): WalletInfo {
  return {
    ...walletData,
    balance: walletData.balance ? BigInt(walletData.balance) : undefined,
  };
}
```

### 4. Components Use BigInt Directly

```typescript
const { getAllWallets } = useWalletStore();
const wallets = getAllWallets(); // balance is already BigInt

// Direct operations
const total = wallet1.balance + wallet2.balance;
if (wallet.balance > 0n) { /* has funds */ }

// Display
<div>Balance: {formatBalance(wallet.balance)} HTR</div>
```

### 5. Sorting by Balance

```typescript
// Sort descending
[...wallets].sort((a, b) => {
  const balA = a.balance || 0n, balB = b.balance || 0n;
  return balA > balB ? -1 : balA < balB ? 1 : 0;
});
```

## Common Pitfalls

### ❌ DON'T: Mix BigInt with Number
```typescript
const display = wallet.balance / 100; // ERROR!
```

### ✅ DO: Use formatBalance()
```typescript
const display = formatBalance(wallet.balance);
```

### ❌ DON'T: Manually convert (selector does it)
```typescript
const balance = BigInt(wallet.balance || '0'); // WRONG
```

### ✅ DO: Trust the selector
```typescript
const balance = wallet.balance || 0n; // CORRECT
```

### ❌ DON'T: Use JSON.stringify() with BigInt
```typescript
JSON.stringify({ balance: 12345n }); // ERROR!
```

### ✅ DO: Use JSONBigInt from wallet-lib
```typescript
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';
JSONBigInt.stringify({ balance: 12345n });
```

## Decimal Places

- **HTR**: 2 decimals (100 = 1 HTR)
- **Custom tokens**: 0-8 decimals
- **NFTs**: 0 decimals

```typescript
formatBalance(12345n, 2) // "123.45"
formatBalance(12345n, 0) // "12,345" (NFT)
```

## Wallet-lib Utilities

```typescript
import { numberUtils, JSONBigInt } from '@hathor/wallet-lib';

// Format display
numberUtils.prettyValue(balanceBigInt, decimalPlaces)

// Serialize BigInt
JSONBigInt.stringify(objectWithBigInt, indent)
```

## Data Flow

```
Wallet-lib (BigInt) → Redux Slice (string) → Selector (BigInt) → Components (BigInt)
  getBalance()         .toString()            BigInt()            operations/display
```

## Reference Files

- `/src/types/walletStore.ts` - WalletInfo (balance: bigint)
- `/src/store/slices/walletStoreSlice.ts` - Store balance as string
- `/src/store/selectors/walletStoreSelectors.ts` - Convert to BigInt
- `/src/hooks/useWalletStore.ts` - Expose BigInt to components
- `/src/utils/balanceUtils.ts` - Format for display
- `/src/components/stages/WalletInitialization.tsx` - Usage examples

## Key Takeaways

1. **Never manually convert** - Selectors handle string → BigInt
2. **Work with BigInt everywhere** - Components, calculations, comparisons
3. **Format for display only** - Use `formatBalance()` for UI
4. **Redux stores strings** - But components never see them
5. **Type system enforces** - TypeScript catches mistakes
