# Bug: TransactionTemplateBuilder silently discards timelock on token outputs

## Summary

`TransactionTemplateBuilder.addTokenOutput({ timelock })` accepts a `timelock`
parameter and stores it in the template instruction, but the template executor
never encodes it into the output script. The timelock is silently discarded,
producing an unlocked output instead of a timelocked one.

## Reproduction

```typescript
import { TransactionTemplateBuilder } from '@hathor/wallet-lib';

const template = TransactionTemplateBuilder.new()
  .addSetVarAction({ name: 'addr', value: recipientAddress })
  .addSetVarAction({ name: 'change', value: changeAddress })
  .addTokenOutput({
    address: '{addr}',
    amount: 5n,
    token: '00',
    timelock: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
  })
  .addCompleteAction({ changeAddress: '{change}' })
  .build();

const tx = await wallet.buildTxTemplate(template, { signTx: true, pinCode });
// tx output has NO timelock — it's a plain P2PKH output
```

**Expected:** The output script contains timelock bytes
(`OP_PUSHDATA <4-byte-timestamp> OP_GREATERTHAN_TIMESTAMP` prefix before the
standard P2PKH opcodes).

**Actual:** The output script is a plain P2PKH without timelock. The `timelock`
value from the instruction is read by the executor but never passed to the
script builder.

## Root Cause

In `lib/template/transaction/executor.js`, the `execTokenOutputInstruction`
function (around line 313) does this:

```javascript
// Line 321: timelock IS read from the instruction
const timelock = getVariable(ins.timelock, ctx.vars, ...);

// Line 343: script is created WITHOUT timelock
const script = createOutputScriptFromAddress(address, interpreter.getNetwork());

// Line 344-347: timelock is passed to Output constructor, which IGNORES it
const output = new Output(amount, script, {
  timelock,    // <-- silently discarded
  tokenData
});
```

The `Output` constructor (`lib/models/output.js`) only uses `tokenData` from
the options object — it does not process `timelock`. The timelock must be
encoded into the **script itself** via the `P2PKH` model, which does handle it:

```javascript
// P2PKH constructor accepts timelock
const p2pkh = new P2PKH(addressObj, { timelock: 1742240000 });
const script = p2pkh.createScript();
// Script correctly contains: OP_PUSHDATA <timestamp> OP_GREATERTHAN_TIMESTAMP ...
```

## Affected Executors

The same pattern (script created without timelock, timelock passed to Output
constructor) appears in three executors:

1. **`execTokenOutputInstruction`** (line ~343) — `addTokenOutput()`
2. **`execAuthorityOutputInstruction`** (line ~402) — `addAuthorityOutput()`
3. **`execRawOutputInstruction`** (line ~264) — `addRawOutput()` (uses raw hex
   script, so the fix approach differs)

## Impact

Any consumer using `TransactionTemplateBuilder.addTokenOutput({ timelock })`
gets silently wrong behavior — outputs appear unlocked when they should be
timelocked. The Zod schema accepts the field, the instruction stores it, the
executor reads it, but the script builder never receives it.
