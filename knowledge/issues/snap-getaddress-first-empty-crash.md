# Bug: `htr_getAddress` with type `first_empty` crashes during dialog rendering

## Summary

Calling `htr_getAddress` with `{ type: 'first_empty' }` never shows a MetaMask confirmation dialog. The snap returns an error silently because the dialog JSX rendering crashes when `data.index` is `null`.

The `index` type works perfectly — any index value returns the expected confirmation dialog and address response.

## Steps to Reproduce

1. Install the Hathor Snap (local dev or npm)
2. Call `htr_getAddress` with params `{ type: 'first_empty' }`
3. Observe: no MetaMask confirmation dialog appears, the snap returns an error after ~1.5-2s
4. Compare with `{ type: 'index', index: 0 }` — this shows the confirmation dialog correctly

## Root Cause

The bug is a three-layer problem:

### 1. `address.tsx` — Unguarded `.toString()` on potentially null `data.index`

```tsx
// packages/snap/src/dialogs/address.tsx, line 22-33
const renderAddressIndex = (data, params) => {
  if (params.type === 'index') {
    // We already show the address index at the params box
    return null;  // ← Skips for 'index' type, so the bug never triggers
  }

  return (
    <Text>
      Address at index {data.index.toString()}  // ← CRASHES when data.index is null
    </Text>
  );
}
```

For `index` type, this function returns `null` (line 23-25), so the buggy `.toString()` call on line 30 is never reached. For `first_empty`, it tries to render the address index, but `data.index` can be `null`.

### 2. `wallet.ts` — Read-only wallet started with `skipAddressFetch: true`

```ts
// packages/snap/src/utils/wallet.ts, line 98
await wallet.startReadOnly({ skipAddressFetch: true });
```

`GetAddress` is in `READ_ONLY_METHODS`, so it uses `getAndStartReadOnlyHathorWallet()`. This wallet is started with `skipAddressFetch: true`, which means the wallet-service wallet may not have complete address index data when `getCurrentAddress()` is called.

### 3. `getAddress.ts` — Unsafe type assertion

```ts
// packages/hathor-rpc-handler/src/rpcMethods/getAddress.ts, line 82-84
case 'first_empty':
  addressInfo = await wallet.getCurrentAddress() as AddressInfoObject;
  //                                              ^^^^^^^^^^^^^^^^^^
  //                  Type assertion hides the fact that index can be null
  break;
```

`getCurrentAddress()` can return `{ address, index: null, addressPath }` on a wallet that skipped address fetch. The `as AddressInfoObject` assertion masks this because `AddressInfoObject.index` is typed as `number` (not `number | null`).

Compare with the `index` type which explicitly constructs the object:

```ts
case 'index': {
  const address = await wallet.getAddressAtIndex(params.index);
  const addressPath = await wallet.getAddressPathForIndex(params.index);
  addressInfo = { address, index: params.index, addressPath };  // ← Safe: params.index is always a number
  break;
}
```

## What Happens at Runtime

1. User calls `htr_getAddress` with `{ type: 'first_empty' }`
2. Snap starts read-only wallet with `skipAddressFetch: true`
3. `wallet.getCurrentAddress()` returns `{ address: 'W...', index: null, addressPath: '...' }`
4. Prompt handler calls `addressPage(data, params, origin)`
5. `renderAddressIndex` tries `data.index.toString()` → `null.toString()` → **TypeError**
6. Error propagates through `handleRpcRequest` → `onRpcRequest` catch block → `SnapError`
7. MetaMask returns the error to the dApp — **no confirmation dialog is ever shown**

## Suggested Fix

**In `packages/snap/src/dialogs/address.tsx`**, guard against null index:

```tsx
const renderAddressIndex = (data, params) => {
  if (params.type === 'index') {
    return null;
  }

  if (data.index == null) {
    return null;
  }

  return (
    <Text>
      Address at index {data.index.toString()}
    </Text>
  );
}
```

**Optionally, in `packages/hathor-rpc-handler/src/rpcMethods/getAddress.ts`**, add a runtime check:

```ts
case 'first_empty': {
  const currentAddr = await wallet.getCurrentAddress();
  addressInfo = {
    address: currentAddr.address,
    index: currentAddr.index ?? 0,
    addressPath: currentAddr.addressPath,
  };
  break;
}
```

## Environment

- Snap: local dev build from `hathor-rpc-lib` main branch
- MetaMask Flask v12.x
- Tested via [Hathor QA Helper](https://github.com/AugustoResworworck/qa-helper) Snaps section
- `htr_getAddress` with `{ type: 'index', index: N }` works correctly for any N

---

## Prompt this to Claude Code to fix it

> In `packages/snap/src/dialogs/address.tsx`, the `renderAddressIndex` function crashes when `data.index` is `null` because it calls `data.index.toString()` without a null check. This happens for `first_empty` address type because `wallet.getCurrentAddress()` on a read-only wallet (started with `skipAddressFetch: true` in `packages/snap/src/utils/wallet.ts`) can return a null index.
>
> Fix `renderAddressIndex` in `address.tsx` to return `null` when `data.index` is null or undefined. Also fix the `first_empty` case in `packages/hathor-rpc-handler/src/rpcMethods/getAddress.ts` to provide a fallback index (e.g., `currentAddr.index ?? 0`) instead of blindly casting with `as AddressInfoObject`. The test in `packages/hathor-rpc-handler/__tests__/rpcMethods/getAddress.test.ts` mocks `getCurrentAddress` incorrectly as returning a plain string — update it to return `{ address: 'test-address', index: 0, addressPath: "m/44'/280'/0'/0/0" }`.
