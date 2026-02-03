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

- **Use `instance.getTokens()` for displaying token lists** - more reliable than Redux store
- Use `refreshWalletTokens` for updating the Redux cache after changes
- Check token cache before fetching metadata
- Use `selectedTokenUid` from state for balance queries
- Handle errors gracefully (tokens without balance may fail)
- Use `getMeltAuthority()` to check if wallet can melt a token

### ❌ DON'T

- **Don't rely solely on `wallet.tokenUids` for complete token lists** - may miss received tokens
- Don't fetch token metadata if it's already in the cache
- Don't store duplicate tokens in the slice
- Don't bypass the caching mechanism
- Don't assume all token UIDs have valid metadata
- Don't assume all tokens can be melted - check authority first

## Token Filtering

### Fetching Tokens: Direct Instance vs Redux Store

**Important**: There are two ways to get a wallet's token list, with different reliability:

| Method | Source | Reliability | Use Case |
|--------|--------|-------------|----------|
| `await instance.getTokens()` | Wallet-lib direct | **Most reliable** | Displaying all tokens |
| `wallet.tokenUids` | Redux store | May be stale | Quick access, non-critical |

**Recommended approach** - fetch directly from wallet instance:

```tsx
// Fetch tokens directly from wallet instance (catches all tokens including received)
const tokenUids: string[] = await wallet.instance.getTokens();
const customTokens = tokenUids.filter(uid => uid !== NATIVE_TOKEN_UID);
```

**Why `wallet.tokenUids` can be incomplete:**
- Only updated during `startWallet`, `refreshWalletTokens`, or `new-tx` events
- Tokens received while wallet was stopped may not appear
- Redux state may be stale if events were missed

**Example from CustomTokens.tsx:**

```tsx
// State for tokens fetched directly from wallet instance
const [fetchedTokenUids, setFetchedTokenUids] = useState<string[]>([]);

// Fetch tokens directly from wallet instance on mount and refresh
useEffect(() => {
  const fetchTokensFromInstance = async () => {
    if (!wallet?.instance) {
      setFetchedTokenUids([]);
      return;
    }

    try {
      const tokenUids: string[] = await wallet.instance.getTokens();
      setFetchedTokenUids(tokenUids);
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
      // Fallback to Redux store if direct fetch fails
      setFetchedTokenUids(wallet.tokenUids || []);
    }
  };

  fetchTokensFromInstance();
}, [wallet?.instance, wallet?.metadata.id, refreshKey]);
```

### Exclude Native Token

```tsx
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

const customTokens = tokenUids.filter(uid => uid !== NATIVE_TOKEN_UID);
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

## Token Ownership vs Token Holdings

**Important distinction**: A wallet can *hold* tokens it didn't *create*. The `wallet.tokenUids` array contains ALL tokens the wallet has interacted with, regardless of origin.

### Identifying Token Ownership

Use **melt authority** to determine if a wallet created a token:

```tsx
// Check if this wallet has melt authority (i.e., likely created this token)
const meltAuthority = await wallet.instance.getMeltAuthority(tokenUid, {
  many: false,
  only_available_utxos: true,
});
const hasMeltAuthority = meltAuthority && meltAuthority.length > 0;

if (hasMeltAuthority) {
  // This wallet created the token or was delegated melt authority
  // Can melt tokens (in multiples of 100)
} else {
  // This wallet received the token from another wallet
  // Cannot melt - must return to sender or transfer elsewhere
}
```

### Why This Matters

When displaying tokens or cleaning up a wallet:
- **CustomTokens stage**: Shows all tokens but doesn't distinguish origin
- **TestWalletCleanup stage**: Uses melt authority to determine which tokens can be melted vs returned

## Token Flow Tracking

For tokens received from other wallets, use the `trackTokenFlow` service to identify the original sender:

```tsx
import { trackTokenFlow } from '../services/tokenFlowTracker';

