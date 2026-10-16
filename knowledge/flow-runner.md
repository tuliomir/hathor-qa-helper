# Flow runner (automatic RPC flows)

An automatic run drives a chain of RPC stages the way a QA would by hand: open the stage, fill its form, send, then wait on the wallet. The user only answers the prompts on the phone. Three flows exist:

- **RPC requests**: every core WalletConnect request against the test wallet (see "The RPC flow" below). Start it with **Run the RPC flow** in any core RPC stage header. The QA connects the wallet first; connecting is not part of the flow.
- **Bet nano contract**: initialize → place bet → sign oracle data → set result → withdraw. Start it with **Run the bet flow** in any bet stage header.
- **Fee nano contract**: initialize with 0.02 HTR → deposit all of a fee-based token (wallet pays the fee) → withdraw it all (wallet pays) → deposit it all again (contract pays) → withdraw part of it (contract pays). Start it with **Run the fee flow** in any fee stage header.

## Pieces

| File | Role |
|---|---|
| `src/flows/flowRunner.ts` | Generic engine: `FlowStep`, `FlowDefinition`, `FlowEnv`, `startFlow` / `resumeFlow` |
| `src/flows/rpcFlow.ts` | The RPC flow's steps, random picks (`prepare`), preflight and verdict |
| `src/flows/rpcChecks.ts` | What each core RPC answer must look like, and its on-chain checks |
| `src/services/scatterHtr.ts` | Scatter funds, shared by the Get UTXOs stage and the RPC flow |
| `src/flows/betFlow.ts` | The bet flow's steps, preflight and final check |
| `src/flows/feeFlow.ts` | The fee flow's steps, token pick (`prepare`), preflight and final check |
| `src/flows/feeChecks.ts` | Who paid a confirmed tx's fee, and the contract balance checks |
| `src/flows/rpcFlowPreflight.ts` | Preflight every RPC flow shares (session, testnet, blueprint, address 0) |
| `src/flows/nanoExpectations.ts` | What an approved nano response must look like (from mobile's `QA/QA_REOWN.md`) |
| `src/flows/flowEnv.ts` | The app side: store, WalletConnect session, fullnode, router |
| `src/store/slices/flowRunSlice.ts` | Run state (steps, attempts, verdict) and the per-stage `prefill` |
| `src/hooks/useFlowPrefill.ts` | Stages apply the run's values to their form |
| `src/components/flows/` | Run panel, start button, controls |
| `src/services/rpcRun.ts` | The React-free RPC core shared with `useRpcMethod`: `runRpc`, `recordRpcResult` / `recordRpcFailure`, deep-link helpers |
| `src/utils/rpcOutcome.ts` | Rejection vs error classification |
| `src/utils/nanoTxConfirmation.ts` | Fullnode polling for confirmation, the confirmed tx, and contract balances |

## Rules a step follows

- **Same path as a manual send.** The runner calls the stage's handler (`createRpcHandlers`) and records the result with the stage's slice actions, so the stage's card shows it and the next stage finds it (contract ID, oracle signature, deposit). Stopping a run and taking over needs nothing extra.
- **Steps read their inputs from the store** (`betNanoContract.ncId`, `signOracleData.rawResponse`, `betDeposit.amount`), not from runner memory. Whatever the user did by hand before resuming is picked up.
- **`push_tx` is true** in the nano flows: with `false` the wallet returns the tx hex, no contract ID gets stored, and nothing reaches the network. The RPC flow sends one `push_tx: false` on purpose and checks the hex instead.
- **What a step expects** (`expects`, shown per step in the panel):
  - `approval` (default): rejected once, then approved, as below.
  - `refusal`: an invalid request the wallet must not carry out. Its first refusal (any error, `5002` included) passes the step; an approval pauses. `validateRefusal` can pin the exact code and message once a real run has shown them; until then the attempt log records them.
  - `no-prompt`: the wallet answers without asking (`htr_getWalletInformation`, `htr_getConnectedNetwork`, and `htr_getBalance`, whose handler in hathor-rpc-lib never prompts). Any error pauses; nothing is sent twice.
  - `local` (`kind: 'local'`): work the app does itself with the test wallet it runs, such as scattering funds. A tx it returns is waited on like any other.
- **Rejection:** JSON-RPC `5002` with `Rejected by the user` is recorded and the step is sent again (QA_REOWN.md asks to reject every step once). A `5002` with another message, or any other error, pauses the run. The mobile also answers `5002` when its "tx failed, retry?" modal is dismissed; the run log can't tell the two apart.
- **Approval:** the response is checked against `nanoExpectations.ts` (response type, header method and id, caller, action amounts, oracle signature). A broken expectation pauses the run with the reasons in the attempt log.
- **Confirmation:** a tx step waits until the fullnode shows `meta.first_block` and `meta.nc_execution === 'success'` (`transaction?id=`, polled every 3s for up to 5 minutes). The contract can fail a tx the network accepted, and the next step depends on its state (withdraw fails with `ResultNotAvailable` until `set_result` ran). Polling HTTP works for address-only wallets too, which have no wallet events. A timeout pauses with the step still `confirming`; Resume waits on the same tx instead of sending another.
- **Answer checks:** `checkAnswer` compares an approved answer with the running test wallet (the address is the wallet's, the balance matches) and lists the results under the step. A failed one pauses; Resume asks the wallet again.
- **On-chain checks:** a step with `checkOnChain` reads its confirmed tx (status `checking`) and lists each check under the step in the run panel. A failed check pauses with the step `failed` but its tx kept; Resume checks the same tx again instead of sending another (that would move the funds twice). Skip the step if the check is right to fail.
- **Review:** a step with a `review` question ends by asking it in the run panel ("Did the phone show …?"), and the run waits. **Yes, looked right** goes on; **Something was off** takes a note, marks the step done and flagged, and pauses; Resume goes on to the next step. A flagged step fails the RPC flow's verdict.
- **Pacing:** 0.7s between filling the form and sending, 1s of "Success!" before the next step, 1.5s before resending a rejected step (`FLOW_TIMING`).
- **Verdict:** the bet flow passes when the contract's balance is 0 (`nano_contract/state?id=…&balances[]=00`), i.e. the whole deposit came back. Steps approved without a rejection are listed as "Rejection not tested" (a warning, not a failure).

## The RPC flow

Follows hathor-wallet-mobile's `QA/QA_REOWN.md`. The test wallet must run from its seed in the app (the flow derives the addresses it expects, compares balances and scatters the HTR itself) and hold at least 0.20 HTR (`RPC_FLOW_MIN_HTR`).

| # | Step | Expects | Checked |
|---|---|---|---|
| 1 | Get wallet information | no prompt | network, address 0 |
| 2 | Get connected network | no prompt | network |
| 3 | Get address: first empty | approval | the wallet's, at that index, never used |
| 4 | Get address: by index | approval | a random index 1–19 (below the gap limit), derived locally |
| 5 | Get address: you choose | approval | the wallet's, at the index the answer gives |
| 6 | Get balance (HTR) | no prompt | unlocked HTR equals the test wallet's |
| 7 | Sign with address | approval | random index 0–19; the signature verifies for that address |
| 8 | Send tx, not pushed | approval | the hex decodes to a tx paying 0.01 HTR to step 4's address |
| 9 | Send tx, pushed | approval | confirmed; pays 0.01 HTR to step 4's address |
| 10 | Send tx, data output | approval | confirmed; the data output is on chain |
| 11 | Create deposit token (melt only) | approval | 1.00 supply, deposit version, melt but no mint authority |
| 12 | Create token: mint address without mint | refusal | |
| 13 | Create token: external mint address | refusal | a random address outside the wallet |
| 14 | Create fee token (no authorities) | approval | fee version, no authorities, 0.01 HTR fee |
| 15 | Create fee token data output | approval | fee version, mint and melt, an HTR fee, the data output |
| 16 | Scatter the HTR into UTXOs | local | the scatter tx confirmed |
| 17 | Get UTXOs: custom token | approval | step 11's token: one UTXO of 1.00 |
| 18 | Get UTXOs: HTR greater than | approval | everything above the 2nd smallest scattered UTXO |
| 19 | Get UTXOs: HTR between two amounts | approval | strictly between the smallest and largest, at most 2 |

- **Order:** the UTXO steps run last because the custom-token filter needs step 11's token and later sends would spend the scattered UTXOs. Both wallet facades filter strictly (`> amountBiggerThan`, `< amountSmallerThan`), so each filter's exact answer is known from the scattered amounts (`htrUtxoFilterCases`).
- **Random picks** (address indexes, the 3-letter suffix of the token symbols, the external address) are made once per run in `prepare` and kept in `flowRun.context`.
- **Verdict:** passes when every step was done and no wallet screen was flagged; skipped steps and approvals without a tested rejection are listed.
- **Facade:** whether the phone uses the Wallet Service or the full node is the tester's call; the run doesn't record it.

## The fee flow

- **Token:** `prepare` picks the test wallet's fee-based token with the largest unlocked balance when the run starts and keeps it (with the deposit amount and the partial withdrawal, `partialWithdrawAmount`) in `flowRun.context`; the panel shows it. Resuming keeps the pick; **Run again** picks again.
- **Why each fee is 0.01 HTR:** a fee-based token costs 1 base unit of HTR per output, a deposit action counting as one (wallet-lib `Fee.calculate`). Depositing the whole balance leaves no change output, so every step pays exactly one fee.
- **Who paid:** read from the fullnode's `transaction?id=`: `tx.fees` is the fee header, and the HTR inputs, outputs and `nc_context.actions` balance out as `wallet inputs + contract withdrawals = wallet outputs + contract deposits + fee`. The wallet paid when its HTR went down by the fee and no HTR left the contract; the contract paid when an HTR withdrawal of the fee covered it and the wallet's HTR didn't move.
- **Contract balances** are checked after every step: HTR 0.02 → 0.02 → 0.02 → 0.01 → 0.00.
- **Verdict:** passes when the contract holds no HTR and the wallet holds exactly the part withdrawn last (polled for up to 30s while the wallet syncs).
- **Needs** the test wallet started from its seed (the flow reads its tokens and balances: `FlowEnv.testWallet`), at least 0.04 HTR, and a fee-based token of at least 2 base units.

## Controls

- **Stop after this step:** the request on the phone stays open; the run pauses once it settles (or once its tx confirms).
- **Resume:** sends the current step again (or keeps waiting on its tx).
- **Skip step:** marks the current step done by hand; the run stays paused.
- **End run:** clears the run; the stages keep the values already filled in.

While a run is sending, the bet and fee stages show an unmet "An automatic run is sending requests" precondition (`useNanoStageWallet`): the wallet handles one request at a time. The core RPC stages do not have it yet: avoid sending from them by hand during an RPC run.

The runner refuses to start in dry run, without an RPC session, on a mainnet session, when the bet blueprint is missing, or when the session's address 0 is not the test wallet's.

## Adding a flow

Write a `FlowDefinition` (steps with `plan` / `validate` / `txHash` / `onApproved` / `checkAnswer` / `checkOnChain` / `review`, `expects` and the stage slice `actions`, or local steps with `perform`; `prepare` and `summary` if the run picks values up front), register it in `src/flows/index.ts`, call `useFlowPrefill` in each stage it drives, and put a `StartFlowButton` in their headers. Test it like `tests/betFlow.test.ts`, `tests/feeFlow.test.ts` or `tests/rpcFlow.test.ts`: real slices, a scripted fake wallet behind `runRpc`, `waitForTx` and `sleep` stubbed, `fetch` answering for the fullnode.
