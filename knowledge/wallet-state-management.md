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
  shieldedCapability?: ShieldedCapabilitySummary; // shielded networks only
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
1. Calls `applyNetworkServices(network)` (tx-mining URL, a global singleton)
2. Creates `HathorWallet` instance
3. On networks with `supportsShielded`, registers the WASM shielded provider and a `shielded-capability` listener (see `shielded-outputs.md`)
4. Stores in `walletInstancesMap`
5. Calls `wallet.start()`
6. Stores the shielded capability summary, when enabled
7. Sets up event listeners for `new-tx`, `update-tx`, `state`, `more-addresses-loaded`
8. All events auto-stored in Redux `events[]` for global access

Event handlers stored in `walletEventHandlers` map for cleanup when wallet stops.

## Address-only wallets

A wallet known only by name, network and address 0 (`metadata.kind === 'address'`, `metadata.address0`), for wallets whose seed can't be copied, such as passkey wallets (`passkeys.md`). Added from Wallet initialization with "Address only".

- It is never started: its status is `address-only` from the moment it is loaded or added, `startWallet` refuses it and `updateWalletStatus` leaves it alone. It has no instance, balance, tokens or events.
- `firstAddress` is set from `address0`, so everything that reads `firstAddress` (top bar, command palette, quick fills) works unchanged.
- It can only be the **test** wallet; the funding wallet must sign.
- `utils/addressOnlyWallet.ts`: `isAddressOnly`, `walletAddress0` (address 0 for either kind) and `addressOnlyError` (validates against the wallet's network).
- Preconditions: `useRequireTestAddress()` accepts it, `useRequireTestWallet()` reports "Test wallet is address-only". RPC stages and Send between wallets (Funding → Test only) use the former; the bet and fee stages accept it at address index 0 only.
- It can't list its own tokens: RPC Get balance lets the QA add tokens by UID or configuration string (`parseTokenInput` in `utils/tokenConfigString.ts`), saved on the wallet as `metadata.tokens` (`setAddressOnlyTokens`).
- Wallets saved before this have no `kind` and are seed wallets.

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