// Get detailed flow data for a specific token
const tokenFlow = await trackTokenFlow(wallet.instance, tokenUid);

// tokenFlow.addressFlows contains all external addresses with positive net balance
for (const flow of tokenFlow.addressFlows) {
  console.log(`Address: ${flow.address}`);
  console.log(`Net balance: ${flow.netBalance}`);  // tokens they still hold
  console.log(`Sent: ${flow.totalSent}, Received: ${flow.totalReceived}`);
  console.log(`Wallet ID: ${flow.walletId}`);  // if known from addressDatabase
}

// Total tokens held externally
console.log(`Total external: ${tokenFlow.totalExternalBalance}`);
```

### How Token Flow Tracking Works

1. Collects all wallet addresses
2. Gets transaction history for the specific token (`getTxHistory({ token_id: tokenUid })`)
3. Processes transactions chronologically:
   - **Inputs from external addresses**: Tokens coming back to wallet
   - **Outputs to external addresses**: Tokens leaving wallet
4. Calculates net balance per external address (sent - received)
5. Tracks unspent outputs to identify current holders

### Use Cases

| Scenario | Use Melt Authority | Use Token Flow |
|----------|-------------------|----------------|
| Display all tokens | No | No |
| Determine if can melt | **Yes** | No |
| Find token origin | No | **Yes** |
| Return tokens to sender | Yes (to check if needed) | **Yes** |
| Cleanup wallet | **Yes** | **Yes** |

### Example: Cleanup Logic from TestWalletCleanup

```tsx
// For each token in the wallet
for (const uid of wallet.tokenUids) {
  const balance = await wallet.instance.getBalance(uid);

  // Check melt authority
  const meltAuthority = await wallet.instance.getMeltAuthority(uid, {
    many: false,
    only_available_utxos: true,
  });
  const hasMeltAuthority = meltAuthority && meltAuthority.length > 0;

  if (hasMeltAuthority) {
    // Can melt this token (multiples of 100)
    const meltableAmount = Math.floor(Number(balance) / 100) * 100;
  } else {
    // Cannot melt - need to find original sender
    const tokenFlow = await trackTokenFlow(wallet.instance, uid);
    if (tokenFlow.addressFlows.length > 0) {
      const originalSender = tokenFlow.addressFlows[0].address;
      // Can return tokens to this address
    }
  }
}
```

## Types for Token Flow Tracking

```tsx
// Located in src/types/tokenFlowTracker.ts

interface AddressTokenFlow {
  address: string;           // External address
  netBalance: number;        // sent - received (positive = they hold tokens)
  totalSent: number;         // Total sent to this address
  totalReceived: number;     // Total received back from this address
  unspentOutputs: UnspentOutput[];  // Current UTXOs at this address
  walletId?: string;         // Known wallet ID (from addressDatabase)
}

interface TokenFlowResult {
  tokenUid: string;
  addressFlows: AddressTokenFlow[];  // All external addresses with positive balance
  totalExternalBalance: number;       // Sum of all net balances
  errors: string[];
}
```

## Debugging

Common issues:

1. **Token not appearing**: Check if `getTxById` succeeds for that UID
2. **Duplicate tokens**: Verify cache check before adding
3. **Balance not updating**: Ensure `selectedTokenUid` is set correctly
4. **Event not firing**: Check wallet is in 'ready' state
5. **Can't melt received tokens**: Check `getMeltAuthority` - only token creators can melt
6. **Token flow returns empty**: Verify token has transaction history

Enable debug logging:

```tsx
console.debug('Token cache:', state.tokens.tokens);
console.debug('Wallet tokens:', wallet.tokenUids);

// For debugging melt authority
const meltAuth = await wallet.instance.getMeltAuthority(tokenUid, {
  many: false,
  only_available_utxos: true,
});
console.debug('Melt authority:', meltAuth);

// For debugging token flow
const flow = await trackTokenFlow(wallet.instance, tokenUid);
console.debug('Token flow:', flow);
```