# Shielded outputs: wallet-level semantics

How Shielded Outputs behave in wallet-lib and in the mobile wallet, read from source. Companion to `shielded-outputs.md` (what the browser client can do) and `shielded-qa-stages.md` (our stages).

Sources read (2026-10-15):

- `wallet-lib` at tag **v4.2.0** (the version the QA Helper pins). `master` (= v4.3.0 in `src/`) differs only in xpub-only wallets taking a `shieldedScanXPrivKey` at `start()` and in wallet-service facade work; none of the semantics below changed.
- `mobile-wallet` at `origin/master` 116a8658 (wallet-lib 4.3.0, the shielded-testnet build). The local checkout was on an unrelated branch, so it was read with `git archive`.

Citations: `wallet-lib/src/...:line` is v4.2.0, `mobile-wallet/src/...:line` is origin/master.

## 1. Address types

| | Legacy | Shielded ("new format") |
|---|---|---|
| Testnet / mainnet prefix | `W…` (P2PKH), `w…` (P2SH) / `H…`, `h…` | `K3…` / `Ce…` |
| Decoded size | 25 bytes: version + hash160 + checksum | 71 bytes: version + scan pubkey (33) + spend pubkey (33) + checksum (4) |
| Base58 length | 34 | 97 |
| Version byte | `0x49` / `0x28` | `0x5d` / `0x3c` (`wallet-lib/src/models/network.ts:17,24`) |
| Key path | `m/44'/280'/0'/0/i` (P2SH `m/45'/280'/0'/0/i`) | scan `m/44'/280'/1'/0/i`, spend `m/44'/280'/2'/0/i` |

