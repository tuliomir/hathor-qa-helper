# Token Management

Guide for managing custom tokens in the QA Helper application.

## Overview

Tokens are managed in two Redux slices:
- **`tokensSlice`**: Stores token metadata (uid, name, symbol) as a cache
- **`walletStoreSlice`**: Tracks which token UIDs each wallet has

## Token Caching Strategy

Token metadata is immutable on the blockchain, so we treat the `tokensSlice` as a cache:
- **Never re-fetch** if a token already exists in the slice
- **Persist** token data across wallet restarts
- **Share** token data across all wallets

## Automatic Token Loading

### On Wallet Start

When a wallet starts (`startWallet` thunk):
1. Fetches all token UIDs from the wallet
2. For each custom token (excluding native HTR):
   - Checks if token exists in cache
   - If not, fetches token metadata via `getTxById(uid)`
   - Stores in `tokensSlice` for future use

### On New Transactions

The 'new-tx' event listener automatically:
1. Detects transactions with `tokenName` and `tokenSymbol`
2. Calls `refreshWalletTokens(walletId)` to update token list
3. Calls `refreshWalletBalance(walletId)` to update balance
4. Uses caching - only fetches new tokens

## Manual Refresh

Users can manually refresh tokens via the "Refresh" button in the Custom Tokens stage:

```tsx
import { refreshWalletTokens, refreshWalletBalance } from '../store/slices/walletStoreSlice';

const handleRefresh = async () => {
  await Promise.all([
    dispatch(refreshWalletTokens(walletId)).unwrap(),
    dispatch(refreshWalletBalance(walletId)).unwrap(),
  ]);
};
```

## Token Data Flow

```
Wallet Instance
  ↓
getTokens() → [uid1, uid2, ...]
  ↓
For each UID:
  ↓
Check cache (tokensSlice)
  ↓
If not cached:
  ↓
getTxById(uid) → { tokenName, tokenSymbol }
  ↓
Store in tokensSlice
  ↓
Update wallet.tokenUids
```

## Available Actions

### From `tokensSlice`

```tsx
import { addToken, removeToken, setSelectedToken } from '../store/slices/tokensSlice';

// Add a token to the cache
dispatch(addToken({ uid: '...', name: 'MyToken', symbol: 'MTK' }));

// Remove from cache
dispatch(removeToken(uid));

// Select token for balance display
dispatch(setSelectedToken(uid));
```

### From `walletStoreSlice`

```tsx
import { refreshWalletTokens, refreshWalletBalance, updateWalletTokens } from '../store/slices/walletStoreSlice';

// Refresh tokens with caching
dispatch(refreshWalletTokens(walletId));

// Refresh balance
dispatch(refreshWalletBalance(walletId));

// Manually update wallet's token UIDs
dispatch(updateWalletTokens({ id: walletId, tokenUids: ['00', 'abc...'] }));
```

## Best Practices

### ✅ DO

- Use `refreshWalletTokens` for fetching - it handles caching
- Check token cache before fetching metadata
- Use `selectedTokenUid` from state for balance queries
- Handle errors gracefully (tokens without balance may fail)

### ❌ DON'T

- Don't fetch token metadata if it's already in the cache
- Don't store duplicate tokens in the slice
- Don't bypass the caching mechanism
- Don't assume all token UIDs have valid metadata

## Token Filtering

### Exclude Native Token

```tsx
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

const customTokens = wallet.tokenUids?.filter(uid => uid !== NATIVE_TOKEN_UID);
```

### Get Token Details

```tsx
const allTokens = useAppSelector(s => s.tokens.tokens);
const tokenDetails = allTokens.find(t => t.uid === targetUid);
```

## Configuration Strings

For sharing custom tokens:

```tsx
import { tokensUtils } from '@hathor/wallet-lib';

const configString = tokensUtils.getConfigurationString(
  token.uid,
  token.name,
  token.symbol
);
// Returns: [MyToken:MTK:abc123...]
```

## Event Handling

The wallet automatically sets up 'new-tx' listeners:

```tsx
// In startWallet thunk
walletInstance.on('new-tx', async (tx: any) => {
  // Detect custom token transactions
  if (tx.tokenName && tx.tokenSymbol) {
    dispatch(refreshWalletTokens(walletId));
  }

  // Always refresh balance
  dispatch(refreshWalletBalance(walletId));
});
```

Cleanup happens automatically in `stopWallet`.

## Debugging

Common issues:

1. **Token not appearing**: Check if `getTxById` succeeds for that UID
2. **Duplicate tokens**: Verify cache check before adding
3. **Balance not updating**: Ensure `selectedTokenUid` is set correctly
4. **Event not firing**: Check wallet is in 'ready' state

Enable debug logging:

```tsx
console.debug('Token cache:', state.tokens.tokens);
console.debug('Wallet tokens:', wallet.tokenUids);
```