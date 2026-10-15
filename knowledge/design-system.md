# Design system

Tailwind CSS 3 + daisyUI 5 (pinned to 5.5.20) + the `bench` theme + react-icons. The spec is in `docs/design/`:

| Doc | What |
|---|---|
| `docs/design/tokens.md` | Colours, type scale, spacing, the `bench` / `bench-dark` themes |
| `docs/design/components.md` | Every shared component, its props and states |
| `docs/design/shell.md` | App shell: network rail, top bar, stage nav, command palette |
| `docs/design/direction.md` | Visual direction and status shapes |
| `docs/design/rollout.md` | How the redesign landed (T0–T11) |

This page is the working summary. When code and this page disagree, fix this page in the same PR.

## The gate

`bun run lint` runs ESLint and then `lint:design` (`apps/client/scripts/design-lint.ts`), which fails on anything the redesign retired:

- raw palette classes: `bg-|text-|border-` + `blue|green|red|yellow|gray|purple|orange|amber|indigo|slate|emerald` + a shade (`bg-blue-50`, `text-red-900`)
- `mb-7.5`, `mt-7.5`, `card-primary`, `text-2xs`
- `break-all` (identifiers use `Identifier`; long free text uses `[overflow-wrap:anywhere]`)
- `window.confirm` (use `useConfirm()` / `ConfirmDialog`)

Run `bun run lint:design` alone for a quick check. It prints `file:line: match`.

## Theme and tokens

`<html data-theme="bench">` (dark: `bench-dark`). Colours are daisyUI 5 theme variables plus app variables prefixed `--qa-`, both defined in `src/index.css`.

- Surfaces: `bg-base-100` (panels), `bg-base-200` (page, insets, table headers), `border-base-300` (dividers, panel borders)
- Text: `text-base-content`, `text-ink-muted` (secondary text), `text-warning-ink` (warning text; `text-warning` is too light on white)
- Semantic: `primary`, `secondary`, `info`, `success`, `warning`, `error`; `accent` is reserved for shielded
- App colours (`tailwind.config.ts`): `border-field-border` (3:1 control border), `bg-tint-success|warning|error|info|shielded|testnet`, `text-net-testnet|shielded|mainnet`, `shadow-float`, `bg-veil` (shielded hatch)
- No `/<alpha>` modifiers on theme colours: Tailwind 3 cannot apply them to CSS variables. Use the `tint-*` colours.
- Form controls (`input`, `select`, `textarea`) get the `field-border` border from one rule in `src/index.css`. daisyUI's `.input` is 20rem wide by default: add `w-full` (or `flex-1`) yourself.

Type scale: `text-caption` (12), `text-body` (14), `text-body-lg` (16), `text-title-sm` (18), `text-title` (21), `text-page` (24), `text-data` / `text-data-sm` (mono data). Interface text is Atkinson Hyperlegible Next (`font-sans`); hashes, addresses, amounts and JSON are JetBrains Mono (`font-mono`, slashed zero, tabular figures).

Spacing is the plain Tailwind scale. Stages stack sections with `flex flex-col gap-4`; nothing uses margins between panels.

## Components

Specs in `docs/design/components.md`. Build stages from these, not ad-hoc markup.

`src/components/ui/` (primitives, no Redux):

| Component | Use |
|---|---|
| `Panel` | The one container. `title`, `description`, `actions`, `footer`; `variant="inset"` for sub-areas |
| `Callout` | Inline message. Tones `info`, `success`, `warning`, `error`, `shielded`, `dry-run`; optional `title`, `action` |
| `Field` | Label + control + hint/error, wires `id`/`aria-describedby`/`aria-invalid` onto its child. Pass `wireControl={false}` when the child is a wrapper, and wire the input yourself |
| `SegmentedControl` | Single choice as a radiogroup (arrows, Home/End) |
| `StatusDot`, `StatusChip` | Status word + shape; tone from `statusTone()` (`src/utils/statusTone.ts`) |
| `DataTable` | Tables: typed columns (`identifier`, `amount`, `status`, `actions`), empty/loading/error states, stacked rows below 768px, optional `onRowClick` |
| `EmptyState`, `ErrorState` | One sentence plus an action; raw error in mono with Retry |
| `Modal` | daisyUI modal with title, close, Escape and backdrop |
| `ConfirmDialog` / `useConfirm()` | Yes/no questions, `tone="danger"`, optional type-to-confirm |
| `usePopover` | Anchored popovers and menus (Escape, outside click) |

`src/components/common/` (may read Redux):