- Layout and sizes: `wallet-lib/src/constants.ts:265-275`, `wallet-lib/src/utils/shieldedAddress.ts:50-87`. Prefix/length computed from the version bytes (every 71-byte payload with `0x5d` encodes to `K3…`, 97 chars).
- **Separate keys, shared index number.** A shielded address at index `i` is built from two separate accounts: the scan key (account 1', ECDH, view-only) and the spend key (account 2', signing). Both use child `i` (`wallet-lib/src/utils/shieldedAddress.ts:103-145`, `wallet-lib/src/constants.ts:414-426`). The legacy chain (account 0') is a third, independent key. Index `i` on both chains share only the number: the legacy and shielded addresses at index 5 are unrelated keys.
- Each chain has its own cursors (`lastLoaded`/`lastUsed` vs `shieldedLastLoaded`/`shieldedLastUsed`) and its own gap window (`wallet-lib/src/utils/storage.ts:615-645`).
- API: `getAddressAtIndex(i, { legacy: false })`, `getCurrentAddress({}, { legacy: false })`, `getNextAddress({ legacy: false })`, `getAllAddresses({ legacy: false })`. Omitting `legacy`, or passing anything but `false`, selects the legacy chain (`wallet-lib/src/new/wallet.ts:1069-1186`, `wallet-lib/src/storage/memory_store.ts:228-245`).
- `getAddressAtIndex(i, { legacy: false })` on an index not loaded yet derives it as a pure peek (not saved). It throws `shielded-multisig`, `shielded-integrity`, `shielded-no-keys` or `shielded-no-provider` (`wallet-lib/src/new/wallet.ts:1069-1100`). `getCurrentAddress({}, { legacy: false })` additionally requires capability level `view` or `full` (`wallet-lib/src/new/wallet.ts:1130-1166`).
- `getAddressPathForIndex(i, { legacy: false })` returns the spend path `m/44'/280'/2'/0/i` (`wallet-lib/src/new/wallet.ts:1112-1126`).
- Multisig wallets have no shielded chain; every shielded read throws (`wallet-lib/src/new/wallet.ts:185-207`).

### The on-chain address of a shielded address

A `K3…` address never appears on chain. Every output paid to it, shielded or transparent, locks to the **P2PKH of its spend pubkey**, a normal `W…` address (`wallet-lib/src/utils/shieldedAddress.ts:136-137`, `wallet-lib/src/models/address.ts:300-340`). The wallet stores that P2PKH internally as type `shielded-spend` and never lists it (`wallet-lib/src/storage/memory_store.ts:233-241`). There is no per-payment stealth derivation: every payment to the same `K3…` lands on the same `W…` address, so payments to one shielded address are linkable on chain.

### Which address receives which output

| Recipient | Transparent output | AMOUNT_SHIELDED / FULLY_SHIELDED |
|---|---|---|
| Legacy `W…` / `H…` | yes | **no**: `SendTxError "Shielded output requires a shielded address"` (`wallet-lib/src/new/sendTransaction.ts:369-375`). It has no scan pubkey to do ECDH with. |
| Shielded `K3…` | **yes**: paid to its spend P2PKH (`wallet-lib/src/new/sendTransaction.ts:404-410`, `wallet-lib/src/utils/address.ts:74-80`). The receiving wallet credits it as a transparent UTXO, since it holds that address (`wallet-lib/src/utils/storage.ts:1285`). | yes |

**The mode is independent of the address.** The caller picks it per output; the address only constrains it (a shielded mode needs a `K3…` address). Mobile does the same: the mode comes from the user's privacy mode, default Public, and a `K3…` recipient with Public gets a transparent output (`mobile-wallet/src/screens/SendAmountInput.js:72-76`, `mobile-wallet/src/constants.js:157-167`, `mobile-wallet/src/screens/SendAddressInput.js:50-53`).

## 2. The three modes

`ShieldedOutputMode` comes from `@hathor/ct-crypto-provider`: `AMOUNT_SHIELDED = 1`, `FULLY_SHIELDED = 2`. "Transparent" is `OutputKind.TRANSPARENT = 'transparent'`, a wallet-lib concept (`wallet-lib/src/shielded/types.ts:31-47`).

| | Transparent | AMOUNT_SHIELDED | FULLY_SHIELDED |
|---|---|---|---|
| Amount | public | hidden (Pedersen commitment + range proof) | hidden |
| Token | public (`token_data`) | **public** (`token_data`) | hidden (asset commitment + surjection proof, no `token_data`) |
| Recipient (spend P2PKH, timelock) | public | **public** | **public** |
| Extra on-chain data | none | commitment, range proof (~675 B), ephemeral pubkey | plus asset commitment, surjection proof |
| HTR fee per output | none, except FEE-version tokens (`FEE_PER_OUTPUT` 1) | 1 base unit (0.01 HTR) | 2 base units (0.02 HTR) |

- Wire fields: `wallet-lib/src/shielded/types.ts:61-83`, `wallet-lib/src/shielded/types.ts:160-187`. Fees: `wallet-lib/src/constants.ts:444-453`, `wallet-lib/src/new/sendTransaction.ts:1753-1757`. All fees go in one HTR `FeeHeader` (`wallet-lib/src/new/sendTransaction.ts:1010-1013`), so **any shielded send needs HTR**, even when it sends a custom token.
- A custom token whose outputs are all FULLY_SHIELDED is left out of the tx's public `tokens[]` list (`wallet-lib/src/new/sendTransaction.ts:1216-1240`). HTR is always public, because it pays the fee.
- The fullnode also sees which outpoints are spent: a shielded input's `txId:index` is public, only its value (and for FS, its token) is hidden.
- Shielded outputs are stored apart from transparent ones (`tx.shielded_outputs[]`). On-chain index of shielded output `s` = `tx.outputs.length + s` (`wallet-lib/src/new/wallet.ts:1370-1382`).

### Constraints

| Rule | Value | Source |
|---|---|---|
| Shielded outputs per tx | **0 or 2..32**, never exactly 1 | `wallet-lib/src/new/sendTransaction.ts:1123-1134`, `wallet-lib/src/shielded/creation.ts:332-347` |
| Transparent outputs per tx | 255 | `wallet-lib/src/constants.ts:258` |
| Inputs per tx | 255 | `wallet-lib/src/constants.ts:253` |
| Shielded output value | `1 ≤ v < 2^40` base units (≈ 10,995,116,277.75 HTR) | `wallet-lib/src/constants.ts:303-309`, `wallet-lib/src/shielded/creation.ts:381-383` |
| Authority (mint/melt) outputs | never shielded; the fullnode rejects them (`ShieldedAuthorityError`) | `wallet-lib/src/new/sendTransaction.ts:462-468` |
| Custom tokens | allowed in both modes, FS included | `wallet-lib/src/utils/shieldedSelection.ts:280-292` |
| Multisig | no shielded addresses, no shielded change | `wallet-lib/src/new/sendTransaction.ts:569-575` |

**The "two shielded outputs" rule.** A tx with exactly one shielded output is invalid: the last output's blinding factor balances the equation, so a lone output's commitment would be trivially openable (`wallet-lib/src/shielded/creation.ts:313-336`). The lib never asks the caller to pad. `ensureShieldedOutputMinimum` (`wallet-lib/src/new/sendTransaction.ts:2309-2343`) fixes a lone output before the crypto step, without touching a recipient's value:

1. Usually it **splits the lone output in two halves** (floor/ceil) to the same address, mode and token (`splitShieldedDef`, `wallet-lib/src/new/sendTransaction.ts:1700-1726`). This adds no privacy: the two halves' sum is the original amount.
2. When the extra HTR it pulls for the fee ends in a change that must be shielded, it **shields the HTR change** as the second output instead.
3. A 1-unit output cannot be split. The HTR change then becomes the second output. This fails when the change is pinned transparent, or the wallet cannot receive a shielded change.

The extra output's fee comes from the HTR change, or else from more HTR the wallet pulls. A send with one shielded output therefore produces 2 shielded outputs and pays 2× the per-output fee. The check at `wallet-lib/src/new/sendTransaction.ts:1123` only fires when padding was impossible.

Shielded outputs are shuffled, so the change's index tells nothing (`wallet-lib/src/new/sendTransaction.ts:1135-1152`). Its address still does: change goes to the wallet's own current shielded address.

### API shape

- `HathorWallet.sendManyOutputsTransaction(outputs, opts)`: each output is `{ address, value, token, timelock?, shielded?: ShieldedOutputMode }`. The key is **`shielded`** (`wallet-lib/src/new/types.ts:377-383`), mapped to `shieldedMode` at `wallet-lib/src/new/wallet.ts:2504`.
- `new SendTransaction({ outputs })` directly: the key is **`shieldedMode`**. Any output that *has* the key counts as shielded, so `shieldedMode: undefined` throws `Invalid shieldedMode 'undefined'` (`wallet-lib/src/new/sendTransaction.ts:159-161,357-368`). Mobile documents the same trap (`mobile-wallet/src/utils/shieldedSend.js:58-86`).
- `sendTransaction(address, value, opts)` has no mode option: it always sends a transparent output (`wallet-lib/src/new/wallet.ts:2409-2430`).
- Shielded sends need a crypto provider that can prove (`storage.shieldedCryptoProvider`, `wallet-lib/src/new/sendTransaction.ts:1112-1118`). The browser WASM provider cannot (see `shielded-outputs.md`).

## 3. Change mode (`changeShieldedMode`)

Option on `sendTransaction`, `sendManyOutputsTransaction` and `SendTransaction` (`wallet-lib/src/new/types.ts:418-423,425-462`). Validated by `assertChangeShieldedMode` (`wallet-lib/src/new/sendTransaction.ts:100-115`).

| Value | Behaviour |
|---|---|
| omitted / `null` | Automatic, per token (below) |
| `OutputKind.TRANSPARENT` | Every change output transparent, even when shielded inputs were spent. This can reveal a shielded input's value by subtraction. |
| `AMOUNT_SHIELDED` / `FULLY_SHIELDED` | Every change output (HTR and custom-token) shielded in that mode. On a tx with no other shielded element, the minimum pass adds the second output (it splits the change, or shields an HTR change beside it). |

**Automatic rules, per token T** (`wallet-lib/src/utils/shieldedSelection.ts:22-40`, `decideChangeMode` at `:368-403`, `computeTokenPolicy` at `:271-360`):

- **All of T's outputs shielded**: inputs come from shielded UTXOs first. Change is shielded, in the most private mode among T's outputs.
- **All of T's outputs transparent** (also HTR that only pays fees): inputs come from transparent UTXOs first; shielded ones only if transparent funds are short. If any shielded input is spent, the change is shielded, mirroring the input mode (FS if any FS input). If the amount exactly matches a *single* shielded input, an extra input is forced so that a change exists to hide the value.
- **Mixed** (T has both): one shielded output forces at least one shielded input. If the wallet has none, the change is shielded instead ("stands in") so the output's amount cannot be computed by subtraction. Two or more shielded outputs force a shielded input only if some go to other wallets.
- Change is shielded iff a shielded input was used, all of T's outputs are shielded, or the change stands in.

Change destination: a `K3…` `changeAddress` if given (it must be the wallet's), else the wallet's current shielded address. A legacy `changeAddress` plus a change that must be shielded throws, never downgrades silently (`wallet-lib/src/new/sendTransaction.ts:579-680`, `:1974-2028`). The HTR change's fee is taken from the change itself, and more HTR is pulled if the change is too small (`convertHtrChangeIfRequested`, `wallet-lib/src/new/sendTransaction.ts:2100`).

Mobile never sets `changeShieldedMode`, so it always uses the automatic rules (no match for `changeShieldedMode` in `mobile-wallet/src`).

## 4. Spending shielded UTXOs, balances, UTXO lists

- **Shielded UTXOs are inputs of a normal send.** `sendManyOutputsTransaction` / `SendTransaction` select from both pools with `makeShieldedAwareSelection` (`wallet-lib/src/new/sendTransaction.ts:715-740`, `wallet-lib/src/utils/shieldedSelection.ts:561-620`). Selection takes the preferred pool, then tops up from the other, so one tx **can mix** shielded and transparent inputs. Within the shielded pool, AS UTXOs come first for public tokens and FS UTXOs first for hidden ones (`wallet-lib/src/utils/shieldedSelection.ts:60-77`). A user-supplied shielded input must be a decoded one the wallet owns (`wallet-lib/src/new/sendTransaction.ts:446-461`).
- **Unshielding is supported.**
  - *Partial* unshield: shielded inputs pay transparent outputs, and the change stays shielded. The tx is valid because it still carries shielded outputs.
  - *Full* unshield: shielded inputs and no shielded output at all (e.g. `changeShieldedMode: TRANSPARENT`, or an exact amount). The lib adds an `UnshieldBalanceHeader` excess blinding factor (`wallet-lib/src/new/sendTransaction.ts:1155-1210`). This also needs a proving provider (`computeBalancingBlindingFactor`).
- `shielded-outputs.md` says input selection is transparent-only. That holds for `getUtxosForAmount` / `getAvailableUtxos` (templates, nano deposits; `wallet-lib/src/new/wallet.ts:1659-1720`), **not** for `sendManyOutputsTransaction`. In the browser this still means a send can pick a shielded UTXO when transparent funds are short, and then fail on the WASM provider.
- **`getBalance(token)`** counts decoded shielded UTXOs together with transparent ones. Both go through the same `creditOutput` (`wallet-lib/src/utils/storage.ts:1251-1290`), so the balance has no shielded/transparent split. Outputs the wallet has not decoded (locked scan key) are not counted.
- **`getUtxos()`** defaults to `shielded: false`, i.e. transparent only (`wallet-lib/src/new/wallet.ts:1607-1610`). `{ shielded: true }` lists shielded only; there is no "both" through this API (`wallet-lib/src/types.ts:690-698`, `wallet-lib/src/storage/memory_store.ts:850-851`). `getAvailableUtxos` has the same default (`wallet-lib/src/new/wallet.ts:1660-1669`).
- **`getShieldedUnblindingForTx(txId)`** returns `{ outputs, inputs }` of `{ index, value, token, vbf, abf? }`, only for slots the wallet decoded. `index` is the absolute on-chain index (`wallet-lib/src/new/wallet.ts:1360-1420`). `wallet-lib/src/shielded/unblinding.ts:20-36` encodes this as a base64url `#unblind=` fragment for the explorer.
- **`getShieldedCapability()`** → `{ level: none|watch|view|full, reason, cause, canReceive, canSpend, historyComplete, undecoded }` (`wallet-lib/src/shielded/types.ts:288-364`). It is also emitted as the `'shielded-capability'` event.

## 5. Mobile QR codes

**Receive QR** (`mobile-wallet/src/components/ReceiveMyAddress.js:89`):

```
hathor:<address>
```

- No query params, no amount, no token, no JSON. The same format for both address types.
- On the shielded testnet with the shielded UI on (`isShieldedEnvironment`: feature flag + fullnode network `testnet-shielded-outputs` + provider registered, `mobile-wallet/src/shielded/gating.js:113-118`, `mobile-wallet/src/constants.js:346`), the Receive screen shows **only the shielded `K3…` address**, never the legacy one (`mobile-wallet/src/components/ReceiveMyAddress.js:25-43`, `mobile-wallet/src/components/Shielded/PrivateReceiveAddress.js:26-36`). The address comes from `wallet.getCurrentAddress({}, { legacy: false })` (`mobile-wallet/src/sagas/shielded.js:160`). "New address" calls `getNextAddress({ legacy: false })` (`ReceiveMyAddress.js:60-66`). While the scan key is locked, the screen shows an unlock prompt and no QR.
- Elsewhere it shows the legacy `W…`/`H…` address in the same `hathor:` form.
- Expected payloads: `hathor:K3…` (104 chars) or `hathor:W…` (41 chars).

**Send scanner** (`SendScanQRCode` → `parseQRCode`, `mobile-wallet/src/utils.js:316-379`). It accepts:

| Payload | Result |
|---|---|
| `<address>` (bare) | accepted |
| `hathor:<address>` | accepted, prefix stripped |
| `{"address":"<address>"}` (JSON) | accepted |
| JSON with `token` or `amount` | **rejected** ("Payment request QR codes are not supported") |
| `other:<address>` or more than one `:` | rejected |
| `hathor:<address>?amount=…` | prefix stripped, but the `?amount=…` stays in the address, so validation fails ("Invalid address") |

- Mode is never encoded in a QR code; the user picks it on the amount screen.
- The scanned address is validated on `SendAddressInput` with `validateAddress(addr, network, { allowShielded })` (`mobile-wallet/src/utils.js:290-306`, `mobile-wallet/src/screens/SendAddressInput.js:53,69`). A `K3…` address is valid only inside the shielded environment; elsewhere it fails with "shielded address not supported".
- A non-public privacy mode with a legacy recipient is blocked on the amount screen (`mobile-wallet/src/screens/SendAmountInput.js:138-150`). Amounts at or above 2^40 are blocked for private sends (`:154-159`).
- Mode mapping: Public → transparent, Hide amount → `AMOUNT_SHIELDED`, Private → `FULLY_SHIELDED` (`mobile-wallet/src/utils/shieldedSend.js:43-54`). Private sends require capability `full` (`mobile-wallet/src/screens/SendConfirmScreen.js:237-252`).
- The Dashboard's scan button opens `UnifiedQRScanner`, which only handles WalletConnect URIs, token configs and nano contract ids. It **does not** accept addresses (`mobile-wallet/src/screens/UnifiedQRScanner.js:44-77`). Addresses are scanned only from Send → QR icon (`mobile-wallet/src/screens/SendAddressInput.js:86`).

For the QA Helper: show `hathor:<address>` (or the bare address) for the phone to scan, and parse the phone's QR by stripping an optional `hathor:` prefix.

## 6. Gotchas for a QA tool

- **The shielded address advances only on decode.** `getCurrentAddress({}, { legacy: false })` moves on only once an output paid to it has been *decoded* (`wallet-lib/src/new/wallet.ts:1131-1135`). With the scan key locked (level `watch`) it throws `shielded-locked`. Receipts that are not decoded do not advance the cursor (`wallet-lib/src/storage/memory_store.ts:578-596`).
- **Index discovery runs in rounds.** History is loaded window by window: decoding can move `shieldedLastUsed`, which asks for the next gap window. This repeats until stable, capped at **50 rounds** (`wallet-lib/src/new/wallet.ts:228-235,2205-2245`). After the cap, `capability.historyComplete` is `false`. So a wallet restored with funds on high shielded indexes takes several sync passes.
- **Polling sync only.** `canReceive` and `historyComplete` are `true` only in `HistorySyncMode.POLLING_HTTP_API`. The streaming sync modes do not watch shielded addresses (`wallet-lib/src/shielded/capability.ts:102-118`, `wallet-lib/src/new/wallet.ts:2186-2203`).
- **Decode needs an unlocked scan key and a provider.** Without them, outputs show up only in `capability.undecoded.locked`, and `getBalance` leaves them out. Unlocking (PIN → `unlockShieldedView`) triggers a reprocessing walk. Wait for `reprocessed`, or for `READY`, before reading balances or building a send. Mobile does the same in `waitForWalletReady` (`mobile-wallet/src/utils/shieldedSend.js:90-122`).
- **Visible fee and output count.** One recipient becomes 2 shielded outputs (split) plus maybe a shielded change. Expect fees of 2-6 base units, not 1. Compute them from the prepared tx (`FeeHeader`, `fullTxData.shieldedOutputs`), as mobile's `computeSendFees` does (`mobile-wallet/src/utils/shieldedSend.js:124-150`).
- **Any shielded send needs HTR for the fee**, including a custom-token send. "Insufficient HTR" can come from the fee to shield the change (`wallet-lib/src/new/sendTransaction.ts:893-908`).
- **Limits:** 32 shielded outputs, 255 inputs (a build that hits the input limit retries with shielded UTXOs taken by value alone, `wallet-lib/src/new/sendTransaction.ts:288-313`), and values below 2^40.
- **Linkability.** All payments to a `K3…` address hit the same on-chain `W…` address. An explorer shows that `W…`, not the `K3…`. To match them, use `new Address(k3).getSpendAddress().base58`.
- **Funding a `K3…` with a transparent send works**, and the balance goes up as a *transparent* UTXO. It is not a shielded receipt, so do not use it to test decoding.
- **Unconfirmed:**
  - How long the fullnode takes to expose a new shielded output to the polling sync (no constant in the lib).
  - Whether a FEE-version token's shielded outputs also owe `FEE_PER_OUTPUT`. The code charges transparent outputs only (`wallet-lib/src/new/sendTransaction.ts:810-819`), but the fullnode side was not read.
  - Token creation with shielded outputs (`create_token_transaction.ts` has no shielded path).
