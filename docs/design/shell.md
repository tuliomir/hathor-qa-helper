# App shell, navigation and header

Spec for the frame around every stage: the network rail, top bar, wallet context, stage navigation, command palette, and how the mobile and desktop walkthroughs share the same frame. Visual language comes from [direction.md](direction.md); values from [tokens.md](tokens.md).

## Current state, briefly

- `src/components/QALayout.tsx` renders a fixed blue gradient header with up to two wallet summaries, then `Sidebar.tsx` and `StageContent.tsx`.
- `src/components/desktop/DesktopQAHeader.tsx` and `src/components/mobile/MobileQAHeader.tsx` each render their own gradient header (cyan and purple) with progress.
- Nothing links to `/mobile` or `/desktop` from the main app.
- No network indicator, no helper server status, no responsive behaviour. See [audit.md](audit.md) §2, §3, §8.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ network rail (3–6px) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ QA Helper  Tools ▾ │ Test  Android-Nov14 ●Ready 12.50 HTR ◧View │ Funding  Fund-01 ●Ready │
│                    │ RPC ●  Snap ○                               [⌕ Find stage  Ctrl K]  │
│                    │                                             (● Helper)  [● Testnet ▾]│
├──────────────┬───────────────────────────────────────────────────────────────────────────┤
│ ⌕ Filter     │  WalletConnect RPC / RPC requests                                         │
│              │  Send transaction                              htr_sendTransaction        │
│ Wallets      │  Send a transaction with one or more outputs.                             │
│   Main QA  3 │  ┌ preconditions ─────────────────────────────────────────────────────┐   │
│   Auditing 3 │  │ ✓ Test wallet ready   ✕ RPC session not connected. Connect a wallet │   │
│ WalletConn ● │  └────────────────────────────────────────────────────────────────────┘   │
│   RPC req 10 │  ┌ Compose ───────────────────┐  ┌ Inspect ──────────────────────────┐    │
│  ▌Send tx    │  │ outputs editor             │  │ request preview / response        │    │
│   Get bal.   │  │                            │  │                                   │    │
│ MetaMask ○   │  │ [Dry run] [Send transaction]│ │                                   │    │
│ Shielded ▨   │  └────────────────────────────┘  └───────────────────────────────────┘    │
│ ──────────── │                                                                           │
│ ☾  GitHub  ↗ │                                                                           │
└──────────────┴───────────────────────────────────────────────────────────────────────────┘
```

The top bar is a single 48px row at 1280px and wider. The second line in the sketch shows what wraps into the wallet context popover at narrower widths; it is not a second bar.

Grid: `grid-template-rows: auto 48px 1fr; grid-template-columns: 248px 1fr`. The rail and top bar are sticky, not `position: fixed` with a magic `pt-14`. The sidebar and the content scroll independently. `#root` has no max width, padding or text alignment (delete `App.css`).

## Network rail

Component: `shell/NetworkRail.tsx`. Reads the active network and renders a full-width strip:

| Network | Height | Fill | Content |
|---|---|---|---|
| Testnet | 3px | `--qa-net-testnet` | none |
| Shielded testnet | 4px | `--qa-net-shielded` under `--qa-veil` | none |
| Mainnet | 22px | `--qa-net-mainnet` | Centred white caption: "Mainnet: real funds" |

`role="status"` is not appropriate (it does not change often); give it `aria-hidden="true"` and rely on the network switcher's accessible name. On mainnet, also prefix `document.title` with "[Mainnet]" so the browser tab carries the warning.

## Top bar

Component: `shell/TopBar.tsx`. Left to right:

1. **Brand and workspace switcher.** "QA Helper" wordmark (sans, 600) followed by a workspace menu button showing the current workspace: Tools, Mobile walkthrough, Desktop walkthrough. This replaces the orphaned routes and the per-workspace gradients. The walkthrough progress ("12 of 51 steps") appears next to the workspace name when in a walkthrough.
2. **Wallet context bar** (flexible width, see below).
3. **Find stage** button: a search-field-shaped button with the hint `Ctrl K` (`⌘K` on macOS). Opens the command palette.
4. **Helper server pill.**
5. **Network switcher.**
6. Overflow menu (theme toggle, GitHub, public deployment link). These currently live in the sidebar footer; moving them frees the sidebar for navigation.

Background `base-100`, bottom border `base-300`, no gradient, no shadow.

### Wallet context bar

Component: `shell/WalletContextBar.tsx`. Replaces `renderWalletInfo` in `QALayout.tsx`.

One segment per role, in fixed order: Test, Funding, then integration sessions.

