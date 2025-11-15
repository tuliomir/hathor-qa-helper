# Wallet State Management Best Practices

## State Management Architecture

The application uses **Redux Toolkit** for global state management, with special handling for non-serializable wallet instances.

### Redux Store Structure

- **Wallet Store Slice**: Manages wallet metadata and status
- **Stage Slice**: Manages current active QA stage
- **External Map**: Stores non-serializable wallet instances

### Why This Hybrid Approach?

Redux requires serializable state, but `HathorWallet` instances are complex, stateful objects that cannot be serialized. The solution:

1. **Redux State**: Stores serializable wallet metadata (ID, name, status, addresses)
2. **External Map**: Stores non-serializable wallet instances outside Redux
3. **Custom Hooks**: Provide a unified API that combines both

## Critical Rule: Never Store Complex Wallet Objects in Redux State

### The Problem

The `HathorWallet` object is a **complex, stateful object** that:

- Changes internally due to network events (new transactions, blocks, etc.)
- Has its own event emitters and listeners
- Maintains internal state (balance, UTXOs, transaction history)
- Can trigger frequent internal updates

**Storing it in Redux state causes:**

1. **Serialization errors** - Redux requires serializable state
2. **Unnecessary re-renders** - Every internal wallet change could trigger component updates
3. **Stale references** - Redux state snapshots don't capture live wallet state
4. **Performance issues** - Redux will try to serialize large complex objects
5. **Memory leaks** - Old wallet instances may not be properly cleaned up

### The Solution: Redux for Metadata, External Map for Instances

## Pattern 1: Store Wallet Instance in External Map (Redux Pattern)

```tsx
// ✅ CORRECT - Store wallet instance in external map
import { walletInstancesMap } from '../store/slices/walletStoreSlice';

// Inside component or initialization logic
walletInstancesMap.set(walletId, walletInstance);

// Access via custom hook
const { getWallet } = useWalletStore();
const walletInfo = getWallet(walletId);
const instance = walletInfo?.instance; // Retrieved from map

// ❌ WRONG - Do not store in Redux state
dispatch(updateWallet({
  id: walletId,
  instance: walletInstance // This will cause serialization errors!
}));
```

**Why?**
- Redux requires serializable state
- External map doesn't trigger unnecessary re-renders
- Wallet instances are accessed on-demand
- Proper cleanup via Redux actions

## Pattern 2: Store Metadata and Status in Redux

Only track **serializable properties** in Redux state:

```tsx
// ✅ CORRECT - Redux state stores only serializable data
interface WalletInfo {
  metadata: {
    id: string;
    friendlyName: string;
    seedWords: string;
    network: NetworkType;
    createdAt: number;
  };
  instance: null; // Always null in Redux state
  status: 'idle' | 'connecting' | 'syncing' | 'ready' | 'error';
  firstAddress?: string;
  error?: string;
}

// ❌ WRONG - Don't store complex objects
interface WalletDataWrong {
  wallet: HathorWallet;     // Non-serializable!
  transactions: Transaction[]; // Too much data
  utxos: UTXO[];           // Too much data
}
```

## Pattern 3: Use Custom Hooks for Unified API

Custom hooks provide a clean API that abstracts Redux and the external map:

```tsx
// ✅ CORRECT - Use custom hooks
import { useWalletStore } from '../hooks/useWalletStore';

function MyComponent() {
  const { getWallet, updateWalletStatus } = useWalletStore();

  const walletInfo = getWallet('wallet-123');
  const instance = walletInfo?.instance; // Seamlessly retrieved

  // Update status via Redux action
  updateWalletStatus('wallet-123', 'ready', '0x123...');
}

// ❌ WRONG - Don't access Redux and map directly
function MyComponentWrong() {
  const wallets = useSelector(state => state.walletStore.wallets);
  const instance = walletInstancesMap.get('wallet-123'); // Fragmented access
}
```

**Benefits:**
- Single source of truth via hooks
- Automatic synchronization between Redux and external map
- Type-safe API
- Easy to test and mock

## Pattern 4: Update Wallet Status via Redux Actions

When listening to wallet events, dispatch Redux actions to update state:

```tsx
import { useWalletStore } from '../hooks/useWalletStore';

function WalletComponent({ walletId }: Props) {
  const { getWallet, updateWalletStatus } = useWalletStore();
  const walletInfo = getWallet(walletId);

  useEffect(() => {
    const instance = walletInfo?.instance;
    if (!instance) return;

    // ✅ CORRECT - Dispatch Redux action with specific data
    const handleNewTransaction = (tx: Transaction) => {
      const balance = instance.getBalance();
      updateWalletStatus(walletId, 'ready', instance.getAddress(0));
    };

    instance.on('new-tx', handleNewTransaction);
    return () => instance.off('new-tx', handleNewTransaction);
  }, [walletId, walletInfo?.instance, updateWalletStatus]);

  // ❌ WRONG - Don't try to store transactions in Redux
  const handleNewTransactionWrong = (tx: Transaction) => {
    dispatch(addTransaction({
      walletId,
      transaction: tx,        // Complex object!
      wallet: instance,       // Even worse!
    }));
  };
}
```

## Complete Example with Redux

```tsx
import { useWalletStore } from '../hooks/useWalletStore';
import { walletInstancesMap } from '../store/slices/walletStoreSlice';
import HathorWallet from '@hathor/wallet-lib';

export function WalletComponent({walletId}: Props) {
	const {getWallet, updateWalletInstance, updateWalletStatus} = useWalletStore();
	const walletInfo = getWallet(walletId);

	// Initialize wallet
	useEffect(() => {
		if (!walletInfo) return;

		let mounted = true;
		const {seedWords, network} = walletInfo.metadata;

		async function init() {
			// Update status to connecting
			updateWalletStatus(walletId, 'connecting');

			try {
				const wallet = new HathorWallet({seed: seedWords, network});

				// Store instance in external map
				walletInstancesMap.set(walletId, wallet);
				updateWalletInstance(walletId, wallet);

				await wallet.start();

				if (!mounted) {
					console.error(`Wallet ${walletId} could not start!`)
					await wallet.stop();
					walletInstancesMap.delete(walletId);
					return;
				}

				// Extract specific properties and update Redux state
				const firstAddress = await wallet.getAddressAtIndex(0);
				updateWalletStatus(walletId, 'ready', firstAddress);

			} catch (error) {
				if (mounted) {
					updateWalletStatus(walletId, 'error', undefined, error.message);
				}
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

	// Listen to wallet events
	useEffect(() => {
		const instance = walletInfo?.instance;
		if (!instance) return;

		const updateBalance = () => {
			const balance = instance.getBalance();
			// Store balance in local state or dispatch to Redux if needed
			console.log('Balance updated:', balance);
		};

		instance.on('balance-update', updateBalance);
		return () => instance.off('balance-update', updateBalance);
	}, [walletInfo?.instance]);

	if (!walletInfo) return <div>Wallet not found</div>;

	return (
		<div>
			<p>Name: {walletInfo.metadata.friendlyName}</p>
			<p>Status: {walletInfo.status}</p>
			<p>Address: {walletInfo.firstAddress}</p>
			{walletInfo.error && <p>Error: {walletInfo.error}</p>}
		</div>
	);
}
```

## Key Takeaways

1. **Never** store `HathorWallet` instances in Redux state
2. **Always** use external `walletInstancesMap` for wallet instances
3. **Only** store serializable data in Redux (metadata, status, addresses)
4. **Use custom hooks** (`useWalletStore`, `useStage`) for unified API
5. **Dispatch Redux actions** when wallet state changes
6. **Keep** wallet lifecycle management in components/effects

## Anti-Patterns to Avoid

```tsx
// ❌ WRONG - Don't store wallet instances in Redux
dispatch(updateWallet({
  id: walletId,
  instance: walletInstance, // Serialization error!
}));

// ❌ WRONG - Don't store complex objects
dispatch(addTransaction({
  walletId,
  transaction: complexTxObject, // Too complex!
}));

// ❌ WRONG - Don't access map directly, use hooks
const instance = walletInstancesMap.get(walletId); // Fragmented!
const metadata = useSelector(state => state.walletStore.wallets[walletId]);

// ✅ CORRECT - Use custom hooks
const { getWallet } = useWalletStore();
const walletInfo = getWallet(walletId); // Unified access!
```

## Redux Toolkit Configuration

The store is configured to handle non-serializable values properly:

```typescript
// store/index.ts
export const store = configureStore({
  reducer: {
    walletStore: walletStoreReducer,
    stage: stageReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore wallet instance actions
        ignoredActions: ['walletStore/updateWalletInstance'],
        ignoredPaths: ['walletStore.wallets'],
      },
    }),
});
```

## Benefits of This Architecture

1. **Serializable State**: Redux DevTools work perfectly
2. **Performance**: Only serialize what's needed
3. **Type Safety**: Full TypeScript support
4. **Testability**: Easy to mock custom hooks
5. **Scalability**: Can add more slices as needed
6. **Persistence**: LocalStorage sync built-in
7. **Developer Experience**: Redux DevTools, time-travel debugging
