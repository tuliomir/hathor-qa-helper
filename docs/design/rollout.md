# Rollout plan

Incremental order for implementing the redesign: foundation, then tokens, then shell, then shared components, then a stage sweep that several agents (or people) can run in parallel. Each task is sized to be one reviewable PR, leaves the app working, and has an explicit check.

Read [audit.md](audit.md) for the why, [tokens.md](tokens.md), [shell.md](shell.md) and [components.md](components.md) for the what.

## Rules that apply to every task

- `bun` only. Before opening a PR: `bun run typecheck`, `bun lint`, `bun format:check`, `bun test`, and `bun run test:e2e` when the task touches layout or navigation.
- Visual check in Playwright at 1440×900 and 390×844 on the stages listed in the task. Use the playwright-navigation skill for routes.
- No task changes behaviour (Redux, handlers, wallet logic) except where it says so. Design PRs and shielded-feature PRs stay separate.
- After task T2, no new raw palette classes (`bg-blue-50`, `text-red-900` …) in touched files. T11 turns this into a lint gate.
- Update `knowledge/design-system.md` in the same PR whenever a task changes a convention it documents.

## Dependency graph

```
T0 ─► T1 ─► T2 ─┬─► T3 ─► T4 ─► T5
                │
                └─► T6 ─► T7 ─► T8 ─┬─► T9a ─┐
                                    ├─► T9b ─┤
                                    ├─► T9c ─┼─► T10 ─► T11
                                    └─► T9d ─┘
```

T3–T5 (shell) and T6–T8 (components) can run in parallel after T2; they touch different files. The sweep (T9a–d) waits for T8.

## Phase 0: stop the bleeding

### T0. Remove the Vite starter CSS and fix dead utilities

Small, high-impact, no design decisions.

- Delete `src/App.css` and its import in `src/App.tsx`.
- In `tailwind.config.ts` add the two legacy aliases from [tokens.md](tokens.md): `spacing['7.5'] = '1.875rem'` and `fontSize['2xs']`. Delete the ignored `daisyui: { themes, logs }` key.
- `StageContent.tsx`: `p-7.5` now works; check nothing overflows.

Files: `src/App.tsx`, `src/App.css` (deleted), `tailwind.config.ts`.

Verify: at 1440px the sidebar touches the left edge and spans the full height; stage text is left-aligned; cards on RPC Connection have a gap between them; `getComputedStyle` of a `.card-primary.mb-7\.5` reports `margin-bottom: 30px`. Spot-check Wallet initialization, Snap connection, Test wallet cleanup, Desktop walkthrough for anything that relied on centring.

## Phase 1: tokens

### T1. Theme, fonts and colour aliases

- Paste the `[data-theme='bench']` and `[data-theme='bench-dark']` blocks and the base layer from [tokens.md](tokens.md) into `src/index.css`. Set `data-theme="bench"` on `<html>` in `index.html`.
- Self-host Atkinson Hyperlegible Next (400/500/600/700) next to JetBrains Mono in `public/fonts/`; switch `:root` font to sans. JetBrains Mono stays for `font-mono`.
- Replace the `colors` block in `tailwind.config.ts` with the extension in [tokens.md](tokens.md): drop `primary`, `success`, `warning`, `info` overrides; keep `danger`, `muted`, `light`, `dark`, `border`, `primary-dark` as variable aliases; add `ink-muted`, `field-border`, `net.*`, `tint.*`, `shadow-float`, `bg-veil`, font sizes.
- Replace the six opacity-modifier uses (`bg-primary/10` ×3, `bg-success/10`, `bg-warning/10`, `bg-danger/10`) with `tint-*` colours.

Files: `src/index.css`, `index.html`, `tailwind.config.ts`, `public/fonts/*`, the files containing the six opacity modifiers.

Verify: all stages still render; buttons, toasts and checkboxes now share one primary; prose is in the sans face and hashes/JSON in mono; run the contrast script (or browser devtools) on primary button, muted text and warning text. Expect visual change everywhere; that is the point. Screenshots before and after on 6 stages go in the PR.

### T2. Retire the colliding component classes

The custom `.btn*`, `.card`, `.card-primary`, `.input*`, `.table-*`, `.status-*` rules in `src/index.css` fight daisyUI 5 (audit §1.3).