| Segment | Content | Click |
|---|---|---|
| Test wallet | Role label (muted), friendly name, status dot + word, HTR balance (mono, tabular), capability badge when the active network is Shielded testnet | Popover: copy address 0 (transparent and, if available, shielded), open Transaction history, open Wallet initialization, stop wallet |
| Funding wallet | Same | Same, plus "Send to test wallet" shortcut |
| RPC | "RPC" + status dot; peer wallet name on hover | Opens RPC Connection |
| Snap | "Snap" + status dot; snap network on hover | Opens Snap Connection |

Rules:

- Empty role: "Test wallet: none" as a button that opens Wallet initialization. No hidden header.
- Network chip only appears in a segment when it differs from the active network. It is then shown as a warning chip: "Snap on mainnet; app on testnet". A mismatch also turns that segment's status dot to warning.
- Remove the hard-coded `Txs: 0`.
- Each segment is a real `<button>`.
- Below 1280px, the bar collapses to a single "Context" button showing the dots only (●●●○); the full bar opens in a popover. Below 768px it moves into the drawer.

### Helper server pill

Component: `shell/HelperServerPill.tsx`, fed by a small `helperServerSlice` (status, url, version, lastSeen, latencyMs) and a polling hook (`useHelperServerHealth`, e.g. `GET /health` every 10s with backoff when offline).

| State | Dot | Label | Popover |
|---|---|---|---|
| Connected | success, filled | "Helper" | URL, version, latency, last heartbeat |
| Connecting | warning, animated ring | "Helper" | "Connecting to http://localhost:…" |
| Offline | hollow ring, muted | "Helper offline" | What it is for, the command to start it (`bun run helper` or whatever the server task defines), a Retry button |
| Incompatible | error | "Helper outdated" | Client and server versions side by side, how to update |

Stages that need the server show it in their precondition strip, same as a missing wallet. Never block the whole app on it.

### Network switcher

Component: `shell/NetworkSwitcher.tsx`. Replaces the binary `NetworkSwapButton.tsx` as the primary control (that button stays only inside wallet-specific rows until the sweep removes it).

Closed: a rounded-full chip with the channel colour dot and the network name. Testnet: teal outline. Shielded testnet: violet outline with a hatched dot. Mainnet: solid red, white text.

Open (popover, `shadow-float`), one row per network:

```
● Testnet             node1.testnet.hathor.network      ✓
▨ Shielded testnet    <shielded node host>               Shielded outputs enabled
■ Mainnet             node1.mainnet.hathor.network       Real funds
```

Selecting mainnet does not switch immediately: the row expands into a confirmation ("Funding and Test wallets will restart on mainnet. RPC and Snap sessions keep their own network.") with a red "Switch to mainnet" button. Switching from mainnet back to a test network needs no confirmation.

Data and behaviour, to settle with whoever implements the Shielded testnet constant:

- `NETWORK_CONFIG` in `src/constants/network.ts` gains a `SHIELDED_TESTNET` entry and each entry gets a `kind: 'test' | 'shielded-test' | 'main'` plus a display `label`. All visual decisions key off `kind`, not off the string name.
- A new `activeNetwork` value in Redux (for example a small `networkSlice`) becomes the default for new wallets and the value `ExplorerLink` uses when no network is passed. That fixes the 11 hard-coded `network="testnet"` call sites in one place.
- Whether switching restarts the selected wallets automatically or only changes the default is a product decision. The confirmation copy above assumes restart.

## Stage navigation (sidebar)

Component: `shell/StageNav.tsx`, replacing `Sidebar.tsx`.

### Structure: families, then groups, then stages

The ten flat groups in `src/types/stage.ts` are reorganised into families without renaming any `GroupId` or URL:

| Family | Groups (existing `GroupId`) | Header indicator |
|---|---|---|
| Wallets | `main-qa`, `auditing`, `push-notifications`, `multisig` | none |
| WalletConnect RPC | `rpc`, `bet-nano-contracts`, `fee-nano-contracts` | RPC session dot |
| MetaMask Snap | `snaps`, `snap-bet-nc`, `snap-fee-nc` | Snap connection dot |
| Shielded | new groups for shielded stages (inspector, shielded send, capability checks) | veil glyph; disabled with a reason off Shielded testnet |

Add `family: FamilyId` to `StageGroup` and a `STAGE_FAMILIES` list in `src/types/stage.ts`. Group titles lose the family prefix ("Snap Bet NC" becomes "Bet nano contract" under MetaMask Snap), and stage titles lose "(Snap)" and "RPC" suffixes. The family carries that information.

