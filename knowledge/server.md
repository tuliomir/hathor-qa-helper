# QA server (`apps/server`)

A localhost-only Bun HTTP server that holds Hathor wallets with the native shielded crypto provider, so QA Helper can create shielded outputs.

## Why it exists

Browsers can receive and inspect shielded transactions but cannot create them. The only browser provider, `@hathor/ct-crypto-wasm`, is verifier-only: shielded sends and spends of shielded UTXOs (unshielding) throw. Watch out: a WASM-backed wallet still reports `getShieldedCapability()` as `full` with `canSpend: true`, so never gate a client-side send on it.

The server uses `@hathor/ct-crypto-node` (NAPI), which implements the full prover. The client sends it a test wallet's seed, and the server runs that wallet and performs the sends.

## Running it

From the repo root:

```bash
bun run dev:server            # 127.0.0.1:5180, restarts on change
bun run dev:all               # client and server together
QA_SERVER_PORT=5190 bun run dev:server
```

The client reaches it directly or through the Vite dev proxy prefix `/qa-server`. The server strips that prefix, so both paths work.

Tests: `bun run test` from the root runs the router tests with a fake wallet factory. The live smoke test against the shielded testnet is opt-in:

```bash
cd apps/server && SO_LIVE=1 bun test tests/live.test.ts
```

## Modules

| File | Role |
|---|---|
| `src/index.ts` | Boot: `Bun.serve` on 127.0.0.1, request log (method, path, status only), graceful shutdown |
| `src/app.ts` | `createApp(deps)` returns `(req) => Response`: routing, zod validation, CORS, prefix stripping. Testable without a socket |
| `src/walletRegistry.ts` | Sessions keyed by legacy addr0, the `starting → ready \| error` lifecycle, the send queue |
| `src/walletFactory.ts` | The only module that builds `HathorWallet`s or loads the native provider |
| `src/walletPort.ts` | `LibWallet` / `WalletFactory` interfaces the rest of the server depends on |
| `src/sendMapping.ts` | Contract mode names → wallet-lib enums (`ShieldedOutputMode`, `OutputKind.TRANSPARENT`) |
| `src/json.ts`, `src/errors.ts` | BigInt-safe JSON; lib errors → `ApiErrorBody` codes |

## Endpoints

The contract lives in `packages/shared/src/serverApi.ts`. Amounts are decimal strings. Errors are `{ error: { code, message } }`.

| Method + path | Body / query | Response |
|---|---|---|
| `GET /health` | — | `HealthResponse` |
| `POST /wallets` | `{ seed, network }` | `WalletSession`: 202 when it starts a wallet, 200 when one is already running. A session in `error` is restarted. The same seed on another network is 409 |
| `GET /wallets` | — | `WalletSession[]` |
| `GET /wallets/:id` | — | `WalletSession` (poll it to follow `starting → ready`) |
| `DELETE /wallets/:id` | — | `{ ok: true }`; stops the wallet |
| `GET /wallets/:id/addresses` | `?index=0&kind=legacy\|shielded` | `AddressResponse` |
| `GET /wallets/:id/balance` | `?token=00` | `BalanceResponse` |
| `GET /wallets/:id/utxos` | `?token=00&shielded=true` | `UtxosResponse` |
| `POST /wallets/:id/send` | `SendRequest` | `SendResponse` |
| `GET /wallets/:id/tx/:txId/unblinding` | — | `getShieldedUnblindingForTx` result, stringified |

Wallet routes other than `GET`/`DELETE` answer 409 `WALLET_NOT_READY` until the session is `ready`. Unknown ids are 404 `NOT_FOUND`.

Behaviour worth knowing:

- **Balance** includes decoded shielded outputs. wallet-lib 4.2.0 credits them to the same token balance as transparent ones, with no split. For the shielded part alone, sum `/utxos?shielded=true`.
- **UTXOs**: the lib filters strictly. `shielded=true` returns only shielded UTXOs and `shielded=false` (the default) only transparent ones.
- **Send**: `shielded` per output maps to `ShieldedOutputMode`. `changeShieldedMode` maps to the same enum, or `'TRANSPARENT'` to `OutputKind.TRANSPARENT`. Leaving it out lets the lib's automatic change rules decide. The protocol needs at least two shielded outputs; the lib pads with change.
- **Errors**: shortfalls are 422 `INSUFFICIENT_FUNDS`; bad addresses and values from the lib are 400; other lib failures are 500 `LIB_ERROR`.

## Security model

- **Dev-only.** It binds `127.0.0.1` and has no authentication.
- **It holds seeds.** The client sends testnet seeds, and wallets keep them in memory until they are deleted or the server stops. Seeds are never logged or returned. Use test wallets only.
- **Browser guards.** Only loopback origins pass: `http://localhost:<port>` and `http://127.0.0.1:<port>`, any port (`isAllowedOrigin` in `src/app.ts`). Any other `Origin` is refused with 403 before routing, because a "simple" cross-site POST skips preflight. Requests whose `Host` is not `localhost`/`127.0.0.1` are refused too, whatever their `Origin`, which blocks DNS rebinding. Requests without an `Origin` (curl) are allowed.
- **The Vite proxy forwards `Origin`.** `/qa-server` requests from the dev client reach the server with the browser's `Origin` (e.g. `http://localhost:5184`); `changeOrigin` only rewrites `Host`. That is why every loopback port is accepted: a dev client on a port other than 5173 used to get `FORBIDDEN`.
- **Sharing the dev client over a tailnet.** When the client is opened through another origin, e.g. `tailscale serve` in front of Vite, set `QA_SERVER_EXTRA_ORIGINS` to that origin (comma-separated, matched exactly, no wildcards). Vite also needs to accept the host: `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=<name>.ts.net`. Anyone who can reach that URL can drive the server's wallets, so keep it to your own tailnet and test wallets.

  ```bash
  QA_SERVER_EXTRA_ORIGINS=https://<machine>.<tailnet>.ts.net bun run dev:server
  ```

## The tx-mining global

`config.setTxMiningUrl` sets a process-wide singleton in wallet-lib, and the lib reads it on every tx-mining request, including the status polls during a send. Without it, the lib derives the URL from the network name, so a `SHIELDED_TESTNET` wallet (lib name `testnet`) would mine on the regular testnet service.

So the server applies the URL of the wallet's network before every send, and only inside one process-wide send queue. The queue keeps two wallets on different networks from swapping the URL under each other mid-send. Starting a wallet doesn't need the URL and must not touch it, because a start can run while a send is in flight. The cost: sends run one at a time, even across wallets.

## Future: Cloudflare hosting

Not done. Hosting the server would make shielded sends available outside a dev machine, but:

- **Workers can't load NAPI addons**, so `@hathor/ct-crypto-node` does not run there.
- The options are **Cloudflare Containers** (run this Bun server as-is in a container) or a future **WASM prover** build of the crypto package, which would also let the browser send directly.
- Hosting **needs authentication**. Today the server trusts anything on localhost while it holds wallet seeds.
