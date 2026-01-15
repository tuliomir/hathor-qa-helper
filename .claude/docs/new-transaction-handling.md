# Transaction Id Exhibition

When a component creates a new transaction, it's good practice to include some helper elements for the QA engineer to
validate this transaction.

It's always helpful to offer a button to copy the transaction id:
```tsx
<CopyButton text={txHash} label="Copy Tx Id" />
```

When it's a new transaction, offer a way to validate it on the explorer
```tsx
<ExplorerLink hash={txHash} />
```

If the transaction is related to nano contracts, it's important to know when its status and when it has completed, so create a section with all monitoring together. For a full implementation reference, see @src/components/rpc/RpcBetInitializeCard.tsx
```tsx
<div>
	<CopyButton text={txHash} label="Copy Tx Id" />
	<TxStatus hash={txHash} walletId={testWalletId} />
	<ExplorerLink hash={txHash} />
</div>
```
