# Shielded QA stages

The four stages in the **Shielded** family (`/tools/shielded/…`) and how QA uses them. How shielded outputs behave (address types, modes, fees, the two-output rule, mobile QR formats) is in `shielded-semantics.md`; what the browser can and cannot do is in `shielded-outputs.md`.

| Stage | Route | What it does |
|---|---|---|
| Shielded send | `/tools/shielded/send` | Send transparent, amount-shielded and fully shielded outputs from a wallet, to another wallet's address or to a phone |
| Receive | `/tools/shielded/receive` | One wallet address as a QR code for the phone, transparent or shielded, at any index |
| Shielded balances | `/tools/shielded/balances` | A wallet's HTR balance split into transparent and shielded UTXOs |
| Transaction inspector | `/tools/shielded/inspector` | Fullnode view of a tx with shielded outputs, unblinded by the sending and receiving wallets |

## The model: wallets, and an invisible signer

QA only deals with **wallets** (funding and test wallets from Wallet initialization) on **Shielded testnet**. Funds are created on that network itself; there is no bridge from the regular testnet and no faucet. A funding wallet (e.g. "Captain") already holds the HTR the tests need.

The browser can't create shielded outputs (`shielded-outputs.md`), so every send goes through the wallet's **signer**: a copy of the same seed that the local QA server (`apps/server`, `server.md`) runs with the native prover. QA never manages signers:

- Starting a seed wallet on a shielded network starts its signer.
- Stopping, removing or moving the wallet to another network stops it. So does a reload that leaves the wallet idle.
- The Helper pill in the top bar lists the signers and their state, with a Retry for a failed start.

`useSignerSync` (mounted once in `App.tsx` through `SignerSync`) does this by reconciling wallets with the server's sessions after every change (`utils/signerSync.ts`, `planSignerSync`). A session's id is the wallet's legacy address 0; `qaServer.owners` (persisted) maps the sessions this client started to their wallet, so a reload stops its own leftovers and leaves other clients' sessions alone.

## Typical flows

1. Run the client and the server (`bun run dev:all`, or `helper:up`). The Helper pill turns green.
2. Start the funding wallet on Shielded testnet. Its signer shows Ready in the pill within seconds.
3. **Wallet → wallet**: in Shielded send, pick the sender in *From* (the funding wallet is preselected). For each output, choose the mode and fill the recipient with *Fill from → Wallet address*: any shielded-network wallet, any index, transparent or shielded.
4. **Desktop → phone**: on the phone, open Receive; it shows a `K3…` QR. In Shielded send, *Fill from → Scan QR* reads it with the camera.
5. **Phone → desktop**: open Receive, pick the wallet and index, and the shield toggle for the shielded or transparent address. Scan it from the phone (Send → QR icon). The Balance panel below reloads when the wallet sees the transaction.
6. **Check** in Shielded balances, and paste the tx id in the Transaction inspector. Unblind with the sender and the recipient to see the hidden values.

## Send details

- The request is the contract's `SendRequest` built by `buildShieldedSendRequest` (`src/utils/shieldedSend.ts`) on top of `toSendOutputs`. The Inspect panel shows it live.
- **Mode vs address**: a shielded mode needs a `K3…` recipient; output rows reject a legacy address (`utils/outputRows.ts`). A transparent output to a `K3…` address is valid, but it lands as a transparent UTXO and does not test decoding.
- **Fees** come from `src/fees` (`estimateShieldedFee`): 1 base unit per amount-shielded output, 2 per fully shielded one, always in HTR. The editor shows the minimum.
- **One shielded output**: wallet-lib splits it into two halves to the same address (or shields the HTR change for a 1-unit output). The editor explains which, and the fee counts the extra output.
- **Change**: *Automatic* leaves `changeShieldedMode` out so wallet-lib decides; the other three send `AMOUNT_SHIELDED`, `FULLY_SHIELDED` or `TRANSPARENT`.
- **Presets** fill the sender's own address 0 (a self-send); change the recipient with Fill from.
- **Dry run** (the global toggle) records the request without calling the server.
- Errors render with a plain title, what to do, the error code and the raw message. `INSUFFICIENT_FUNDS` (422) means the sender needs HTR from another wallet on the network.

## Code map

| File | Role |
|---|---|
| `src/services/qaServerClient.ts` | Typed client for every contract route; `QaServerError { status, code, message }`; `describeQaServerError`; `pollSessionUntilSettled` |
| `src/store/slices/qaServerSlice.ts` | Sessions, `owners`, in-flight and failed signers; `startSigner` (reads the seed from wallet metadata, never puts it in an action), `stopSigner`, `signerForWallet` |
| `src/utils/signerSync.ts`, `src/hooks/useSignerSync.ts` | Which signers to start, stop or adopt; the hook that applies it |
| `src/hooks/useSigner.ts` | `useSigner(walletId)`, `useShieldedWallets()` (seed wallets on shielded networks, funding then test first), `useCheckServerNow` |
| `src/hooks/useWalletAddress.ts` | A wallet's address at an index, transparent or shielded (`deriveWalletAddress`) |
| `src/components/shielded/` | `ShieldedWalletSelect` (preselects, offers Start), `WalletAddressPicker`, `AddressKindToggle`, `WalletBalance`, QA server callouts |
| `src/components/common/AddressQr.tsx` | Address QR code on every stage; eye / shield toggle for shielded-network wallets |
| `src/utils/addressUri.ts` | `hathor:<address>` for QR codes; `parseScannedAddress` for scans (bare, `hathor:`, JSON) |
| `src/fees/` | FEE-token checks and shielded output fees |
| `src/utils/shieldedBalances.ts` | Balance breakdown and shielded share |
| `src/utils/shieldedTx.ts` | Fullnode tx → inspector rows, merging unblinding data per wallet |

Server health is never polled by the stages: the Helper pill polls `/health` into `helperServerSlice`, and `useRequireHelperServer()` reads it. A change in the server's session count (a restart) makes `useSignerSync` reload the sessions and restart signers.
