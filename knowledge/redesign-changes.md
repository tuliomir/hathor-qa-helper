# Behaviour changes in the redesign

What QA will notice compared with the pre-redesign app (`main` before the `apps/` monorepo). Visual changes are in `docs/design/`; this lists behaviour.

## Amount inputs are decimal

Amount fields take decimal token units (`1.50`), not base units (`150`), and show the base-unit value under the field. Requests still send base units. Convention: `design-system.md` → Amounts.

Fields that changed from base units to decimals:

- Send transaction outputs (RPC and Snap send) and Shielded send outputs, through `OutputEditor`.
- RPC Create token: Amount. The defaults are unchanged in base units (100 / 9999), so they now read 1.00 and 99.99.
- RPC Bet deposit and Bet withdraw: Amount.
- RPC Fee initialize: HTR deposit. Fee deposit and Fee withdraw: Amount and HTR withdrawn for fees.
- RPC Get UTXOs: Amount smaller than / Amount bigger than. Scatter funds now describes its UTXOs as 0.01, 0.02, 0.03 … HTR (1, 2, 3 … base units).
- QA server: fund amount (new stage).

The other Snap stages still take base-unit integers.

## Checks and previews

- **RPC address mismatch is enforced.** The bet and fee RPC stages compare the session's address 0 with the test wallet's and block Execute when they differ. On `main` the check never ran (the test wallet address was never set).
- **Previews match the sent request.** The Inspect panel's live request is built by the same builders as the handlers (`utils/nanoRpcRequests.ts`, `utils/rpcCoreRequests.ts`), and dry runs without a session record that request.
- **QA blueprints follow the network the request goes to**: the WalletConnect session's chain for RPC stages, the snap's network for Snap stages.

## Confirmations and feedback

- **Mainnet cleanup asks you to type the wallet name** before Test Wallet Cleanup sends anything. Cleanup actions (Refresh, Retrieve, Execute) run one at a time.
- **Error toasts stay** until dismissed; success and info toasts go after 4s, warnings after 8s.
- **`TxStatus` says "Confirmed"** for a transaction the fullnode reports as valid with a first block (it said "Valid").
