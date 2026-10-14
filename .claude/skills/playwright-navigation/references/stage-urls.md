# Stage URL reference

Base URL: `http://localhost:5173` (or the port your dev server uses).

URL pattern: `/tools/{groupSlug}/{stageSlug}`. Titles are the sentence-case link names in the `Stages` navigation, grouped by family / group as in the nav. Generated from `MAIN_QA_STAGES` in `apps/client/e2e/helpers/stage-navigator.ts`, which the smoke e2e checks; regenerate it from there when stages change.

## Wallets / Main QA

| Stage | URL |
|-------|-----|
| Wallet initialization | `/tools/main/wallet-initialization` |
| Address validation | `/tools/main/address-validation` |
| Custom tokens | `/tools/main/custom-tokens` |

## WalletConnect RPC / RPC requests

| Stage | URL |
|-------|-----|
| Connection | `/tools/rpc/connection` |
| Basic information | `/tools/rpc/basic-info` |
| Get address | `/tools/rpc/get-address` |
| Get balance | `/tools/rpc/get-balance` |
| Get UTXOs | `/tools/rpc/get-utxos` |
| Sign with address | `/tools/rpc/sign-with-address` |
| Create token | `/tools/rpc/create-token` |
| Send transaction | `/tools/rpc/send-transaction` |
| Sign oracle data | `/tools/rpc/sign-oracle-data` |
| Raw RPC editor | `/tools/rpc/raw-editor` |

## WalletConnect RPC / Bet nano contract

| Stage | URL |
|-------|-----|
| Initialize bet | `/tools/bet-nc/initialize` |
| Place bet | `/tools/bet-nc/deposit` |
| Set bet result | `/tools/bet-nc/set-result` |
| Withdraw prize | `/tools/bet-nc/withdraw` |

## WalletConnect RPC / Fee nano contract

| Stage | URL |
|-------|-----|
| Initialize fee | `/tools/fee-nc/initialize` |
| Deposit fee token | `/tools/fee-nc/deposit` |
| Withdraw fee token | `/tools/fee-nc/withdraw` |

## Wallets / Push notifications

| Stage | URL |
|-------|-----|
| Push notifications | `/tools/notifications/push` |

## Wallets / Auditing

| Stage | URL |
|-------|-----|
| Transaction history | `/tools/auditing/transaction-history` |
| Tx update events | `/tools/auditing/tx-update-events` |
| Test wallet cleanup | `/tools/auditing/test-wallet-cleanup` |

## Wallets / Multisig

| Stage | URL |
|-------|-----|
| Multisig wallets | `/tools/multisig/wallet-management` |

## MetaMask Snap / Snap requests

| Stage | URL |
|-------|-----|
| Connection | `/tools/snaps/connection` |
| Get network | `/tools/snaps/get-network` |
| Wallet information | `/tools/snaps/wallet-info` |
| Get address | `/tools/snaps/get-address` |
| Get balance | `/tools/snaps/get-balance` |
| Get UTXOs | `/tools/snaps/get-utxos` |
| Get xpub | `/tools/snaps/get-xpub` |
| Sign with address | `/tools/snaps/sign-with-address` |
| Sign oracle data | `/tools/snaps/sign-oracle-data` |
| Send transaction | `/tools/snaps/send-transaction` |
| Create token | `/tools/snaps/create-token` |
| Change network | `/tools/snaps/change-network` |
| Nano contract tx | `/tools/snaps/nano-contract-tx` |
| NC + create token | `/tools/snaps/nc-create-token` |

## MetaMask Snap / Bet nano contract

| Stage | URL |
|-------|-----|
| Initialize bet | `/tools/snap-bet-nc/initialize` |
| Place bet | `/tools/snap-bet-nc/deposit` |
| Set bet result | `/tools/snap-bet-nc/set-result` |
| Withdraw prize | `/tools/snap-bet-nc/withdraw` |

## MetaMask Snap / Fee nano contract

| Stage | URL |
|-------|-----|
| Initialize fee | `/tools/snap-fee-nc/initialize` |
| Deposit fee token | `/tools/snap-fee-nc/deposit` |
| Withdraw fee token | `/tools/snap-fee-nc/withdraw` |

## Shielded / Shielded outputs

| Stage | URL |
|-------|-----|
| QA server | `/tools/shielded/qa-server` |
| Shielded send | `/tools/shielded/send` |
| Shielded balances | `/tools/shielded/balances` |
| Transaction inspector | `/tools/shielded/inspector` |

## Walkthroughs

| Workspace | URL |
|-------|-----|
| Mobile walkthrough | `/mobile` |
| Desktop walkthrough | `/desktop` |