| Component | Use |
|---|---|
| `StageHeader` | First thing in a stage: breadcrumb (family title / group), title, description, method chip, docs link; sets the tab title. Walkthroughs pass `title` + `breadcrumb` instead of `stageId` |
| `PreconditionStrip` | Requirement chips under the header, fed by `useRequire*()` hooks (`src/hooks/useRequirements.ts`). `firstUnmetReason()` gives the ExecuteBar's disabled reason |
| `MethodCard` | Compose panel (inputs + `ExecuteBar`) and Inspect panel (live request, outcome). Outcome carries `data-result="success|error|rejected|dry-run"`. Props of note: `inspectExtra`, `secondaryActions`, `txExplorerPage` (`nc_detail` for contract IDs), `txWalletId` |
| `RpcMethodCard` (`components/rpc/`) | RPC adapter: arms for mainnet only when the WalletConnect session approved `hathor:mainnet`, adds "Edit raw" |
| `SnapMethodCard` (`components/snap/`) | Snap adapter: MetaMask rejection detection, snap tx-hash extraction, arming from the snap's network |
| `ExecuteBar` | Action-named primary button, dry-run toggle, visible disabled reason, mainnet arming |
| `Identifier` | Every hash, address, token UID, NC id, xpub: mono, middle-truncated, copy, grouped popover. Never `break-all` |
| `TxIdDisplay` | `Identifier` + `TxStatus` + `ExplorerLink` (`specificPage` for NC/token pages) |
| `JsonPanel` | Request/response JSON with Formatted/Raw |
| `AddressInput` | Address field with kind detection (`accept: transparent|shielded|any`), quick-fill `sources`/`customSources`, `hint` |
| `AmountInput` | Decimal amount, reports base units as a decimal string |
| `OutputEditor`, `ShieldModeSelector` | Output rows for send stages; per-row privacy |
| `ShieldedBadge`, `CapabilityBadge`, `HiddenAmount` | Shielded markers. `CapabilityBadge` takes `canCreateShieldedOutputs` (never `canSpend`): a browser wallet reads "View · receive-only" |
| `NetworkChip`, `NetworkSwapButton`, `ExplorerLink` | Network label, wallet network swap, explorer link (defaults to the active network) |
| `BlueprintUnavailable` | Warning when the network has no QA blueprint |

### Amounts

Amount fields show decimal token units, as client wallets display them: `1.50` HTR, not `150`. Typing works like a cash register: digits enter from the right, so `500` reads `5.00` and `30` reads `0.30` (`keyedAmount` in `utils/amount.ts`); a pasted decimal such as `12.5` is read as token units. Use `AmountInput`; it keeps the value as base units (a decimal string, BigInt-safe) and shows `= 150 base units` under the field, because QA checks the raw value in requests. Requests and Redux always carry base units. Results that list amounts (UTXO tables, Scatter's summary) show decimals too, with base units alongside where QA compares them against a request (`utils/scatterFunds.ts`).

Exception: the Snap stages still take base-unit integers in plain inputs.

Toasts sit bottom-right, at most three. Success and info dismiss after 4s, warnings after 8s, errors stay. `CopyButton` confirms inline and never toasts.

## Shell

Every route renders inside `components/shell/AppShell`: network rail, 48px top bar (workspace switcher, wallet context, Find stage / `Ctrl K`, helper server pill, network switcher), the `Stages` navigation and the content. Spec: `docs/design/shell.md`.

- The active network (`selectActiveNetwork`) follows the test wallet, else the funding wallet, else the switcher's choice. Use it instead of hard-coding `testnet`.
- Network visuals key off `NETWORK_CONFIG[key].kind` (`test`, `shielded-test`, `main`) via `utils/networkVisuals.ts`.
- Stage titles are sentence case without "(Snap)" or "RPC"; the family carries that.
- `/` focuses the nav filter and `Ctrl K` / `⌘K` opens the command palette. `main.tsx` renders the first frame synchronously, so both work as soon as the page has loaded.

## Writing UI

- Sentence case for every label, button and title. Buttons say the action ("Send transaction"), not "Execute".
- Icons only from `react-icons/md` (outlined where available). No emoji, no hand-pasted SVG. Icon-only buttons get `aria-label`.
- Every control is a real `button`, `a` or form control with a visible focus ring.
- Optional inputs say so in the hint ("Optional. The wallet picks one when empty."), not in the label.
- Coloured boxes are `Callout`s. Containers are `Panel`s. There are no colour variants of panels.

```tsx
<div className="flex max-w-stage flex-col gap-4">
  <StageHeader stageId="snap-get-xpub" method="htr_getXpub" />
  <PreconditionStrip requirements={[snapRequirement]} />
  <SnapMethodCard title="Get xpub" /* … */>
    <Field label="Network" hint="The network whose xpub the snap returns.">
      <select className="select w-full">…</select>
    </Field>
  </SnapMethodCard>
</div>
```
