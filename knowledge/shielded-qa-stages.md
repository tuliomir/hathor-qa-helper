# Shielded QA stages

The four stages in the **Shielded** family (`/tools/shielded/…`) and how QA uses them end to end. Background: browsers can receive and decrypt shielded outputs but cannot create or spend them (`shielded-outputs.md`), so sending goes through the local QA server (`server.md`).

| Stage | Route | What it does |
|---|---|---|
| QA server | `/tools/shielded/qa-server` | Server health, sessions, start a client wallet on the server, fund a server wallet |
| Shielded send | `/tools/shielded/send` | Send transparent / amount-shielded / fully shielded outputs from a server wallet |
| Shielded balances | `/tools/shielded/balances` | Balance split into transparent and shielded UTXOs, server and browser side by side |
| Transaction inspector | `/tools/shielded/inspector` | Fullnode view of a tx with shielded outputs, plus server and browser unblinding |

## Before you start

1. Run the client and the server: `bun run dev:all` from the repo root (or `bun dev` and `bun run dev:server`). The server pill in the top bar turns green.
2. In Wallet initialization, add a wallet on **Shielded testnet**. Any wallet works for the server; to see the browser side, start it in the browser too.
3. The server only accepts the dev client on `localhost:5173` (or `127.0.0.1:5173`, preview `4173`). On another port it answers `FORBIDDEN`.

## End to end: fund → shield → inspect → unshield

1. **Start on server** (QA server stage). Pick the client wallet and press *Start on server*. The seed goes to the server on 127.0.0.1 and stays in its memory until the session stops; it is never shown, logged or returned. The session goes `starting → ready` (a few seconds on a fresh wallet), with capability **Full** and a `K3…` shielded address.
2. **Fund it.** There is no faucet on this network. In *Fund server wallet*, pick the session and a started client wallet on the same network that holds HTR, and send. This is a plain transparent send from the browser to the session's legacy address 0. The *Fund* button in the sessions table preselects the session.
3. **Shield** (Shielded send stage). Pick the session, press the *Shield (amount)* or *Shield (full)* preset and send. Presets fill the recipient with the session's own shielded address; use *Fill from* to target any client wallet's or session's legacy or shielded address 0 instead.
4. **Check balances** (Shielded balances stage). The server side shows the balance, the transparent and shielded UTXO totals and the shielded share. Load the same wallet in the browser on the right to compare what the WASM provider decodes.
5. **Inspect** (Transaction inspector). Paste the tx id from the send result. Shielded outputs are tinted and their amounts show as *hidden* until a wallet unblinds them: *Unblind on server* or *Unblind in browser* merges the decrypted values into the output table (eye glyph).
6. **Unshield.** Back in Shielded send, the *Unshield* preset sends to the session's legacy address. Check in the inspector which inputs were shielded.

## Send details

- The request is the contract's `SendRequest` built by `buildShieldedSendRequest` (`src/utils/shieldedSend.ts`) on top of `toSendOutputs`. The Inspect panel shows it live.
- **Change**: *Automatic* leaves `changeShieldedMode` out so wallet-lib decides; the other three send `AMOUNT_SHIELDED`, `FULLY_SHIELDED` or `TRANSPARENT`.
- **Two-shielded-output minimum**: with exactly one shielded output, the editor shows a callout. wallet-lib pads the second shielded output with change.
- **Dry run** (the global toggle) records the request without calling the server.
- Errors render with a plain title, what to do, the error code and the raw message. `INSUFFICIENT_FUNDS` (422) means the server wallet needs funding (step 2).

## Code map

| File | Role |
|---|---|
| `src/services/qaServerClient.ts` | Typed client for every contract route; `QaServerError { status, code, message }` (codes from the contract plus `UNREACHABLE`, `BAD_RESPONSE`); `describeQaServerError`; `pollSessionUntilSettled` |
| `src/store/slices/qaServerSlice.ts` | Sessions, per-session labels (persisted, names only), `startServerSession(walletId)` (reads the seed from wallet metadata, never puts it in an action), `stopServerSession` |
| `src/hooks/useServerSessions.ts` | Loads sessions when the server is online, polls while one is starting; `useCheckServerNow` for "Check again" |
| `src/hooks/useShieldedAddressBook.ts` | Quick-fill sources: every client wallet's and session's legacy and shielded address 0 |
| `src/utils/shieldedBalances.ts` | Balance breakdown and shielded share |
| `src/utils/shieldedTx.ts` | Fullnode tx → inspector rows, merging unblinding data |
| `src/components/shielded/QaServerParts.tsx` | Server-down callout, error callout, session and client-wallet pickers |

Server health is never polled by the stages: the top bar's pill polls `/health` into `helperServerSlice`, and `useRequireHelperServer()` reads it.
