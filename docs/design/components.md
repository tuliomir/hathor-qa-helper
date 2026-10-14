# Shared component patterns

The components every stage should be built from, their states, and which existing code each one replaces. New components live in `src/components/ui/` (primitives with no Redux knowledge) and `src/components/common/` (components that read wallet, network or session state). Visual values come from [tokens.md](tokens.md).

Ground rules for all of them:

- Built on daisyUI 5 classes and the theme variables; no raw Tailwind palette classes (`bg-blue-50`, `text-red-900` …) inside components or stages.
- Every interactive element is a real `button`, `a` or form control with a visible `:focus-visible` ring and an accessible name. Icon-only buttons get `aria-label`.
- Icons come from one set: `react-icons/md` (Material Design, outlined variants where available). No emoji, no hand-pasted SVG paths.
- Sentence case for every label and button.

## Index

| Component | Kind | Replaces |
|---|---|---|
| [StageHeader](#stageheader) | layout | `<h1 className="mt-0 text-3xl font-bold">` + description in 47 stage files |
| [PreconditionStrip](#preconditionstrip) | feedback | `RpcNotConnectedBanner`, `SnapNotConnectedBanner`, the "No wallets selected" cards, the `Link to="/"` hints in 6 common components |
| [Panel](#panel) | layout | `card-primary` (and its 5 colour variants), `card` |
| [Callout](#callout) | feedback | Coloured `card-primary` variants, inline `bg-red-50 border-danger` / `bg-amber-50` / `bg-purple-50` boxes |
| [Field](#field) | form | Ad-hoc `<label className="block text-sm font-medium mb-1.5">` + input, `common/Select.tsx` |
| [AddressInput](#addressinput) | form | `common/AddressInput.tsx` (extended), ad-hoc address fields in RPC cards (e.g. `RpcSendTransactionCard.tsx` ~line 357) |
| [AmountInput](#amountinput) | form | Free text amount inputs in send/create-token/bet/fee cards |
| [SegmentedControl](#segmentedcontrol) | form | Hand-built two-button switches ("Output type" in `RpcSendTransactionCard.tsx`, "Local dev / NPM package" in `SnapConnectionStage.tsx`) |
| [Identifier](#identifier) | data | `break-all` spans (76), `DisplayWalletAddress.tsx`, ad-hoc hash boxes |
| [TxIdDisplay](#txiddisplay) | data | Tx hash block in `SnapMethodCard.tsx`, hash rows in `TransactionResponseDisplay.tsx`, `TxStatus.tsx` + `ExplorerLink.tsx` pairs |
| [JsonPanel](#jsonpanel) | data | `JsonHighlight` in `SnapMethodCard.tsx`, raw view in `SnapResponseDisplay.tsx`, `RpcRequestPreview.tsx`, raw view in `TransactionResponseDisplay.tsx` |
| [MethodCard](#methodcard) | composite | `snap/SnapMethodCard.tsx` (generalised) and the hand-built structure of the 18 `rpc/Rpc*Card.tsx` files |
| [ExecuteBar](#executebar) | composite | `DryRunCheckbox.tsx` + execute buttons |
| [State blocks](#state-blocks-empty-loading-error) | feedback | `Loading.tsx`, `LoadingOverlay.tsx`, empty-state cards, error boxes |
| [Toasts](#toasts) | feedback | `ToastContainer.tsx` restyle; `CopyButton.tsx` stops toasting |
| [ConfirmDialog](#confirmdialog) | feedback | `window.confirm` in `WalletInitialization.tsx` (×2), `CustomTokens.tsx`, `WalletNetworkControl.tsx` |
| [StatusDot and StatusChip](#statusdot-and-statuschip) | data | `.status-idle/connecting/syncing/ready/error` classes, ad-hoc status text |
| [NetworkChip](#networkchip) | data | `badge badge-lg` network label in `WalletNetworkControl.tsx`, the yellow `TESTNET` chip in multisig |
| [CapabilityBadge](#capabilitybadge) | shielded | new |
| [ShieldedBadge](#shieldedbadge) | shielded | new |
| [ShieldModeSelector](#shieldmodeselector) | shielded | new |
| [OutputEditor](#outputeditor) | shielded composite | Output rows in `RpcSendTransactionCard.tsx` and `SnapSendTransactionStage.tsx` |
| [DataTable](#datatable) | data | `<table>` markup in 14 places (tx history, UTXOs, multisig participants, tokens) |

---

## StageHeader

```
WalletConnect RPC / RPC requests
Send transaction                                   htr_sendTransaction   [Docs ↗]
Send a transaction with one or more outputs.
```

- Props: `stageId` (title, description, family and group come from `src/types/stage.ts`), optional `method` (RPC or snap method name, rendered as a mono chip with copy), optional `actions` slot.
- Breadcrumb: family / group, muted, links to the first stage of that group.
- Title `text-page`, description `text-body text-ink-muted`, one line, left-aligned.
- The stage header is the first thing in the stage. Content that currently precedes the title (e.g. "Registered Wallets" in `WalletInitialization.tsx`) moves below it.
- The page `<title>` becomes "Send transaction | RPC | QA Helper".

## PreconditionStrip

A single row of requirement chips directly under the stage header. Replaces every "you need X first" treatment.

```
✓ Test wallet ready    ✕ RPC session not connected. Connect a wallet    ✓ Helper server
```

- Props: `requirements: { id, label, met: boolean | 'pending', fix?: { label, to } }[]`.
- Common requirements are provided as hooks so stages do not rebuild them: `useRequireTestWallet()`, `useRequireFundingWallet()`, `useRequireRpcSession()`, `useRequireSnap()`, `useRequireHelperServer()`, `useRequireNetwork('shielded-test')`, `useRequireCapability('view')`.
- States: all met (strip collapses to a single muted line "Ready: test wallet, RPC session"), some unmet (unmet items first, error colour icon, fix link), pending (warning dot, "Test wallet syncing").
- The stage still renders below it. The ExecuteBar disables the primary action with the first unmet requirement as the reason ("Connect an RPC session to send"), while dry run stays enabled.

## Panel

The one container. A white (`base-100`) box with a 1px `base-300` border, `rounded-box` radius, no shadow.

- Slots: `title` (`text-title-sm`), `description`, `actions` (right-aligned in the header row), `children`, optional `footer`.
- Sections inside a panel are separated by `border-t border-base-300` and a small heading, never by a nested Panel.
- `variant="inset"`: `base-200` background, no border, for sub-areas like an output row or a code sample.
- Panels stack in a `flex flex-col gap-4` parent; no margins on panels.
- No colour variants. A coloured message is a Callout.

## Callout

Inline message with icon, title (optional), body and optional action.

| Tone | Background / text | Icon | Use |
|---|---|---|---|
| info | `tint-info` / `info` | `MdInfoOutline` | Hints, "what this stage does" |
| success | `tint-success` / `success` | `MdCheckCircleOutline` | Completed actions that need a persistent note |
| warning | `tint-warning` / `warning-ink` | `MdWarningAmber` | Caution before an action (e.g. cleanup scope) |
| error | `tint-error` / `error` | `MdErrorOutline` | Failures |
| shielded | `tint-shielded` + veil left edge / `accent` | shield | Explaining shielded behaviour |
| dry-run | `base-100`, dashed `field-border` outline / ink | `MdOutlineScience` | "Request generated, not sent" |

Text is left-aligned. Lists inside a callout are real `<ul>` with bullets next to the text.

## Field

Label, control, hint and error in one component, with consistent spacing (`gap-1.5`).

- Props: `label`, `hint`, `error`, `required`, `htmlFor`, `children` (the control), optional `trailing` (e.g. a unit or a quick action).
- Label `text-body font-medium`, no trailing colon. Hint `text-caption text-ink-muted`. Error replaces the hint, `text-caption text-error`, with `aria-describedby` wiring and `aria-invalid` on the control.
- Controls use daisyUI `input`, `select`, `textarea`, `checkbox`, `toggle` with a border of `field-border`, 36px tall.
- States: default, focus (primary ring), filled, disabled (`base-200` fill, muted text, reason in the hint), invalid, read-only (no border, mono value with copy).

## AddressInput

Extends the existing `common/AddressInput.tsx`, which is already the right idea: one address field with quick-fill sources.

```
Recipient address                                               [Shielded]
┌──────────────────────────────────────────────────────────────────────────┐
│ K3ab12cdEf…                                                              │
└──────────────────────────────────────────────────────────────────────────┘
K3ab 12cd Ef9q 2Lmn  … (97 chars, grouped preview)        Fill from ▾  [Test addr 0] [Funding addr 0]
```

- New props: `accept: 'transparent' | 'shielded' | 'any'` (default `'transparent'`, so existing stages keep their behaviour), `network` (defaults to the active network, used for validation).
- Kind detection on every change: empty, transparent (valid base58 for the network), shielded (`K3` prefix, 97 chars, valid base58), invalid. The detected kind is a tag at the right edge of the field: "Transparent" (neutral) or "Shielded" (veil).
- Errors are specific: "This is a shielded address; this field needs a transparent address", "Address is for mainnet; active network is testnet", "97 characters expected, got 96".
- For shielded values, a grouped preview line below the field shows the full address in blocks of 4 so testers can compare it with what the wallet under test displays.
- Quick-fill sources gain shielded variants: `test-shielded`, `fund-shielded`, `snap-shielded` (only offered when the wallet's capability allows deriving a shielded address). Up to three sources render as small `btn-secondary btn-xs` buttons labelled "Test addr 0", "Funding addr 0", "Snap addr 0"; more than three collapse into a "Fill from" menu. Disabled sources say why on hover ("Test wallet not started").
- Value text in the input is mono (`text-data`).

## AmountInput

- Displays and accepts the decimal amount ("12.50") and shows the base-unit integer as a hint ("= 1250 base units"), because QA often needs to check the raw value in requests.
- Props: `token` (uid, symbol, decimals), `max` (optional; renders a "Max" button that fills the available balance), `allowZero`.
- Right-aligned, tabular, mono, symbol shown as trailing text in sans.
- Errors: not a number, too many decimals, above balance (warning, not error: QA sometimes wants to test insufficient funds, so it must remain sendable with an explicit note).

## SegmentedControl

Generic single-choice control: a row of `join` buttons with one selected (`btn-active` styling via theme), `role="radiogroup"` and arrow-key navigation. Used for output type, snap origin presets, address type in Get address stages, and the ShieldModeSelector. Each option may have `disabled` + `reason`.

## Identifier

The single way to show a hash, address, token UID or NC id.

- Props: `value`, `kind: 'tx' | 'token' | 'nc' | 'address' | 'shielded-address' | 'xpub'`, `truncate: 'middle' | 'none'` (default middle), `head`/`tail` lengths (defaults: 8/8 for hex, 6/6 for addresses), `walletTag` (auto-detected from the user's wallets when possible: "Test addr 0").
- Renders mono `text-data`; middle ellipsis; a copy button that shows an inline check for 1.5s (no toast); click on the value opens a popover with the full value grouped (8 for hex, 4 for addresses) and a copy button.
- Shielded addresses get the shield glyph in front and the `K3` prefix in accent colour.
- Never wraps mid-identifier in the truncated form. In full form it wraps only at group boundaries.

## TxIdDisplay

`Identifier kind="tx"` + `TxStatus` + `ExplorerLink`, in one row:

```
0000a3f1…9c0e77b2  ⧉   ● Confirmed   Explorer (testnet) ↗
```

- Network for the explorer link comes from the active network unless passed explicitly; the link chip uses the channel colour. This removes the 11 hard-coded `network="testnet"` props.
- Status uses StatusDot: Unconfirmed (warning, animated ring), Confirmed (success), Voided (error, hash struck through), Unknown (neutral, "Checking…").
- If the transaction has shielded outputs, a ShieldedBadge with the count follows the status.
- Keeps `TxStatus.tsx`'s fetching strategy as is; only the presentation changes.

## JsonPanel

Request and response viewer used by MethodCard, raw editor and response displays.

- Header: title ("Request", "Response"), state tag ("Preview", "Sent 14:02:11", "Dry run"), actions: Formatted/Raw `SegmentedControl` (when a formatted view exists), Copy, Collapse.
- Body: mono `text-data`, syntax colours from the theme (keys `primary`, strings `success`, numbers `info`, booleans `warning-ink`, null `ink-muted`), line wrapping at 100% width, max height 24rem with scroll, never centred.
- Formatted view for transaction-like responses is TxIdDisplay plus an inputs/outputs DataTable (shared with the shielded inspector).
- BigInt values render as plain digits (they are already strings in Redux), never in scientific notation.

## MethodCard

Generalise `snap/SnapMethodCard.tsx` into `common/MethodCard.tsx` with two thin adapters, so RPC and Snap stages are built the same way:

- `useSnapMethod` (exists) feeds the Snap variant.
- A new `useRpcMethod` hook wraps `rpcSlice` request/response/dry-run state for the RPC variant.

Layout: Compose panel (title from StageHeader, inputs, ExecuteBar) and Inspect panel (request JsonPanel, response JsonPanel or Callout, duration). Side by side at ≥1280px; stacked below.

States:

| State | Compose | Inspect |
|---|---|---|
| Idle | Inputs enabled, primary action enabled if preconditions met | Request "Preview", live; no response block |
| Running | Inputs read-only, button shows spinner and "Waiting for wallet" / "Waiting for MetaMask" | Request "Sending" |
| Success | Inputs editable again | Response "Received in 812 ms"; TxIdDisplay if transaction-like |
| Dry run | | Callout dry-run: "Request generated, not sent." Request tagged "Dry run" |
| Rejected | | Callout warning: "Rejected in the wallet. Nothing was sent." |
| Error | | Callout error with the plain explanation and the raw message in mono |

The `LoadingOverlay` over the whole card goes away; a running state on the button and the request tag is enough and keeps the inputs visible.

## ExecuteBar

Right-aligned row at the bottom of the Compose panel: dry-run toggle (daisyUI `toggle`, label "Dry run"), secondary actions, primary button.

- Primary button label is the action: "Send transaction", "Create token", "Sign message". Not "Execute X".
- On mainnet (active network kind `main` and not dry run): button becomes outlined red with the label "Send on mainnet" (or "Create token on mainnet"), and the first click arms it ("Click again to send on mainnet", 4s timeout). No modal.
- Disabled state always has a reason visible next to the button, not only in a tooltip.

## State blocks (empty, loading, error)

- **Empty** (`ui/EmptyState.tsx`): one sentence saying what will appear here and the action that makes it appear. Example for Tx update events: "Events from running wallets appear here. Start a wallet to see new-tx and update-tx events." Left-aligned inside the panel, muted, with one button when there is an action. No dashed boxes.
- **Loading**: inline spinner inside buttons; skeleton rows for tables and balances (`skeleton` class, 36px rows); a full-panel spinner only for first load of a stage that has nothing else to show. `LoadingOverlay` is reserved for "waiting for an external wallet prompt" and even there prefer the MethodCard running state.
- **Error** (`ui/ErrorState.tsx`): plain sentence of what failed, the raw error in mono below (selectable, copyable), and a Retry button when retry makes sense.

## Toasts

`ToastContainer.tsx` restyled:

- Bottom-right, stacked, max 3 visible (older ones collapse into "+2 more").
- Success and info auto-dismiss after 4s; warning after 8s; error stays until dismissed.
- `aria-live="polite"` for success/info, `assertive` for errors.
- Uses theme tones (Callout palette), `shadow-float`.
- Toasts confirm actions using the same verb as the button ("Transaction sent", "Wallet started"). Copy actions do not toast; the copy button confirms inline.

## ConfirmDialog

`ui/ConfirmDialog.tsx` on daisyUI `modal` with `role="dialog"`, `aria-modal`, focus trap and focus return.

- Props: `title`, `body`, `confirmLabel` (verb: "Remove wallet"), `tone` (`default` | `danger`), optional `typeToConfirm` (string the user must type).
- Replaces the four `window.confirm` calls. "Force stop" and "Remove wallet" are `danger`. On mainnet, Test wallet cleanup uses `typeToConfirm` with the wallet's friendly name.
- Also apply `role="dialog"` and `aria-modal` to the existing modals (`SeedPhraseModal`, `DeepLinkModal`, `WalletBrowserModal`, `ConfigurationStringModal`, `AllConfigStringsModal`).

## StatusDot and StatusChip

- `StatusDot`: 8px; shapes per status (hollow ring, animated ring, filled, filled with bar, dashed ring) as defined in [direction.md](direction.md). `aria-hidden`; the word is always rendered next to it.
- `StatusChip`: dot + word in a `rounded-full` chip with the tone's tint. Used in tables and the wallet context bar.
- Statuses map from wallet status (`idle`, `connecting`, `syncing`, `ready`, `error`), tx status, session status and helper-server status via one `statusTone()` helper in `src/utils/`.

## NetworkChip

`rounded-full` chip with channel colour and pattern: Testnet (teal outline), Shielded testnet (violet outline, hatched dot), Mainnet (solid red). Short form for tight spaces ("Test", "Shielded", "Main"). Only shown inside stages when it adds information (wallet rows, mismatch warnings); the top bar already shows the active network.

## CapabilityBadge

Shows a wallet's shielded capability.

```
▮▮▯ View
```

- Three segments plus the word: None (no segments filled, muted), Watch (1), View (2), Full (3). Filled segments use `accent`.
- Tooltip states what the level allows. Proposed copy, to confirm with the wallet-lib team: Watch "Sees that shielded outputs exist", View "Can decrypt shielded amounts", Full "Can decrypt and spend shielded outputs".
- Shown next to the wallet name in the wallet context bar (Shielded testnet only), in wallet pickers, and in the shielded inspector's "Decrypting with" line.

## ShieldedBadge

Small `rounded` badge: shield glyph + "Shielded", accent text on `tint-shielded` with a veil left edge. Variants: `amount` (outline shield, "Amount shielded"), `full` (filled shield, "Fully shielded"), `count` ("2 of 3 shielded"). Used on outputs, transactions and addresses.

## ShieldModeSelector

SegmentedControl with three options, used per output row:

| Option | Glyph | Subline under the control when selected |
|---|---|---|
| Transparent | none | "Amount and token are public" |
| Amount shielded | outline shield | "Amount hidden; token public" |
| Fully shielded | filled shield | "Amount and token hidden" |

- Disabled with reason when not available: off Shielded testnet ("Shielded outputs need Shielded testnet"), or when the sending wallet's capability is too low.
- Selecting a shielded mode switches the row's AddressInput to `accept="shielded"`; an existing transparent value becomes an inline error rather than being cleared. Confirm with the protocol team whether shielded outputs always require a shielded recipient address.
- Keyboard: arrow keys move, Space selects; `role="radiogroup"` with the label "Output privacy".

## OutputEditor

The output list used by send-transaction stages (RPC, Snap, and the shielded stages):

```
┌ Output 1 ──────────────────────────────────────────── [Transparent|Amount shielded|Fully shielded] ✕ ┐
│ ▌Recipient   [K3ab12…7xYz9Q                                  Shielded]  Fill from ▾                   │
│ ▌Amount      [      12.50 ] HTR ▾        Timelock  [none ▾]                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
[+ Add output]   3 of 255 outputs, 2 shielded
```

- Each row is a Panel `variant="inset"`. Shielded rows get a 3px veil strip on the left edge so mixed lists scan quickly.
- Data outputs (the current "Output type: data" option) stay as a row type; data rows have no privacy selector.
- Row actions: duplicate, remove. Reordering is not needed.
- Summary line under the list: output count, how many shielded, total per token (hidden totals shown as the hatched pill).

## DataTable

`ui/DataTable.tsx`, a thin wrapper over daisyUI `table` with:

- 36px rows, `base-200` header, sticky header inside scroll areas, no zebra.
- Column types: `text`, `identifier` (renders Identifier), `amount` (right-aligned, tabular, hidden-amount pill support), `status` (StatusChip), `actions` (icon buttons with labels).
- Empty, loading (skeleton rows) and error states built in.
- Below 768px rows render as stacked label/value pairs.

## Shielded transaction inspector (screen-level pattern)

Not a primitive, but the reference composition for shielded work (mocked in `mockups/shielded-inspector.html`):

1. StageHeader with a tx-hash input (Identifier-aware field) and "Inspect" button.
2. Summary Panel: TxIdDisplay, timestamp, block, ShieldedBadge count, "Decrypting with: Test wallet, CapabilityBadge View".
3. Inputs DataTable and Outputs DataTable. Output columns: index, privacy (badge), recipient (Identifier), token (or hidden pill), amount (or hidden pill, or decrypted value with the eye glyph), actions (view commitment data).
4. Commitment details in a collapsible JsonPanel per shielded output.
5. Callout shielded explaining any hidden values ("2 amounts are hidden. A wallet with View capability can decrypt them.").
