# Shielded outputs in the client

What the browser client (`apps/client`) can and cannot do with Shielded Outputs, on wallet-lib 4.2.0 and `@hathor/ct-crypto-wasm` 0.5.0. Shielded *sends* belong to the QA server (`apps/server`, see `server.md`).

## Capabilities

| Action | Browser | Where |
|---|---|---|
| Derive shielded addresses (`K3…`, 97 chars) | yes | `getAddressAtIndex(i, { legacy: false })` |
| Receive and decode shielded outputs | yes | wallet sync with the WASM provider |
| Show the shielded capability | yes | `walletStore.wallets[id].shieldedCapability` |
| Create shielded outputs | **no** | QA server |
| Spend shielded UTXOs (unshield, sweep) | **no** | QA server |
| Multisig shielded addresses | **no** | wallet-lib throws by design |

## The WASM provider is verifier-only

`@hathor/ct-crypto-wasm` implements the verifier primitives only. Signing, RNG, surjection-proof creation and balancing blinding factors throw. Creating a shielded output needs these, and so does spending a shielded UTXO to a transparent output.

- `src/services/shieldedProvider.ts`: `enableShieldedProvider(wallet, network)` registers the provider before `start()`, only on networks with `supportsShielded`. The `.wasm` is loaded once, through a dynamic import.
- `startWallet` calls it. Multisig wallets never get a provider.
- Vite: `optimizeDeps.exclude: ['@hathor/ct-crypto-wasm']`. Pre-bundling breaks the `new URL('…wasm', import.meta.url)` lookup.

## The `canSpend` trap

With the WASM provider, `getShieldedCapability()` still reports `level: 'full', canSpend: true`. `canSpend` only checks that the wallet record holds the spend key; it says nothing about what the provider can do.

- Never gate a client-side shielded send on `canSpend` or `level`.
- Use `canCreateShieldedOutputs()` (`src/services/shieldedCapability.ts`). It is false while `BROWSER_PROVIDER_CAN_PROVE` is false.
- The capability badge (`ShieldedCapabilityBadge`) shows `full` and `view` as "receive-only".

## UTXOs and balances

- `getBalance()` counts shielded UTXOs.
- `getUtxos()` and `getAvailableUtxos()` list transparent UTXOs only by default. `{ shielded: true }` lists shielded UTXOs *only*.
- Input selection (`sendManyOutputsSendTransaction`, templates) is transparent-only.
- So sweeps must send the transparent amount only. `splitAvailableUtxos(wallet, token)` (`src/services/shieldedUtxos.ts`) returns both totals. `shieldedSweepNotice()` builds the "N shielded UTXOs not sweepable from the browser — use the QA server" message.
- Test Wallet Cleanup and the scatter tool in Get UTXOs use it.

## Tx mining

wallet-lib keeps the tx-mining URL in the global `config` singleton. Without one it derives the URL from the lib network name, and the shielded testnet reports `testnet`, so it would mine on the regular testnet service.

- `applyNetworkServices(network)` (`src/services/networkServices.ts`) is the only place that sets it.
- Call it before every wallet start and every send. Existing call sites: `startWallet`, multisig start and send, `useSendTransaction`, melt, scatter, injections, cleanup.
- Mining polls the service after the send call returns. Sending from two networks at the same moment can still race on the singleton.

## Not covered yet

- WalletConnect and Snap stages still assume `testnet` (`hathor:testnet`). `hathor-rpc-handler` has no shielded RPC methods.
- The Shielded stages (`shielded-qa-stages.md`) cover sends, balances and the tx inspector through the QA server.
