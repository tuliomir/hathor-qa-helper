# Learning: EIP-6963 Detection & MetaMask Context → Redux Sync

## EIP-6963: How MetaMask Is Discovered

Traditional dApps check `window.ethereum`, but this breaks when multiple wallet extensions compete for that global. [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) fixes this with an event-based discovery protocol:

```
Browser                          Your App
  │                                │
  │  ◄── eip6963:requestProvider ──│   (app asks "who's out there?")
  │                                │
  │── eip6963:announceProvider ──► │   (each wallet announces itself)
  │     { info: { rdns }, ... }    │
```

In `SnapConnectionStage.tsx`, we dispatch `eip6963:requestProvider` and listen for announcements. Each announcement carries `detail.info.rdns` — a reverse-DNS identifier (`io.metamask` or `io.metamask.flask`). This lets us detect MetaMask specifically, even if Phantom/Rabby/etc. are also installed.

The 2-second timeout handles the "no MetaMask" case — if no announcement arrives, we know MetaMask isn't present.

## Context → Redux Sync Pattern

`@hathor/snap-utils` manages snap state in React Context (`MetaMaskProvider` → `useMetaMaskContext()`). But QA Helper uses Redux for cross-stage state persistence. The connection stage bridges these two worlds:

```
MetaMaskProvider (Context)          Redux Store
  │                                    │
  │  installedSnap changes             │
  │  ──── useEffect ────►  dispatch(setSnapConnected({
  │                           installedSnap: { id, version },
  │                           snapOrigin
  │                         }))
  │                                    │
  │  error changes                     │
  │  ──── useEffect ────►  dispatch(setSnapError(msg))
```

This is a one-way sync: Context is the source of truth for connection state, Redux is the persistence/sharing layer. Other snap stages only read from Redux (`selectIsSnapConnected`), never from MetaMask Context directly. This keeps them decoupled from the provider implementation.

## Why Not Just Use Redux Everywhere?

The `useInvokeSnap()` and `useRequestSnap()` hooks from `@hathor/snap-utils` internally use `useMetaMaskContext()` to access the provider. We can't bypass the context — it owns the MetaMask provider reference. So we use the hooks as-is and sync the connection metadata to Redux for the sidebar/banner checks.

## Key Files

- `src/components/stages/SnapConnectionStage.tsx` — EIP-6963 detection + context→Redux sync
- `src/store/slices/snapSlice.ts` — Redux state for connection info
- `src/hooks/useSnapMethod.ts` — shared hook that reads connection state from Redux
- `src/types/snap-utils.d.ts` — type declarations for the untyped package
