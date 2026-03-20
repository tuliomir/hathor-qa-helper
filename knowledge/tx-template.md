# Transaction Templates in Hathor Wallet

Transaction templates provide a declarative way to build complex transactions in a single atomic operation. They're particularly useful for combining multiple operations (melts, transfers, authority management) into one transaction.

## Key Concepts

### Token Deposit/Melt Ratio
- `TOKEN_DEPOSIT_PERCENTAGE = 0.01` (1%)
- **Creating tokens**: 1 HTR deposit = 100 tokens
- **Melting tokens**: 100 tokens = 1 HTR returned

### Template Builder API

```typescript
import { TransactionTemplateBuilder } from '@hathor/wallet-lib';

const template = TransactionTemplateBuilder.new()
  // Set variables (can reference with '{varName}')
  .addSetVarAction({ name: 'addr', value: address })
  .addSetVarAction({ name: 'token', value: tokenUid })

  // Dynamic variable from wallet method call
  .addSetVarAction({
    name: 'balance',
    call: { method: 'get_wallet_balance', token: '{token}' }
  })

  // Select UTXOs for spending
  .addUtxoSelect({ fill: 100, token: '{token}' })
  .addUtxoSelect({ fill: 100, token: '{token}', autoChange: false })

  // Select authority UTXOs
  .addAuthoritySelect({ authority: 'melt', token: '{token}' })
  .addAuthoritySelect({ authority: 'mint', token: '{token}' })

  // Add outputs
  .addTokenOutput({ address: '{addr}', amount: 100, token: '{token}' })
  .addTokenOutput({ address: '{addr}', amount: 1 }) // No token = HTR

  // Preserve authority after using it
  .addAuthorityOutput({ address: '{addr}', authority: 'melt', token: '{token}' })

  // Auto-complete: calculate inputs, change, fees
  .addCompleteAction({ changeAddress: '{addr}' })

  .build();
```

## Execution Methods

### High-Level: `runTxTemplate`
Build, sign, and send in one call:
```typescript
const tx = await wallet.runTxTemplate(template, PIN_CODE);
// tx.hash contains the transaction hash
```

### Granular Control: `buildTxTemplate` + `SendTransaction`
For custom signing or inspection:
```typescript
const tx = await wallet.buildTxTemplate(template, {
  signTx: true,
  pinCode: PIN_CODE,
});

const sendTx = new SendTransaction({
  storage: wallet.storage,
  transaction: tx,
});

const txResponse = await sendTx.runFromMining();
```

## Common Patterns

### Melt Tokens Pattern
Melt 100 tokens to get 1 HTR:
```typescript
const template = TransactionTemplateBuilder.new()
  .addSetVarAction({ name: 'addr', value: address })
  .addSetVarAction({ name: 'token', value: tokenUid })
  .addUtxoSelect({ fill: 100, token: '{token}' })           // Select tokens to melt
  .addAuthoritySelect({ authority: 'melt', token: '{token}' }) // Need melt authority
  .addTokenOutput({ address: '{addr}', amount: 1 })         // Output 1 HTR (no token = HTR)
  .addAuthorityOutput({                                     // Preserve melt authority
    address: '{addr}',
    authority: 'melt',
    token: '{token}'
  })
  .build();
```

### Multi-Token Melt (Atomic Melt Pattern)
Melt multiple tokens in one atomic transaction:
```typescript
const buildMeltTemplate = (
  testWalletAddr: string,
  fundingAddr: string,
  tokensToMelt: Array<{ uid: string; meltableAmount: number }>
) => {
  let builder = TransactionTemplateBuilder.new()
    .addSetVarAction({ name: 'fundingAddr', value: fundingAddr })
    .addSetVarAction({ name: 'testAddr', value: testWalletAddr });

  let totalHtrFromMelts = 0;

  // Add melt operations for each token
  for (const token of tokensToMelt) {
    if (token.meltableAmount <= 0) continue;

    builder = builder
      .addUtxoSelect({ fill: token.meltableAmount, token: token.uid })
      .addAuthoritySelect({ authority: 'melt', token: token.uid })
      .addAuthorityOutput({
        authority: 'melt',
        token: token.uid,
        address: '{testAddr}'  // Keep authority in test wallet
      });

    totalHtrFromMelts += Math.floor(token.meltableAmount / 100);
  }

  // Output ONLY the HTR produced by melting
  if (totalHtrFromMelts > 0) {
    builder = builder.addTokenOutput({
      address: '{fundingAddr}',
      amount: totalHtrFromMelts,
    });
  }

  // CRITICAL: Do NOT use addCompleteAction for melt transactions!
  // See "Why No addCompleteAction for Melts" section below

  return builder.build();
};
```

