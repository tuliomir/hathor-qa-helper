# QA Helper and the Integration Test Helper: who does what

Two helpers support Hathor wallet testing. This file says where the line between them is, what is planned on this side, and what belongs on the other. The Integration Test Helper (ITH) keeps the matching file at `docs/scope-and-boundaries.md` in [HathorNetwork/hathor-integration-test-helper](https://github.com/HathorNetwork/hathor-integration-test-helper).

Status on 2026-11-24: the line is decided. The headless packages are an agreed direction with nothing built. The open questions at the end are open.

## The line

| | QA Helper (this repo) | ITH |
|---|---|---|
| Networks | Public and shared ones: testnet, mainnet, the shielded testnet, Next testnet (testnet-juliet) and its Hathor Next side chain | Private ones, where we control the genesis **and** the miner |
| Who starts it | A person doing QA, today only Tulio | CI and developers' local stacks |
| Funds | Scarce. They come from wallets a person holds | Unlimited. They come from the genesis |
| Blocks | Arrive when the network mines them | Arrive when our miner mines them |

The test is control, not the network's name. Next testnet is a hathor-core testnet whose genesis and miner someone else runs, so it is on the QA Helper's side.

## What the QA Helper owns

- The UI a person uses to test a wallet: the stages, the walkthroughs, the automatic flows (`flow-runner.md`).
- The dApp side of WalletConnect RPC and of the MetaMask Snap.
- The counterparty wallet for shielded sends: the QA server (`server.md`).
- The registry of public networks and where the QA blueprints live on each (`packages/shared/src/networks.ts`).
- One-off setup of a public network, such as publishing the QA blueprints to it (`blueprint-publisher.md`). On a public network this happens once, by hand, with a seed a person holds, and the ids are then written in the registry.

## What the QA Helper leaves to the ITH

Anything that prepares or feeds a private chain:

- Test wallets on demand and race-free funding from the genesis. The ITH does this today.
- Publishing the test blueprints when a private chain starts. Planned there: today wallet-lib's `setupTests-integration.js` does it.
- Other chain setup that needs the genesis or the miner.

Don't add a private-network faucet, a genesis seed or a chain bootstrap here. If a stage needs one, the stage calls the ITH.

## Planned: the QA Helper's logic as packages that run in Node

Today the flows (bet, fee, RPC) and the request handlers live inside the React app and need a browser. The plan is to split along the headless line:

- **Packages that run in Node**, in `packages/`: the WalletConnect dApp client, the flow definitions and their checks, and the wallet operations the QA server performs.
- **The React app becomes one consumer** of those packages. Redux, routing and the run panel stay in `apps/client`.
- **A test runner becomes the second consumer.** The first candidate is the mobile wallet's e2e kit (`QA/e2e` in hathor-wallet-mobile), whose roadmap asks for "a WalletConnect client scripted in Node" to automate Reown.

These packages play the dApp and the counterparty towards the wallet under test, so they are not tied to a kind of network. A runner on a private network imports them for those roles, and still gets its chain, its funds and its blueprints from the ITH. The packages take the network as a parameter and never hold a genesis seed.

Constraints already known:

- `HathorWallet` instances stay out of Redux, so a package must not depend on the store.
- The flow runner must keep behaving like a person in the UI (navigate, fill the form, send). The UI path stays; the Node path is a second way to run the same steps and checks.
- An org repository's CI can't depend on a personal repository. Once a runner in the org depends on these packages, they move to the org.

## Open questions

1. Which package comes first: the WalletConnect client and flows, or the wallet operations.
2. The mobile e2e kit's `tools/wallet.js` mints tokens, sends private outputs and returns funds to the genesis on a private network. Which of these move to the ITH, and which to the Node packages, is not decided. By the line above, what needs the genesis leans to the ITH, and what a counterparty wallet does leans to the packages.
3. Where the packages live once they leave this repo: a repository of their own, or beside their first consumer in the org.
4. Whether the QA Helper UI should also work against a local private network, calling the ITH for funds.
