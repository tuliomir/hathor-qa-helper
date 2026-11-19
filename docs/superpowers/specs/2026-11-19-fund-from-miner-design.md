# Fund from Miner — design

## Why

On new networks (development testnets, privatenets) the genesis wallet is often unavailable, but the miner's seed is. Opening the miner wallet with `HathorWallet.start()` takes 10+ minutes because it replays the full history of a heavily used address. QA only needs one or two mining rewards to bootstrap the funding wallet and start the actual workload.

## Goals

- A QA Helper stage that sends 1 or 2 spendable HTR UTXOs from the miner seed to a destination address, in seconds.
- The miner seed is stored locally, separated from every other wallet seed.

## Non-goals

- Networks outside the `@qa-helper/shared` registry.
- Custom amounts with change; tokens other than HTR.
- A CLI.

## Anti-goals

- The miner seed must never reach `HathorWallet`, the wallet list (`walletStoreSlice`), default wallets, or cloud sync. A mix-up would trigger the very long load this stage exists to avoid.
- No unbounded history scan: the search stops after a fixed page cap and says why.

## Approaches

1. **CLI in `apps/server`** — any network, scriptable; not where the user works.
2. **CLI + stage over the QA server** — more than needed.
3. **Client stage (chosen)** — fits the user's workflow; registry networks only.

## Design

**Stage.** "Fund from Miner", in the Wallets family next to *Fund test wallet address*. Registered in `types/stage.ts` and `config/stageRoutes.ts` as usual.

**Seed storage.** Per-network, under its own localStorage key `qa-helper:miner-seeds`. Read and written only by this stage. A "Forget seed" control clears it.

**Network parameters, fetched on connect** (through the dev proxy, like other fullnode calls):

- `GET /version` → `reward_spend_min_blocks` (300 on testnet; can be as low as 1 on privatenets). Never hard-coded.
- `GET /status` → `dag.best_block.height`.

**UTXO search.**

1. Derive addr0 (BIP44 `m/44'/280'/0'/0/0`) from the seed; derive addr1 only if addr0 yields nothing spendable.
2. Page `thin_wallet/address_history` (oldest first, `hash` pagination).
3. Keep an output when: token `00`, `spent_by` is null, the tx is not voided, no timelock (or timelock passed), and — for block rewards — `bestHeight − block.height ≥ reward_spend_min_blocks` (block entries carry `height`).
4. Stop as soon as the requested count (1 or 2) is found, or after a page cap; report which.

**Send.** Selected UTXOs are spent whole to the destination, single output, no change. Build with wallet-lib `Transaction`/`Input`/`Output`, sign each input with the derived address key, mine via the network's tx-mining service (`applyNetworkServices`), push to the fullnode. Show the tx id with `ExplorerLink`/`TxStatus`.

**Destination.** Pasted address, or one-click fill from the loaded funding wallet's addr0. Validated for the selected network.

**UI shows** the derived address(es), reward lock and best height, the found UTXOs (tx id, index, amount, height), then the send result.

## Left to the builder

- Page size / page cap values.
- Exact wallet-lib helpers for derivation, signing and mining (prefer existing lib APIs over hand-rolled crypto).
- Whether a send is re-searched just before submit to avoid a UTXO spent meanwhile.