## Critical: Why No `addCompleteAction` for Melts

**Never use `addCompleteAction` in melt transactions.** Here's why:

### How Melting Works at the Protocol Level

When you melt tokens:
1. **Input**: Token UTXOs (the tokens to destroy) + Melt Authority UTXO
2. **Output**: HTR (created by the protocol at 100 tokens → 1 HTR rate)

The tokens are **destroyed** - they go in as inputs but have no corresponding outputs.

### What `addCompleteAction` Does

The `completeTokenInputAndOutputs` function in the template executor:
1. Checks token balance: `inputs - outputs`
2. If **positive balance** (more inputs than outputs): Creates **change outputs** to return the "surplus"
3. If **negative balance** (more outputs than inputs): Selects more UTXOs to cover the deficit

### Why This Breaks Melting

For a melt transaction:
- Token inputs: 100 tokens
- Token outputs: 0 (tokens are destroyed)
- Balance: +100 tokens (positive "surplus")

`addCompleteAction` sees this as "you have 100 tokens extra, let me create a change output to give them back to you." This **prevents the melt** because the tokens are returned instead of being destroyed!

### Correct Melt Template Structure

```typescript
// CORRECT - No addCompleteAction
const meltTemplate = TransactionTemplateBuilder.new()
  .addSetVarAction({ name: 'addr', value: address })
  .addUtxoSelect({ fill: 100, token: tokenUid })           // Select tokens to melt
  .addAuthoritySelect({ authority: 'melt', token: tokenUid }) // Select melt authority
  .addTokenOutput({ address: '{addr}', amount: 1 })        // Output 1 HTR
  .addAuthorityOutput({ address: '{addr}', authority: 'melt', token: tokenUid })
  // NO addCompleteAction!
  .build();
```

## Combining Melt + HTR Transfer in ONE Transaction

**You CAN combine melt and existing HTR transfer in a single transaction!** The key is to manually select HTR UTXOs instead of using `addCompleteAction`.

### How It Works

The protocol handles melt conversion at validation time:
1. Token inputs > token outputs (with melt authority) = melt operation
2. Melt produces HTR at 100 tokens → 1 HTR rate
3. This melt-produced HTR covers any HTR output deficit

### The Pattern

```typescript
const buildUnifiedCleanupTemplate = (
  tokensToMelt: Array<{ uid: string; meltableAmount: number }>,
  testWalletAddr: string,
  fundingAddr: string,
  existingHtrBalance: bigint
) => {
  let builder = TransactionTemplateBuilder.new()
    .addSetVarAction({ name: 'fundingAddr', value: fundingAddr })
    .addSetVarAction({ name: 'testAddr', value: testWalletAddr });

  let totalHtrFromMelts = 0;

  // Add melt operations for each token
  for (const token of tokensToMelt) {
    if (token.meltableAmount <= 0) continue;

    builder = builder
      .addUtxoSelect({ fill: token.meltableAmount, token: token.uid })
      .addAuthoritySelect({ authority: 'melt', token: token.uid })
      .addAuthorityOutput({
        authority: 'melt',
        token: token.uid,
        address: '{testAddr}'
      });

    totalHtrFromMelts += Math.floor(token.meltableAmount / 100);
  }

  // MANUALLY select existing HTR (instead of addCompleteAction)
  if (existingHtrBalance > 0n) {
    builder = builder.addUtxoSelect({
      fill: existingHtrBalance,
      token: NATIVE_TOKEN_UID,  // '00' for HTR
    });
  }

  // Output ALL HTR: existing + melt-produced
  const totalHtrOutput = Number(existingHtrBalance) + totalHtrFromMelts;
  if (totalHtrOutput > 0) {
    builder = builder.addTokenOutput({
      address: '{fundingAddr}',
      amount: totalHtrOutput,
    });
  }

  // NO addCompleteAction - we manually handled everything
  return builder.build();
};
```

