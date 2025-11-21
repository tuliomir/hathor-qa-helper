# Wallet Event Monitoring

Real-time event capture and monitoring for all wallet instances. All events stored in Redux for global access.

## Overview

The system automatically captures ALL wallet events (`new-tx`, `update-tx`, `state`, `more-addresses-loaded`) from every active wallet and stores them in Redux. This enables:
- Real-time transaction status tracking (Unconfirmed → Valid/Voided)
- Cross-stage event access via selectors
- Historical event analysis
- Nano contract confirmation monitoring

## Event Flow

```
Wallet emits event → Event listener → Redux action → walletStore.events[]
                                                            ↓
                                              Selectors expose to stages
```

## Event Types

### `new-tx`
Fired when a new transaction arrives at the wallet.

**Properties**: `tx_id`, `timestamp`, `is_voided`, `first_block`, `inputs`, `outputs`, `version`, etc.

### `update-tx`
Fired when a known transaction is updated (e.g., gets first block, output spent).

**Properties**: Same as `new-tx` but with updated values (especially `first_block`)

### `state`
Fired when wallet state changes (connecting, syncing, ready).

### `more-addresses-loaded`
Fired during address history loading (multiple times per sync).

## Implementation

### 1. Automatic Event Capture

Events are captured automatically in `startWallet` thunk:

```typescript
// src/store/slices/walletStoreSlice.ts
const handleUpdateTx = async (tx: any) => {
  dispatch(addWalletEvent({
    walletId,
    eventType: 'update-tx',
    data: tx,
  }));
  dispatch(refreshWalletBalance(walletId));
};

walletInstance.on('update-tx', handleUpdateTx);
```

All event handlers are stored in `walletEventHandlers` map for cleanup.

### 2. Redux Storage

```typescript
export interface WalletEvent {
  id: string;
  eventType: 'new-tx' | 'update-tx' | 'state' | 'more-addresses-loaded';
  timestamp: number;
  data: any; // Raw event payload from wallet-lib
}

interface StoredWalletInfo {
  // ... other fields
  events: WalletEvent[];
}
```

### 3. Selectors

```typescript
// Get all events for a specific wallet
const events = useAppSelector((state) =>
  selectWalletEvents(state, walletId)
);

// Get all events across all wallets
const allEvents = useAppSelector(selectAllWalletEvents);

// Get events for a specific transaction
const txEvents = useAppSelector((state) =>
  selectEventsByTxHash(state, txHash)
);

// Get latest event for a transaction
const latest = useAppSelector((state) =>
  selectLatestEventForTx(state, txHash)
);
```

## Transaction Status Tracking

### Status Determination

```typescript
import { getTransactionStatus } from '../../utils/transactionStatus';

const status = getTransactionStatus({
  first_block: event.data.first_block,
  is_voided: event.data.is_voided,
});
// Returns: "Unconfirmed" | "Valid" | "Voided"
```

**Unconfirmed**: No `first_block` (pending confirmation)
**Valid**: Has `first_block` and not voided
**Voided**: Transaction is voided

### Monitoring Pattern

```typescript
// In any stage component
const txHash = "000012a556d3..."; // From RPC response

// Watch for updates to this transaction
const latestEvent = useAppSelector((state) =>
  selectLatestEventForTx(state, txHash)
);

useEffect(() => {
  if (!latestEvent) return;

  const status = getTransactionStatus({
    first_block: latestEvent.data.first_block,
    is_voided: latestEvent.data.is_voided,
  });

  if (status === 'Valid') {
    console.log('Transaction confirmed!');
  }
}, [latestEvent]);
```

## Tx Update Events Stage

Located in "Auditing" section. Features:
- Real-time event log for all wallets
- Filter by wallet
- Color-coded event types
- Transaction status badges
- Click to export raw event data
- Pagination (20 per page)

```tsx
// Access in: src/components/stages/TxUpdateEvents.tsx
```

## Naming Convention Compatibility

The system handles both naming conventions for maximum compatibility:
- `tx_id` (current) and `txId` (fallback)
- `first_block` (current) and `firstBlock` (fallback)
- `is_voided` (current) and `voided` (fallback)

```typescript
// Utility automatically checks both
const firstBlock = tx.first_block ?? tx.firstBlock;
const isVoided = tx.is_voided ?? tx.voided;
```

## Common Patterns

### 1. Track Nano Contract Confirmation

```typescript
const BetInitializeStage = () => {
  const [txHash, setTxHash] = useState<string | null>(null);

  const latestEvent = useAppSelector((state) =>
    txHash ? selectLatestEventForTx(state, txHash) : null
  );

  // After creating NC transaction
  const handleInitialize = async () => {
    const response = await rpcClient.call('nc_initialize', params);
    setTxHash(response.hash);
  };

  // Monitor for confirmation
  useEffect(() => {
    if (!latestEvent?.data.first_block) return;

    const status = getTransactionStatus(latestEvent.data);
    if (status === 'Valid') {
      showToast('NC transaction confirmed!');
    }
  }, [latestEvent]);
};
```

### 2. Display Status Badge

```typescript
import { getTransactionStatus, getStatusColorClass } from '../../utils/transactionStatus';

const status = getTransactionStatus(tx);
<span className={`px-2 py-0.5 rounded text-xs ${getStatusColorClass(status)}`}>
  {status}
</span>
```

### 3. Filter Events by Type

```typescript
const allEvents = useAppSelector(selectAllWalletEvents);
const updateEvents = allEvents.filter(e => e.eventType === 'update-tx');
```

## Performance Notes

- Events stored in Redux (persists across navigation)
- NOT persisted to localStorage (memory only during session)
- Selectors memoized for performance
- Event handlers cleaned up on wallet stop

## Best Practices

✅ **DO**:
- Use selectors to access events
- Monitor specific tx hashes for status updates
- Clean up on unmount (automatic via Redux)
- Handle both naming conventions in utilities

❌ **DON'T**:
- Store event handlers in component state
- Manually parse event data (use utilities)
- Assume single naming convention
- Poll for updates (use selectors with React hooks)