- Move them into a clearly marked `/* LEGACY: delete in T10 */` block and rewrite them as thin aliases on daisyUI classes: `.btn-danger` → `btn btn-error`, `.btn-secondary` keeps `btn btn-secondary`, `.card-primary` → `bg-base-100 border border-base-300 rounded-box p-4`, `.input` → daisyUI `input` with `field-border`, `.input-error` → `input input-error`, `.status-*` → text colours from the theme.
- Remove the custom `.btn` and `.card` base rules so daisyUI's own `.btn`/`.card` apply unmodified (this kills the pink shadow under grey buttons).

Files: `src/index.css` only.

Verify: no magenta shadow under secondary buttons (walkthrough "Next", Snap connection origin buttons); every button family renders at 36px; `bun run test:e2e` passes (selectors that target class names may need updating; prefer roles).

## Phase 2: shell (parallel with phase 3)

### T3. Network model and rail

Coordinate with the Shielded testnet work; this task only adds what the UI needs.

- `src/constants/network.ts`: add `kind` and `label` to each `NETWORK_CONFIG` entry (and the `SHIELDED_TESTNET` entry if the feature work has not added it yet, behind whatever flag that work uses).
- New `networkSlice` with `activeNetwork` (persisted like other UI state), and a selector `selectActiveNetworkKind`.
- `shell/NetworkRail.tsx`, `common/NetworkChip.tsx`.
- `ExplorerLink.tsx` defaults to the active network; remove the 11 hard-coded `network="testnet"` props.

Files: `src/constants/network.ts`, `src/store/slices/networkSlice.ts` (new), `src/store/index.ts`, `src/components/shell/NetworkRail.tsx` (new), `src/components/common/NetworkChip.tsx` (new), `src/components/common/ExplorerLink.tsx`, call sites of `network="testnet"`.

Verify: unit tests for `kind` mapping and explorer URL resolution for all three networks; rail visible on every route; setting the network to mainnet in Redux devtools shows the red band and `[Mainnet]` title prefix.

### T4. Shell: top bar, wallet context, server pill, network switcher, stage nav

- Build `shell/AppShell.tsx`, `TopBar.tsx`, `WalletContextBar.tsx`, `HelperServerPill.tsx` (+ `helperServerSlice`, `useHelperServerHealth`), `NetworkSwitcher.tsx`, `StageNav.tsx`, `WorkspaceSwitcher.tsx` per [shell.md](shell.md).
- Add `family` to `StageGroup` and `STAGE_FAMILIES` in `src/types/stage.ts`; drop stage emoji `icon` fields (keep the type optional so nothing breaks). Shorten duplicated titles ("Send Transaction (Snap)" → "Send transaction"); the URL slugs in `config/stageRoutes.ts` do not change.
- `QALayout.tsx`, `MobileQALayout.tsx`, `DesktopQALayout.tsx` render inside `AppShell`; delete `Sidebar.tsx`, `MobileQAHeader.tsx`, `DesktopQAHeader.tsx`.
- Responsive drawer below 1024px.

This is the largest task; split into T4a (AppShell + TopBar + StageNav + workspaces) and T4b (WalletContextBar + HelperServerPill + NetworkSwitcher) if it gets too big. T4b depends on T4a.

Files: `src/components/shell/*` (new), `src/components/QALayout.tsx`, `src/components/Sidebar.tsx` (deleted), `src/components/mobile/MobileQALayout.tsx`, `src/components/mobile/MobileQAHeader.tsx` (deleted), `src/components/desktop/DesktopQALayout.tsx`, `src/components/desktop/DesktopQAHeader.tsx` (deleted), `src/types/stage.ts`, `src/store/slices/helperServerSlice.ts` (new), `src/hooks/useHelperServerHealth.ts` (new), `e2e/*` navigation specs.

Verify: e2e navigation to every group; deep link to `/tools/snaps/send-transaction` shows the active row in view; keyboard-only pass through top bar and nav (Tab order, visible focus, Esc closes popovers); 390px shows content full-width with the drawer closed; walkthroughs reachable from the workspace switcher and still track progress.

### T5. Command palette

- `shell/CommandPalette.tsx` with Recent, Stages, Actions per [shell.md](shell.md); `Ctrl K` / `⌘K`; `/` focuses the nav filter.

Files: `src/components/shell/CommandPalette.tsx` (new), `src/components/shell/TopBar.tsx`, a small `src/utils/stageSearch.ts` (new) with unit tests.

Verify: unit tests for search ranking (method name `htr_getBalance` returns both Get balance stages, family shown); e2e: open, type, Enter navigates, Esc restores focus.

