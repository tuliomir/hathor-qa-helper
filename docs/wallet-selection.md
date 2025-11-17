# Accessing Funding and Test Wallets

This document explains how to access the funding and test wallet information throughout the application.

## Overview

The application maintains global state for two wallet types:
- **Funding Wallet**: Used to fund transactions and send tokens to test wallets
- **Test Wallet**: Used for testing and validation purposes

These are selected by the user in the **Wallet Initialization** stage and stored in Redux for global access.

## Redux Store

The wallet selection state is managed by the `walletSelectionSlice`:

```typescript
// Location: src/store/slices/walletSelectionSlice.ts
interface WalletSelectionState {
  fundingWalletId: string | null;
  testWalletId: string | null;
}
```

## Accessing Wallet IDs

To access the funding or test wallet IDs in any component:

```typescript
import { useAppSelector } from '../../store/hooks';

function MyComponent() {
  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);

  // Use the wallet IDs...
}
```

## Getting Full Wallet Objects

To get the full wallet object with instance and metadata:

```typescript
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppSelector } from '../../store/hooks';

function MyComponent() {
  const { getAllWallets } = useWalletStore();
  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);

  const wallets = getAllWallets();
  const fundingWallet = wallets.find(
    (w) => w.metadata.id === fundingWalletId && w.status === 'ready'
  );

  if (fundingWallet && fundingWallet.instance) {
    // Use the wallet instance
    const address = await fundingWallet.instance.getAddressAtIndex(0);
  }
}
```

## Common Use Cases

### 1. Getting the First Address of Funding Wallet

```typescript
const fundingWallet = wallets.find(
  (w) => w.metadata.id === fundingWalletId && w.status === 'ready'
);

if (fundingWallet?.instance) {
  const firstAddress = await fundingWallet.instance.getAddressAtIndex(0);
}
```

### 2. Sending Transactions from Funding Wallet

See the complete example in `src/components/stages/AddressValidation.tsx` (line 100+):

```typescript
// Get funding wallet
const fundingWallet = wallets.find(
  (w) => w.metadata.id === fundingWalletId && w.status === 'ready'
);

// Build and send transaction
const hWallet = fundingWallet.instance;
const builder = hWallet.TransactionTemplateBuilder();
const template = builder
  .addTokenOutput({
    address: recipientAddress,
    amount,
    token: tokenUid
  })
  .addCompleteAction({
    changeAddress: fundWalletFirstAddress
  });

const tx = await hWallet.buildTxTemplate(template, {
  signTx: true,
  pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE
});

const sendTx = new SendTransaction({ storage: hWallet.storage, transaction: tx });
await sendTx.runFromMining();
```

### 3. Getting Network Configuration

```typescript
import { NETWORK_CONFIG, DEFAULT_NETWORK } from '../../constants/network';

// Get explorer URL for the current network
const explorerUrl = NETWORK_CONFIG[DEFAULT_NETWORK].explorerUrl;
const txUrl = `${explorerUrl}transaction/${txHash}`;
```

## Important Notes

- Always check if the wallet exists and has status `'ready'` before accessing the instance
- The wallet instance is not serializable, so it's excluded from Redux serializability checks
- Wallet IDs can be `null` if no wallet is selected
- Use the `useWalletStore` hook to access wallet instances, and Redux selectors for wallet IDs only

## Related Files

- `src/store/slices/walletSelectionSlice.ts` - Wallet selection Redux slice
- `src/components/stages/WalletInitialization.tsx` - Where wallets are selected
- `src/components/stages/AddressValidation.tsx` - Example of using funding wallet for transactions
- `src/constants/network.ts` - Network configuration constants