### Why This Works

The transaction balances at the protocol level:

| Component | Balance |
|-----------|---------|
| Token inputs | +tokenAmount (selected for melt) |
| Token outputs | 0 (no token change = melted!) |
| HTR inputs | +existingHtrBalance (manually selected) |
| HTR from melt | +totalHtrFromMelts (created by protocol) |
| HTR output | -(existingHtrBalance + totalHtrFromMelts) |
| **Net** | **0** ✓ |

The template executor builds the transaction structure, and the **protocol** validates that the melt operation produces enough HTR to cover the deficit.

## Benefits of Template Transactions

1. **Atomic**: All operations in a template succeed or fail together
2. **Reduced fees**: One melt tx for N tokens instead of N separate melt txs
3. **Faster**: No waiting between melt operations
4. **Cleaner state**: No partial cleanup states

## Important Notes

- `addTokenOutput` without a `token` parameter defaults to HTR (native token)
- `addCompleteAction` auto-calculates required inputs and change outputs - **but breaks melt transactions!**
- Authority outputs are required to preserve mint/melt capabilities after use
- Variables set with `addSetVarAction` can be referenced with `{varName}` syntax
- The `fill` parameter in `addUtxoSelect` accepts `number`, `bigint`, or `string` - all coerced to bigint internally
- **Melt-produced HTR is created by the protocol** - manually select existing HTR UTXOs to combine in one tx
- **addCompleteAction options**: `token` limits which token to process, `skipChange` prevents change outputs

## Type Handling

The template builder uses Zod schemas with coercion:
- `AmountSchema` accepts: `bigint`, `number`, or `string` matching `/^\d+$/`
- All amounts are internally coerced to `bigint`
- You can pass plain numbers (e.g., `fill: 100`) - no need to use `BigInt(100)`

## Cleanup Strategy (Single-Transaction Approach)

For wallet cleanup operations that need to melt tokens AND transfer existing HTR, use the unified template:

```typescript
// Single transaction: Melt ALL tokens + transfer ALL HTR
const cleanupTemplate = buildUnifiedCleanupTemplate(
  tokensWithMeltAuthority,
  testWalletAddr,
  fundingAddr,
  existingHtrBalance
);
const tx = await wallet.runTxTemplate(cleanupTemplate, PIN);
await waitForTxSettlement(tx.hash);
// Done! All tokens melted and all HTR transferred in ONE atomic transaction
```

### Benefits of Single-Transaction Cleanup

1. **Truly Atomic**: Melt and transfer succeed or fail together
2. **Single Fee**: One transaction fee instead of two
3. **Faster**: No waiting between transactions
4. **Simpler State**: No intermediate states to manage

### Fallback: HTR-Only Transfer

When there are no tokens to melt, use a simple HTR transfer (can use `addCompleteAction`):

```typescript
if (tokensToMelt.length === 0 && htrBalance > 0n) {
  const transferTemplate = TransactionTemplateBuilder.new()
    .addSetVarAction({ name: 'to', value: fundingAddr })
    .addSetVarAction({ name: 'change', value: testAddr })
    .addTokenOutput({ address: '{to}', amount: htrBalance })
    .addCompleteAction({ changeAddress: '{change}' })  // OK when no melt!
    .build();
  await wallet.runTxTemplate(transferTemplate, PIN);
}
```

## Reference

Source: `https://github.com/HathorNetwork/hathor-wallet-lib/blob/master/__tests__/integration/template/transaction/template.test.ts`
