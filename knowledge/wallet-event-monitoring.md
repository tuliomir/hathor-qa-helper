# Wallet Event Monitoring

Real-time event capture and monitoring for all wallet instances. All events stored in Redux for global access.

## Overview

The system automatically captures ALL wallet events (`new-tx`, `update-tx`, `state`, `more-addresses-loaded`) from every active wallet and stores them in Redux. This enables:
- Real-time transaction status tracking (Unconfirmed → Valid/Voided)
- Cross-stage event access via selectors
- Historical event analysis
- Transaction settlement and confirmation monitoring

## Transaction Lifecycle: Three Stages

After sending a transaction, there are **three distinct stages**:

### Stage 1: Mining Completion (`runFromMining()`)
- Transaction is broadcast and accepted by the network
- Returns the transaction hash
- **NOT sufficient** to proceed with dependent operations

### Stage 2: Wallet Internal Sync (`new-tx` event)
- Wallet-lib receives the `new-tx` event from the network
- Internal state is updated: UTXOs, balances, caches, indexes
- **Required** for simple transactions before proceeding

### Stage 3: Block Confirmation (`first_block`)
- Transaction is included in a block
- `first_block` field is populated with the block hash
- **Required** for nano contract transactions

## When to Wait for What

| Transaction Type | Wait For | Utility |
|-----------------|----------|---------|
| Token transfers | Stage 2 (Settlement) | `waitForTxSettlement()` |
| Token melts | Stage 2 (Settlement) | `waitForTxSettlement()` |
| Token mints | Stage 2 (Settlement) | `waitForTxSettlement()` |
| HTR transfers | Stage 2 (Settlement) | `waitForTxSettlement()` |
| NC initialize | Stage 3 (Confirmation) | `waitForTxConfirmation()` |
| NC method calls | Stage 3 (Confirmation) | `waitForTxConfirmation()` |

**Why the distinction?**
- Simple transactions: The wallet needs to update its internal UTXO index before you can make another transaction that might use those UTXOs
- NC transactions: The nano contract state must be confirmed on-chain before you can read/write it

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

### Settlement Utility (For Simple Transactions)

Use `waitForTxSettlement()` for token operations to ensure the wallet has processed the transaction:

```typescript
import { waitForTxSettlement } from '../../utils/waitForTxSettlement';

const handleMeltTokens = async () => {
  const sendTx = await wallet.meltTokensSendTransaction(tokenUid, amount, options);
  const txResponse = await sendTx.runFromMining();
  const txHash = txResponse?.hash;

  if (txHash) {
    // Wait for wallet to receive and process the tx event
    await waitForTxSettlement(txHash);

    // NOW safe to check balances, make another transaction, etc.
    dispatch(refreshWalletBalance(walletId));
    showToast('Tokens melted successfully!');
  }
};
```

### Confirmation Utility (For Nano Contracts Only)

Use `waitForTxConfirmation()` for NC operations where you need on-chain state:

```typescript
import { waitForTxConfirmation } from '../../utils/waitForTxSettlement';

const handleInitializeNC = async () => {
  const response = await rpcClient.call('nc_initialize', params);
  const ncTxHash = response.hash;

  // Wait for block confirmation (first_block)
  await waitForTxConfirmation(ncTxHash);

  // NOW safe to call NC methods or read NC state
  console.log('NC initialized and confirmed!');
};
```

### React Hook Pattern (For UI Status Tracking)

For displaying transaction status in the UI, use the selector pattern:

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

### 1. Simple Token Operations (Settlement Required)

For token transfers, melts, and mints, wait for wallet internal sync:

```typescript
import { waitForTxSettlement } from '../../utils/waitForTxSettlement';

const handleMeltTokens = async () => {
  const sendTx = await wallet.meltTokensSendTransaction(tokenUid, amount, options);
  const txResponse = await sendTx.runFromMining();
  const txHash = txResponse?.hash;

  if (txHash) {
    console.log('Melt broadcast:', txHash);

    // Wait for wallet to process the transaction
    await waitForTxSettlement(txHash);

    // NOW safe to check balances or make another transaction
    dispatch(refreshWalletBalance(walletId));
    showToast('Tokens melted successfully!');
  }
};
```

### 2. NC Operations (Confirmation Required)

NC transactions need block confirmation before state can be accessed:

```typescript
import { waitForTxConfirmation } from '../../utils/waitForTxSettlement';

const handleInitializeNC = async () => {
  const response = await rpcClient.call('nc_initialize', params);
  const ncTxHash = response.hash;

  console.log('NC init broadcast:', ncTxHash);

  // Wait for block confirmation
  await waitForTxConfirmation(ncTxHash);

  // NOW safe to call NC methods or read NC state
  showToast('NC initialized and confirmed!');
};
```

### 3. Display Status Badge

```typescript
import { getTransactionStatus, getStatusColorClass } from '../../utils/transactionStatus';

const status = getTransactionStatus(tx);
<span className={`px-2 py-0.5 rounded text-xs ${getStatusColorClass(status)}`}>
  {status}
</span>
```

### 4. Filter Events by Type

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
- Use `waitForTxSettlement()` after simple transactions (sends, melts, mints)
- Use `waitForTxConfirmation()` for NC transactions
- Use selectors to access events in React components
- Handle both naming conventions in utilities (`tx_id`/`txId`, etc.)
- Clean up on unmount (automatic via Redux)

❌ **DON'T**:
- Proceed immediately after `runFromMining()` without waiting for settlement
- Wait for block confirmation for simple transactions (unnecessary delay)
- Store event handlers in component state
- Manually parse event data (use utilities)
- Assume single naming convention
- Poll for updates (use selectors with React hooks)