### Rows

- Family header: 12px, semibold, muted ink, sentence case, with the indicator dot at the right. Not collapsible.
- Group row: 32px, chevron, title, stage count in muted mono. Collapsible. Only the group containing the active stage is open by default; opening another group does not close others, but navigating via the palette collapses groups the user did not open manually.
- Stage row: 32px, title only, 14px. No emoji, no description (the description is in the stage header and in the palette). Active row: 3px `primary` bar on the left, `primary` text, background `color-mix(in oklab, var(--color-primary) 8%, transparent)`, `aria-current="page"`.
- On mount and on route change, scroll the active row into view (`scrollIntoView({ block: 'nearest' })`).
- Filter field at the top (`/` focuses it): filters stage titles across all groups, shows matches with their family as a muted suffix, Enter opens the first match.

Width 248px; collapsible to a 56px icon rail is not worth it here (no meaningful icons once emoji go). At 1024–1279px the sidebar stays; below 1024px it becomes a drawer.

### Why not tabs or a top nav

46 stages in 13 groups, growing with shielded work, do not fit horizontal navigation. A sidebar with families is the smallest change from today's mental model.

## Command palette

Justified because: 46+ stages, 14 titles duplicated across RPC and Snap, keyboard-heavy users who jump between the same 5–6 stages all day.

Component: `shell/CommandPalette.tsx`, a daisyUI `modal` with a listbox; no new dependency.

- Opens with `Ctrl K` / `⌘K` and from the top bar button.
- Sections: Recent (last 5 stages, from localStorage), Stages (fuzzy match on title, description, group, family and RPC method name, so typing `htr_getBalance` finds both Get balance stages), Actions.
- Each stage result: title, family chip on the right ("RPC", "Snap", "Wallets", "Shielded"), description on a second muted line.
- Actions (keep the list short): Switch network to …, Copy test wallet address 0, Copy funding wallet address 0, Start selected wallets, Toggle dry run, Toggle theme.
- Fully keyboard operable: arrows, Enter, Esc; `role="dialog"`, `aria-modal="true"`, focus returns to the trigger.

## Walkthrough workspaces

`/mobile` and `/desktop` render inside the same shell:

- The rail, top bar, network switcher, server pill and wallet context are identical.
- The sidebar slot renders the walkthrough's section/step list (`MobileQASidebar.tsx`, `DesktopQASidebar.tsx` restyled to the same row specs: 32px step rows, done/pending ring, active bar).
- The workspace switcher shows progress ("Desktop walkthrough, 12 of 51").
- `MobileQAHeader.tsx` and `DesktopQAHeader.tsx` are deleted; their progress bar moves to a thin 2px bar under the top bar, in `primary`.
- The walkthrough content uses the stage header pattern, with "Step 3 of 5" as the breadcrumb and the instructions in `text-body-lg` at `max-w-prose`, left-aligned.

## Responsive behaviour

| Width | Behaviour |
|---|---|
| ≥1280px | Full top bar; sidebar 248px; stages use Compose and Inspect columns |
| 1024–1279px | Wallet context collapses into the "Context" popover; stages stack to one column |
| 768–1023px | Sidebar becomes a daisyUI `drawer` opened from a menu button at the left of the top bar |
| <768px | Top bar: menu, "QA Helper", network chip (name shortened to "Test", "Shielded", "Main"), server dot. Wallet context lives at the top of the drawer. Content padding 16px. Tables become stacked rows |

The rail never collapses at any width.

## Files

| New | Replaces |
|---|---|
| `src/components/shell/AppShell.tsx` | Layout parts of `QALayout.tsx`, `MobileQALayout.tsx`, `DesktopQALayout.tsx` |
| `src/components/shell/NetworkRail.tsx` | nothing (new) |
| `src/components/shell/TopBar.tsx` | Header in `QALayout.tsx`, `MobileQAHeader.tsx`, `DesktopQAHeader.tsx` |
| `src/components/shell/WalletContextBar.tsx` | `renderWalletInfo` in `QALayout.tsx` |
| `src/components/shell/HelperServerPill.tsx` | nothing (new) |
| `src/components/shell/NetworkSwitcher.tsx` | `common/NetworkSwapButton.tsx` as the primary control |
| `src/components/shell/StageNav.tsx` | `Sidebar.tsx` |
| `src/components/shell/CommandPalette.tsx` | nothing (new) |
| `src/components/shell/WorkspaceSwitcher.tsx` | the "Main QA" back links in the walkthrough headers |
