# Manual Testing Setup with Live Wallets

How to manually test wallet-lib features (send transactions, inject
funds, timelocks, etc.) against the live Hathor testnet using the
QA Helper.

## Prerequisites

- Dev server running: `bun run dev` (http://localhost:5173)
- Internet connection (testnet node + cloud wallet sync)

## Wallet Setup

The app auto-syncs wallets from the cloud on startup. The following
wallets are available for testing and have testnet funds:

| Wallet | Role | Notes |
|--------|------|-------|
| **Miner** | Funding wallet | Has HTR from testnet mining. Use as fund source. |
| **Desktop 34 Windows** | Test wallet | Low balance, good for receiving test funds. |
| **Android 38 rc3** | Alt test wallet | Idle by default — start manually if needed. |
| **iOS 38 rc3** | Alt test wallet | Idle by default — start manually if needed. |

## Quick Start

1. Navigate to **Wallet Initialization** (`/tools/main-qa/wallet-initialization`)
2. Wait for "Miner" and the test wallet to show `ready` status
3. Select "Miner" as **Funding Wallet** and the test wallet as **Test Wallet**
4. Navigate to the feature you want to test

## Testing the Inject Fund Feature

1. Go to **Address Validation** (`/tools/main/address-validation`)
2. Select the "Test Wallet" tab (default)
3. Scroll to the "Inject Initial Fund" card at the bottom
4. Set **Unlocked** and **Locked** amounts (keep within funding wallet balance)
5. **Timestamp** defaults to 5 minutes from now (local timezone)
6. Click "Inject Fund"
7. Verify: test wallet balance increases by the unlocked amount
8. Verify: the locked amount is NOT in the unlocked balance (it's timelocked)

### Checking the timelock worked

- Go to **Get UTXOs** (RPC or Snap) for the test wallet
- Look for a UTXO with `locked: true` status
- The locked UTXO should have the amount you specified
- After the timestamp passes, the UTXO becomes unlocked

## wallet-lib SendTransaction API Notes

When using `wallet.sendManyOutputsSendTransaction()`:

- Returns a `SendTransaction` object in `idle` state
- **Use `sendTx.run()`** — handles full lifecycle: prepare → sign → mine → push
- **Do NOT use `sendTx.runFromMining()`** — this expects `prepareTx()` and
  `signTx()` to have been called first, otherwise throws `transaction-is-null`
- The `run()` method accepts an optional `pin` parameter; if the SendTransaction
  was created with `pinCode` in options, the pin is already set

### Timelock on outputs

- `TransactionTemplateBuilder.addTokenOutput({ timelock })` does NOT work —
  the template executor silently discards the timelock (see
  `knowledge/issues/template-builder-issue-prompt.md`)
- Use `sendManyOutputsSendTransaction` with `{ timelock: unixTimestamp }` on the
  output object instead — this correctly creates P2PKH scripts with timelock

## Fund Management

The testnet wallets have limited funds. Keep test amounts small (1-5 HTR)
to avoid depleting them. After testing, use the **Test Wallet Cleanup** stage
to return HTR from the test wallet back to the funding wallet.