## Phase 3: shared components (parallel with phase 2)

### T6. Primitives

`src/components/ui/`: `Panel`, `Callout`, `Field`, `SegmentedControl`, `StatusDot`, `StatusChip`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `DataTable`. Plus `src/utils/statusTone.ts`.

- `ToastContainer.tsx` restyle and placement; `CopyButton.tsx` inline confirmation instead of a toast.
- Replace the four `window.confirm` calls with `ConfirmDialog` (this touches `WalletInitialization.tsx`, `CustomTokens.tsx`, `WalletNetworkControl.tsx`; keep those diffs to the confirm call only so the sweep lanes are not blocked).
- Add `role="dialog"` / `aria-modal` to the five existing modals.

Verify: unit tests for `statusTone` and `SegmentedControl` keyboard behaviour; a scratch stage or Storybook-free test page is not needed, use the existing stages that adopt them in T8.

### T7. Data and form components

`src/components/common/`: `Identifier`, `TxIdDisplay` (wrapping existing `TxStatus` logic), `JsonPanel` (extracting `JsonHighlight` from `SnapMethodCard.tsx`), `AmountInput`, `StageHeader`, `PreconditionStrip` with the `useRequire*` hooks; extend `AddressInput` with `accept`, kind detection and grouped preview (shielded detection behind a pure function `detectAddressKind()` with unit tests: transparent testnet, transparent mainnet, shielded 97-char `K3`, wrong length, wrong network).

Verify: unit tests for `detectAddressKind`, amount parsing/formatting (decimal ↔ base units, BigInt-safe), middle truncation; render checks on Snap send transaction and RPC send transaction after T8.

### T8. MethodCard and shielded components

- Generalise `snap/SnapMethodCard.tsx` into `common/MethodCard.tsx`; add `useRpcMethod`; keep `SnapMethodCard` as a re-export until T10.
- `common/ShieldedBadge.tsx`, `common/CapabilityBadge.tsx`, `common/ShieldModeSelector.tsx`, `common/OutputEditor.tsx`, `common/ExecuteBar.tsx` (absorbs `DryRunCheckbox.tsx`; mainnet arming).
- Convert one RPC stage and one Snap stage end to end as the reference implementations: RPC send transaction (`stages/SendTransactionStage.tsx`, `rpc/RpcSendTransactionCard.tsx`) and Snap send transaction (`stages/SnapSendTransactionStage.tsx`). The sweep copies these.

Verify: both reference stages pass e2e; dry run works without a session; compose/inspect columns at 1440px, stacked at 1024px; mainnet arming tested by unit test on `ExecuteBar`.

## Phase 4: stage sweep (parallel)

Each lane owns a disjoint set of files. A lane must not edit `src/components/common/`, `src/components/ui/`, `src/components/shell/`, `src/index.css`, `tailwind.config.ts` or `src/types/stage.ts`. If a lane needs a change to a shared component, it writes it down in its PR description (or a note in `.scratch/`) and the change goes into a follow-up shared-components PR; the lane works around it locally without forking the component.

Per-file checklist for every lane:

1. `StageHeader` first, then `PreconditionStrip`, then content.
2. Containers are `Panel` in a `flex flex-col gap-4` parent; no `mb-7.5`, `mt-7.5`, `card-primary`.
3. Coloured boxes become `Callout`; empty/loading/error use the state blocks.
4. Identifiers use `Identifier` / `TxIdDisplay`; no `break-all` on identifiers.
5. Inputs use `Field`, `AddressInput`, `AmountInput`, `SegmentedControl`.
6. No raw palette classes, no emoji, no inline SVG paths, no `text-2xs`.
7. Visual check at 1440 and 390 for every stage in the lane.

