# Wallet State Management

Redux Toolkit + external map for non-serializable wallet instances.

## Critical Rule: Never Store HathorWallet in Redux

**Why?** HathorWallet is complex/stateful with internal events, causes:
- Serialization errors
- Unnecessary re-renders
- Performance issues
- Memory leaks

**Solution**: Metadata in Redux, instances in `walletInstancesMap`

## Patterns

### 1. Store Instance in External Map
```tsx
// ✅ DO
import { walletInstancesMap } from '../store/slices/walletStoreSlice';
walletInstancesMap.set(walletId, walletInstance);

const { getWallet } = useWalletStore();
const instance = getWallet(walletId)?.instance;

// ❌ DON'T
dispatch(updateWallet({ id, instance: walletInstance })); // Serialization error
```

### 2. Only Serializable Data in Redux
```tsx
// ✅ DO
interface WalletInfo {
  metadata: { id, friendlyName, seedWords, network, createdAt };
  instance: null; // Always null in Redux
  status: 'idle' | 'connecting' | 'syncing' | 'ready' | 'error';
  firstAddress?: string;
  error?: string;
}

// ❌ DON'T
interface Bad {
  wallet: HathorWallet;     // Non-serializable
  transactions: Transaction[]; // Too much data
}
```

### 3. Use Custom Hooks
```tsx
// ✅ DO
const { getWallet, updateWalletStatus } = useWalletStore();
const walletInfo = getWallet(walletId);

// ❌ DON'T
const wallets = useSelector(state => state.walletStore.wallets);
const instance = walletInstancesMap.get(walletId); // Fragmented
```

### 4. Memoize Derived Arrays
```tsx
// ✅ DO - walletsMap is memoized by createSelector
const { wallets: walletsMap } = useWalletStore();
const allWallets = useMemo(
  () => Array.from(walletsMap.values()),
  [walletsMap]
);

// ❌ DON'T - Creates new array every render, causes infinite loops
const allWallets = getAllWallets(); // Called during render
```

See `development-practices.md` for more on preventing render loops.

### 4. Update Status via Redux Actions
```tsx
// ✅ DO - Extract specific data
const handleTx = (tx) => {
  updateWalletStatus(walletId, 'ready', instance.getAddress(0));
};

// ❌ DON'T - Store complex objects
dispatch(addTransaction({ walletId, transaction: tx }));
```

## Example
```tsx
export function WalletComponent({walletId}: Props) {
  const {getWallet, updateWalletInstance, updateWalletStatus} = useWalletStore();
  const walletInfo = getWallet(walletId);

  useEffect(() => {
    if (!walletInfo) return;
    let mounted = true;
    const {seedWords, network} = walletInfo.metadata;

    async function init() {
      updateWalletStatus(walletId, 'connecting');
      try {
        const wallet = new HathorWallet({seed: seedWords, network});
        walletInstancesMap.set(walletId, wallet);
        updateWalletInstance(walletId, wallet);
        await wallet.start();

        if (!mounted) {
          await wallet.stop();
          walletInstancesMap.delete(walletId);
          return;
        }

        updateWalletStatus(walletId, 'ready', await wallet.getAddressAtIndex(0));
      } catch (error) {
        if (mounted) updateWalletStatus(walletId, 'error', undefined, error.message);
      }
    }

    init();
    return () => {
      mounted = false;
      const instance = walletInstancesMap.get(walletId);
      if (instance) {
        instance.stop().catch(console.error);
        walletInstancesMap.delete(walletId);
      }
    };
  }, [walletId, updateWalletInstance, updateWalletStatus]);

  // Listen to events
  useEffect(() => {
    const instance = walletInfo?.instance;
    if (!instance) return;
    const updateBalance = () => console.log('Balance:', instance.getBalance());
    instance.on('balance-update', updateBalance);
    return () => instance.off('balance-update', updateBalance);
  }, [walletInfo?.instance]);

  return (
    <div>
      <p>Name: {walletInfo.metadata.friendlyName}</p>
      <p>Status: {walletInfo.status}</p>
      <p>Address: {walletInfo.firstAddress}</p>
    </div>
  );
}
```

## Event Listeners

### Built-in Event Handling

The `startWallet` thunk automatically sets up event listeners for ALL event types:
- **new-tx**: New transaction arrives
- **update-tx**: Transaction updated (gets first_block, output spent, etc.)
- **state**: Wallet state changes
- **more-addresses-loaded**: Address history loading progress

All events are automatically captured and stored in Redux (`walletStore.events[]`) for global access.

**Automatic actions on events**:
- Detect custom token transactions → refresh tokens (cached)
- New/updated transactions → refresh balance
- All events → stored in Redux for monitoring

Event handlers are stored in `walletEventHandlers` map for cleanup when wallet stops.

For detailed event monitoring patterns, see `wallet-event-monitoring.md`.

### Available Thunks

#### `refreshWalletTokens(walletId)`
Fetches custom tokens for a wallet with caching - only fetches tokens not already in the slice.

```tsx
import { refreshWalletTokens } from '../store/slices/walletStoreSlice';

// In a component
const handleRefresh = async () => {
  await dispatch(refreshWalletTokens(walletId)).unwrap();
};
```

#### `refreshWalletBalance(walletId)`
Updates the balance for the currently selected token.

```tsx
import { refreshWalletBalance } from '../store/slices/walletStoreSlice';

// In a component
const handleRefresh = async () => {
  await dispatch(refreshWalletBalance(walletId)).unwrap();
};
```

### Custom Event Listeners

For custom event handling in components:

```tsx
// ✅ DO
useEffect(() => {
  const instance = walletInfo?.instance;
  if (!instance) return;

  const handleEvent = (data: any) => {
    // Handle event
  };

  instance.on('event-name', handleEvent);
  return () => instance.off('event-name', handleEvent);
}, [walletInfo?.instance]);

// ❌ DON'T - Store handlers in Redux
dispatch(addEventHandler({ walletId, handler })); // Non-serializable
```
