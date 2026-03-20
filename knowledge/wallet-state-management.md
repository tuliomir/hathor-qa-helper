# Wallet State Management

Redux Toolkit + external map for non-serializable wallet instances.

## Critical Rule: Never Store HathorWallet in Redux

`HathorWallet` is complex/stateful with internal events. Storing it in Redux causes serialization errors, unnecessary re-renders, and memory leaks.

**Solution**: Metadata in Redux (`walletStoreSlice`), instances in `walletInstancesMap`.

## Patterns

### Store Instance in External Map
```typescript
import { walletInstancesMap } from '../store/slices/walletStoreSlice';
walletInstancesMap.set(walletId, walletInstance);

// Access via hook
const { getWallet } = useWalletStore();
const instance = getWallet(walletId)?.instance;
```

### Only Serializable Data in Redux
```typescript
interface StoredWalletInfo {
  metadata: { id, friendlyName, seedWords, network, createdAt };
  instance: null; // Always null in Redux
  status: 'idle' | 'connecting' | 'syncing' | 'ready' | 'error';
  firstAddress?: string;
  balance?: string; // BigInt stored as string
  tokenUids?: string[];
  events: WalletEvent[];
  error?: string;
}
```

### Use Custom Hooks
```typescript
const { getWallet, updateWalletStatus } = useWalletStore();
const walletInfo = getWallet(walletId);

// NOT: manual selector + map lookup (fragmented access)
```

### Memoize Derived Arrays
```typescript
const { wallets: walletsMap } = useWalletStore();
const allWallets = useMemo(() => Array.from(walletsMap.values()), [walletsMap]);

// NOT: getAllWallets() during render (creates new array every render → infinite loops)
```

## Wallet Lifecycle

The `startWallet` thunk:
1. Creates `HathorWallet` instance
2. Stores in `walletInstancesMap`
3. Calls `wallet.start()`
4. Sets up event listeners for `new-tx`, `update-tx`, `state`, `more-addresses-loaded`
5. All events auto-stored in Redux `events[]` for global access

Event handlers stored in `walletEventHandlers` map for cleanup when wallet stops.

## Available Thunks

- **`startWallet(walletId)`** — Initialize and start wallet, set up listeners
- **`stopWallet(walletId)`** — Stop wallet, clean up listeners and instance
- **`refreshWalletTokens(walletId)`** — Fetch custom tokens with caching (only fetches new ones)
- **`refreshWalletBalance(walletId)`** — Update balance for selected token

## Auto-Start

`WalletAutoLoader` component (placed at root in `App.tsx`) automatically starts selected funding and test wallets on any route. Checks `walletSelection.fundingWalletId` and `testWalletId` from Redux.

## Custom Event Listeners

For component-specific event handling beyond the auto-captured events:

```typescript
useEffect(() => {
  const instance = walletInfo?.instance;
  if (!instance) return;
  const handler = (data: unknown) => { /* handle */ };
  instance.on('event-name', handler);
  return () => instance.off('event-name', handler);
}, [walletInfo?.instance]);
```

See `wallet-event-monitoring.md` for event details and `bigint-handling.md` for balance patterns.
