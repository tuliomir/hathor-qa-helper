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

## Critical: Melt-Produced HTR vs Existing HTR

**The HTR output from a melt is CREATED by the melt operation, not selected from existing UTXOs.**

This means you **cannot** combine melt-produced HTR with existing HTR transfer in a single transaction:
```typescript
// WRONG - will fail with "Don't have enough utxos to fill total amount"
const totalHtr = existingHtrBalance + htrFromMelts;
builder.addTokenOutput({ amount: totalHtr }); // Template can't find UTXOs for melt-produced HTR!

// CORRECT - separate transactions
// 1. Melt transaction: outputs only the melt-produced HTR
// 2. HTR transfer: outputs the remaining existing HTR
```

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
- **Melt-produced HTR is created, not selected** - don't mix with existing HTR transfers

## Type Handling

The template builder uses Zod schemas with coercion:
- `AmountSchema` accepts: `bigint`, `number`, or `string` matching `/^\d+$/`
- All amounts are internally coerced to `bigint`
- You can pass plain numbers (e.g., `fill: 100`) - no need to use `BigInt(100)`

## Cleanup Strategy (Two-Transaction Approach)

For wallet cleanup operations that need to melt tokens AND transfer existing HTR:

```typescript
// Step 1: Melt all tokens → HTR goes directly to funding wallet
const meltTemplate = buildMeltTemplate(tokens, testAddr, fundingAddr);
await wallet.runTxTemplate(meltTemplate, PIN);
await waitForTxSettlement(txHash);

// Step 2: Transfer remaining HTR balance to funding wallet
const transferTemplate = TransactionTemplateBuilder.new()
  .addSetVarAction({ name: 'to', value: fundingAddr })
  .addSetVarAction({ name: 'change', value: testAddr })
  .addTokenOutput({ address: '{to}', amount: remainingHtrBalance })
  .addCompleteAction({ changeAddress: '{change}' })  // OK for transfers!
  .build();
await wallet.runTxTemplate(transferTemplate, PIN);
```

This two-transaction approach is necessary because:
1. Melt transactions cannot use `addCompleteAction`
2. You cannot combine melt-produced HTR with existing HTR in the same output

## Reference

Source: `https://github.com/HathorNetwork/hathor-wallet-lib/blob/master/__tests__/integration/template/transaction/template.test.ts`