Lane check (run on the lane's files only):

```sh
grep -nE 'mb-7\.5|mt-7\.5|card-primary|text-2xs|break-all|window\.confirm|\b(bg|text|border)-(blue|green|red|yellow|gray|purple|orange|amber|indigo|slate|emerald)-[0-9]{2,3}' <lane files>
```

It should print nothing.

### T9a. Wallets lane

`stages/WalletInitialization.tsx`, `AddressValidation.tsx`, `AddressListViewer.tsx`, `AddressQRValidator.tsx`, `SeedPhraseCapture.tsx`, `FundTestAddress.tsx`, `CustomTokens.tsx`, `TransactionHistory.tsx`, `TxUpdateEvents.tsx`, `TestWalletCleanup.tsx`, `PushNotifications.tsx`, `MultisigWalletManagement.tsx`.

Notes: move "Registered wallets" below the stage header; Test wallet cleanup puts preconditions and the scope callout first and the debug panel last (collapsed); tables use `DataTable`.

### T9b. WalletConnect RPC lane

`stages/ConnectionStage.tsx`, `BasicInfoStage.tsx`, `GetAddressStage.tsx`, `GetBalanceStage.tsx`, `GetUtxosStage.tsx`, `SignWithAddressStage.tsx`, `CreateTokenStage.tsx`, `SignOracleDataStage.tsx`, `RawRpcEditorStage.tsx`, `BetInitializeStage.tsx`, `BetDepositStage.tsx`, `SetBetResultStage.tsx`, `BetWithdrawStage.tsx`, `FeeInitializeStage.tsx`, `FeeDepositStage.tsx`, `FeeWithdrawStage.tsx`, and all of `src/components/rpc/` except `RpcSendTransactionCard.tsx` (done in T8).

Notes: each `Rpc*Card.tsx` should shrink substantially once it uses `MethodCard`; delete `RpcNotConnectedBanner.tsx` and `RpcRequestPreview.tsx` when the last user is gone. This lane is the biggest; split into T9b-1 (connection, info, address, balance, UTXOs, sign, create token, oracle, raw editor) and T9b-2 (bet and fee nano contracts) if two agents are available.

### T9c. MetaMask Snap lane

All `stages/Snap*Stage.tsx` except `SnapSendTransactionStage.tsx` (done in T8), plus `src/components/snap/SnapResponseDisplay.tsx` and `SnapNotConnectedBanner.tsx`.

Notes: Snap connection's setup guide becomes left-aligned prose (`text-body-lg`, `max-w-prose`) with real numbered steps and `JsonPanel`-style code blocks; origin presets use `SegmentedControl`.

### T9d. Walkthroughs lane

`src/components/mobile/MobileQASidebar.tsx`, `MobileQAStepContent.tsx`, `MobileQAToolPanel.tsx`, `src/components/desktop/DesktopQASidebar.tsx`, `DesktopQAStepContent.tsx`, `src/components/common/MarkdownText.tsx` (owned by this lane for the sweep only), `src/config/mobileQA/components.tsx`, `src/config/desktopQA/components.tsx`.

Notes: step rows per [shell.md](shell.md); instructions left-aligned at `max-w-prose`; step navigation buttons: "Previous" (ghost), "Mark complete" (secondary), "Complete and next" (primary); drop the separate "Next" button or make it a ghost link, since four buttons for two decisions is too many.

## Phase 5: clean up

### T10. Remove leftovers

- Delete legacy aliases: the `LEGACY` block in `src/index.css`, `spacing['7.5']`, `fontSize['2xs']`, and the `danger`/`muted`/`light`/`dark`/`border`/`primary-dark` colour aliases.
- Delete `SnapMethodCard` re-export, `DryRunCheckbox.tsx`, `NetworkSwapButton.tsx` (if no users remain), `Loading.tsx` / `LoadingOverlay.tsx` (if replaced), `STAGES` deprecated export if unused.

Verify: typecheck catches removed exports; the lane check regex returns nothing on `src/`.

### T11. Guard rails and docs

- Add `scripts/design-lint.ts` (bun) running the lane-check regex across `src/` and wire it into `bun lint` (or a `lint:design` script).
- Rewrite `knowledge/design-system.md` and `knowledge/daisyui-components.md` to describe the new components and tokens, pointing at `docs/design/`. Update `knowledge/creating-stages.md` so new stages start from `StageHeader`, `PreconditionStrip` and `MethodCard`.
- Add a `/design` route or a dev-only "Kitchen sink" stage showing every component state, if the team wants a living reference.

Verify: `bun lint` fails on a deliberately added `bg-blue-50` and passes after removing it.

## Sizing guide

| Task | Size | Parallel with |
|---|---|---|
| T0 | XS (under an hour) | none |
| T1 | S | none |
| T2 | S | none |
| T3 | S | T6 |
| T4a / T4b | L / M | T6, T7 |
| T5 | S | T7, T8 |
| T6 | M | T3, T4 |
| T7 | M | T4, T5 |
| T8 | L | T5 |
| T9a–T9d | M each (T9b L) | each other |
| T10 | S | none |
| T11 | S | none |
