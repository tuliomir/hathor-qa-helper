# Blueprint publisher

`bun run blueprints:publish` publishes QA Helper's nano contract blueprints (`bet`, `fee`, `authority`) to a network that lacks them, and prints the ids to add to that network's `blueprints` entry in `packages/shared/src/networks.ts`. The Bet and Fee stages and flows need those ids. Code: `apps/server/src/blueprints/` (`cli.ts` is the entry point), tests in `apps/server/tests/blueprints.test.ts`.

## Where the sources come from

The `.py` files stay in wallet-lib, whose integration setup (`setupTests-integration.js`, `createOCBs`) publishes the same files with `HathorWallet.createAndSendOnChainBlueprintTransaction`. The publisher calls that same method. It reads:

```
$WALLET_LIB_DIR/__tests__/integration/configuration/blueprints/{bet,fee,authority}.py
```

Without `WALLET_LIB_DIR` it uses `../wallet-lib` beside this checkout (`~/code/wallet-lib`). A missing directory or file stops the run with exit 1. Never copy the files into this repo. The sources follow whatever wallet-lib branch is checked out, so the plan prints each file's sha256.

## How an agent should run it

1. **Dry run first.** It sends nothing, needs no seed and always exits 0 when the plan can be computed:

   ```sh
   bun run blueprints:publish -- --network NEXT_TESTNET --dry-run
   ```

   With a seed (see below) the dry run also loads the wallet and shows the publisher address, its balance and each tx's PoW weight.

2. **Read the plan.** Check the `/version` line (network name and node version), the `Dup. check` line and each blueprint's `EXISTS` or `WILL PUBLISH`. If everything exists, stop: copy the printed ids if the registry lacks them.

3. **Publish with an explicit confirmation**, after the user agrees:

   ```sh
   bun run blueprints:publish -- --network NEXT_TESTNET --confirm NEXT_TESTNET --seed-file /path/to/seed
   ```

   `--confirm` must equal `--network`. On a TTY without it, the CLI asks the user to type the key; with no TTY (agents) it refuses.

4. **Paste the snippet** it prints into the network's entry in `packages/shared/src/networks.ts`. The CLI does not edit the registry.

| Exit code | Meaning |
|---|---|
| 0 | Published, dry run, or nothing to publish |
| 1 | Error: wallet-lib missing, network mismatch, fullnode error, failed publish |
| 2 | Refused by a gate: mainnet, no `--confirm`, wrong `--confirm`, no seed, unverified duplicate check |

## Safety gates

- **Mainnet is refused** by key, and also when any node reports `mainnet`.
- **Network check.** `/version`'s `network` must match the registry's `libName`: `testnet` ↔ `testnet*` (e.g. `testnet-india`, `testnet-juliet`), and `nano_contracts_enabled` must not be false. A mismatch means the URL or the registry entry is wrong; fix that first.
- **Confirmation** as above. `--dry-run` wins over `--confirm`.
- **Seeds** come from `--seed-file <path>` or `BLUEPRINT_PUBLISHER_SEED`, never from an argument (`--seed` is rejected), and are never printed.

## How "already exists" is decided

Per blueprint, in order:

1. **Registry.** If the network's entry has an id, `GET nano_contract/blueprint/info` must know it. Then it counts as existing even if its source differs from the local file (the plan notes the difference; TESTNET's `fee` is an older `fee.py`). An id the node doesn't know is noted and the blueprint is published.
2. **On-chain index.** `GET nano_contract/blueprint/on_chain` (oldest first, 100 per page, at most 50 pages) lists every confirmed on-chain blueprint with its class name. Those with the local file's `@export` class name have their source fetched (`nano_contract/blueprint/source`) and compared by sha256. The node returns the published text byte for byte, so an exact match means a duplicate.
3. **Publisher history.** On-chain blueprint txs (version 6) in the publisher wallet's history are compared the same way. This catches earlier runs with the same seed when the index is unavailable.

Some nodes run without the blueprint index: the Next testnet node answers `503 Blueprint index not initialized`. Then a blueprint published by another wallet can't be ruled out, the plan says so on its `Dup. check` line, and publishing needs `--allow-unverified` on top of `--confirm`. Check another way first (ask whoever runs the network, or look at the registry in other QA tools), then pass it.

## Cost and restrictions

- **Cost: 0 HTR.** An on-chain blueprint tx has no inputs and no outputs (`MIN_NUM_INPUTS = 0` in hathor-core), so there is no fee, deposit or change. The only work is PoW through the network's tx-mining service. The balance is shown for information; an empty fresh seed can publish.
- **The publisher's address 0 signs** each tx (its pubkey is the blueprint's `nc_pubkey`).
- **Restricted networks.** hathor-core can allow on-chain blueprints only from listed addresses (`NC_ON_CHAIN_BLUEPRINT_RESTRICTED`, `NC_ON_CHAIN_BLUEPRINT_ALLOWED_ADDRESSES`; restricted by default, open on wallet-lib's privnet). `/version` does not expose this, so it can't be checked in advance. A restricted network rejects the first publish with `OCBPubKeyNotAllowed`; the CLI reports "On-chain blueprints are restricted on this network: <address> is not in its NC_ON_CHAIN_BLUEPRINT_ALLOWED_ADDRESSES" and sends nothing more.
- **Don't use a miner's seed.** Its huge history takes many minutes to load (the wallet gives up after 10). Use a fresh seed, or one whose address 0 the network allows.

## Publishing

Blueprints go out one at a time, in `bet`, `fee`, `authority` order. After each send the CLI polls `GET transaction` until the tx has a first block (the blueprint is usable only then; `--timeout-min`, default 10), and then waits for the next second, as wallet-lib's setup does, so the next tx doesn't share its parent's timestamp. A voided tx or a timeout stops the run and prints the ids sent so far; re-running is safe, because the publisher-history check finds them.
