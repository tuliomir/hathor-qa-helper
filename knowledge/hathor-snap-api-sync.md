# Hathor Snap API Sync Guide

How to audit the QA Helper's MetaMask Snaps section against the current Hathor Snap source code and add/update endpoints efficiently.

## Source of Truth

The snap implementation lives at **`~/code/hathor-rpc-lib`** (or clone from `github.com/HathorNetwork/hathor-rpc-lib`). Three packages matter:

| Package | Path | Purpose |
|---------|------|---------|
| `snap` | `packages/snap/` | MetaMask Snap entry point (`onRpcRequest`) |
| `hathor-rpc-handler` | `packages/hathor-rpc-handler/` | Method routing + handlers |
| `snap-utils` | `packages/snap-utils/` | React hooks (`useInvokeSnap`, `MetaMaskProvider`) |

## Step 1: Get the Canonical Method List

```bash
# All RPC method enum values (the snap's API surface)
grep -n "= 'htr_" packages/hathor-rpc-handler/src/types/rpcRequest.ts
```

This shows every `RpcMethods` enum entry. Example output:
```
CreateToken = 'htr_createToken',
GetUtxos = 'htr_getUtxos',
GetAddress = 'htr_getAddress',
...
```

## Step 2: Check Which Methods Are Actually Routed

```bash
# The switch statement in the RPC handler — only methods listed here are live
grep "case RpcMethods\." packages/hathor-rpc-handler/src/rpcHandler/index.ts
```

Methods in the enum but NOT in the switch are defined but unimplemented (e.g., `PushTxHex`, `GetOperationStatus` as of v0.1.0).

## Step 3: Compare Against QA Helper Coverage

```bash
# Methods the QA Helper already handles
grep "invoke('htr_" ~/code/qa-helper/src/services/snapHandlers.ts
```

Diff the two lists. Any method in the handler switch but not in `snapHandlers.ts` needs a new stage.

## Step 4: For Each Missing Method — Gather the Spec

For a method like `htr_newMethod`, check these files in order:

### 4a. Request type (what params does it expect?)
```bash
# Find the TypeScript interface for the request
grep -A 10 "newMethod" packages/hathor-rpc-handler/src/types/rpcRequest.ts
```

Key things to note:
- **`network` is auto-injected** by the snap's `onRpcRequest` (line ~71 of `packages/snap/src/index.tsx`). Never send it from the QA Helper.
- Required vs optional fields
- Which fields use specific types (e.g., `z.number().int().nonneg()`)

### 4b. Zod validation schema (exact constraints)
```bash
# Find the handler file for the specific method
find packages/hathor-rpc-handler/src/rpcMethods/ -name "*.ts" | xargs grep -l "newMethod"
```

Look at the Zod schema — it tells you exact field names, types, and validation rules. Pay attention to discriminated unions (like `getAddress` uses `type` as discriminator).

### 4c. Response type (what does it return?)
```bash
grep "RpcResponseTypes\." packages/hathor-rpc-handler/src/rpcMethods/newMethod.ts
```

The response is wrapped in `{ type: RpcResponseTypes.X, response: ... }`. The `type` number maps to a specific formatter in `SnapResponseDisplay.tsx`.

### 4d. Read-only or full wallet?
```bash
grep "READ_ONLY_METHODS" packages/snap/src/index.tsx
```

Methods in `READ_ONLY_METHODS` use a read-only wallet (faster startup, no signing). Others start the full wallet.

### 4e. Origin restrictions
```bash
cat packages/snap/src/constants.ts
```

Check `RPC_RESTRICTIONS` — some methods are restricted to specific origins (e.g., `GetXpub` only allows `wallet.hathor.network`).

## Step 5: Add the New Stage to QA Helper

Files to modify (in order):

1. **`src/services/snapHandlers.ts`** — Add handler function
2. **`src/types/stage.ts`** — Add stage ID to `StageId` union + `STAGE_GROUPS` snaps array
3. **`src/config/stageRoutes.ts`** — Add slug mapping
4. **`src/components/stages/SnapNewMethodStage.tsx`** — Create stage component (copy pattern from similar stage)
5. **`src/components/StageContent.tsx`** — Import and register in `STAGE_COMPONENT_MAP`
6. **`src/components/snap/SnapResponseDisplay.tsx`** — Add formatted response renderer for new response type number
7. **`e2e/helpers/stage-navigator.ts`** — Add to `MAIN_QA_STAGES` array
8. **`tests/snapHandlers.test.ts`** — Add dry-run + live-mode tests
9. **`tests/stage.test.ts`** — Add to `expectedStages` list
10. **`tests/stageRoutes.test.ts`** — Update stage count + add URL/slug tests

## Key Architectural Notes

### Request Flow
```
QA Helper UI → snapHandlers.ts → useInvokeSnap() → MetaMask → snap onRpcRequest → handleRpcRequest → method handler
```

### Parameter Rules
- The snap **auto-injects `network`** into every request's params — don't include it
- For methods with discriminated union params (like `getAddress`), only send the fields that match the selected variant. Extra fields are stripped by Zod but shouldn't be sent.
- The snap returns responses as JSON strings via `JSONBigInt.stringify()` (BigInt-safe)

### Response Envelope
All responses follow `{ type: N, response: ... }` where N is a `RpcResponseTypes` enum value:
- 2 = GetAddress, 3 = GetBalance, 4 = GetNetwork, 5 = GetUtxos
- 7 = SignOracleData, 8 = SendTransaction/SignWithAddress, 9 = CreateNcToken
- 10 = ChangeNetwork, 11 = GetXpub, 12 = GetWalletInformation

New methods will have new type numbers — check `RpcResponseTypes` enum.

### Stage Ordering Convention
Stages are ordered by progressive test complexity in `STAGE_GROUPS`:
1. Connection
2. No-approval reads (getNetwork, getWalletInfo)
3. Read-only with approval (getAddress, getBalance, getUtxos, getXpub)
4. Signatures (signWithAddress, signOracleData)
5. Transactions (sendTransaction, createToken, changeNetwork)
6. Nano contracts (sendNanoContractTx, createNcToken)

Place new stages in the appropriate tier.

## Quick Diff Command

One-liner to see what's missing:

```bash
diff <(grep "case RpcMethods\." ~/code/hathor-rpc-lib/packages/hathor-rpc-handler/src/rpcHandler/index.ts | sed "s/.*'\(htr_[^']*\)'.*/\1/" | sort) <(grep "invoke('htr_" ~/code/qa-helper/src/services/snapHandlers.ts | sed "s/.*invoke('\(htr_[^']*\)'.*/\1/" | sort)
```

Lines prefixed with `<` are in the snap but missing from QA Helper.
