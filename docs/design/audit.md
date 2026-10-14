# UI audit

Snapshot of `main` at `caef645` (October 2026), taken before the Shielded Outputs work. Method: walked the app in Playwright at 1440×900 and 390×844 (wallet initialization, custom tokens, RPC connection, RPC send transaction, snap connection, snap send transaction, push notifications, tx update events, test wallet cleanup, multisig, desktop walkthrough, mobile walkthrough), measured computed styles in the browser, and grepped `src/` for patterns. No wallet was loaded, so the audit sees empty and precondition states, which is also what a QA engineer sees first every morning.

Severity scale:

- **S1**: broken or misleading. Something renders wrong, or a user could act on the wrong network or wallet.
- **S2**: costs time every session. Navigation, hierarchy and feedback problems that slow down a test pass.
- **S3**: inconsistency and polish. Makes the tool feel artisanal and makes every new stage drift further.

## Summary of the top findings

| # | Finding | Severity |
|---|---|---|
| 1 | Vite starter CSS still ships and centres the whole app in a 1280px box | S1 |
| 2 | `mb-7.5` / `mt-7.5` / `p-7.5` (211 uses) and `text-2xs` (22 uses) are not Tailwind classes and silently do nothing | S1 |
| 3 | Custom `.btn`, `.card`, `.input` in `index.css` collide with daisyUI 5 classes of the same name; two "primary" colours coexist | S1 |
| 4 | No persistent network indicator; mainnet looks identical to testnet | S1 |
| 5 | Stage content collapses to 0px wide on a phone | S1 |
| 6 | Sidebar shows about 6 of 46 stages per screen and never scrolls the active stage into view | S2 |
| 7 | Precondition states hide the whole stage; four different visual treatments for "not ready" | S2 |
| 8 | No visible focus styles; contrast failures in warning and info colours | S2 |
| 9 | Hashes and addresses use `break-all` almost everywhere; no shared truncate-and-copy pattern | S2 |
| 10 | Mobile and desktop walkthroughs are unreachable from the main app and each has its own header colour | S2 |

Details follow, grouped by theme.

## 1. Foundation defects (render bugs)

### 1.1 Vite starter stylesheet is still active (S1)

`src/App.css` is the unedited `create-vite` template and is imported by `src/App.tsx`. It sets `#root { max-width: 1280px; margin: 0 auto; padding: 2rem; text-align: center; }` and `.card { padding: 2em }`.

Effects measured in the browser:

- The "fixed" app shell floats inside a 1280px box with a 112px gutter at 1440px wide, so the sidebar does not touch the window edge and stops before the bottom of the page.
- `text-align: center` is inherited by every stage. Headings, descriptions, warning lists, numbered instructions in Snap Connection, code blocks and table cells are centred (see Test Wallet Cleanup's warning list and Snap Connection's "Getting Started" block, where bullets sit at the far left while the text is centred).
- The `.logo` / `.read-the-docs` rules are dead.

Fix: delete `src/App.css` and its import. Most of the "it looks off" feeling goes away with this one change.

### 1.2 Spacing and type utilities that do not exist (S1)

Tailwind 3's default spacing scale has no `7.5` step, and no `2xs` font size is configured in `tailwind.config.ts`.

- `mb-7.5` (193), `mt-7.5` (16), `ml-7.5` (1) and `p-7.5` (1) in 67 files compile to nothing. The browser reports `margin-bottom: 0px` on `.card-primary mb-7.5`, so cards are stacked edge to edge (RPC Connection, Snap Connection, Tx Update Events). `StageContent.tsx` intends `p-7.5` padding; the content area has no padding at all.
- `text-2xs` (22 uses, for example in `NetworkSwapButton.tsx`, `TransactionResponseDisplay.tsx`, `SnapResponseDisplay.tsx`, `TestWalletCleanup.tsx`) computes to the inherited 16px, so "extra-small" captions are larger than `text-xs` labels next to them.
- `knowledge/design-system.md` documents `7.5 = 30px` as part of the scale, which is why it spread.

### 1.3 Custom component classes collide with daisyUI 5 (S1)

`package.json` pins `daisyui@^5.5.20` with `tailwindcss@^3.4.19`. daisyUI 5 targets Tailwind 4; it still loads through the Tailwind 3 plugin API, but:

- The `daisyui: { themes: ['light'] }` key in `tailwind.config.ts` is daisyUI 4 syntax and is ignored. The default daisyUI light theme is active: `--color-primary` is indigo `oklch(45% 0.24 277)` and `--color-secondary` is pink `oklch(65% 0.241 354)`.
- `src/index.css` redefines `.btn`, `.btn-primary`, `.btn-secondary`, `.card`, `.input` with `@apply`, using Bootstrap-era colours from `tailwind.config.ts` (`primary: '#007bff'`). Both definitions apply. Example measured on the walkthrough "Next" button: grey background from the custom class plus daisyUI's pink `btn-secondary` drop shadow, which shows as a magenta line under every grey button (visible under "Local Dev", "NPM Package", "Next").
- `bg-primary` utilities resolve to `#007bff`, while daisyUI components such as `alert`, `badge-primary`, `checkbox`, `toggle` use the indigo theme primary. Toasts (`ToastContainer.tsx`) and checkboxes therefore use a different palette from buttons.
- Components mix three vocabularies: daisyUI (`btn btn-ghost btn-sm`), the custom shortcuts (`btn-secondary py-1 px-2.5 text-xs`), and raw Tailwind palette (`bg-gray-200 hover:bg-gray-300`). See `NetworkSwapButton.tsx`, which combines `btn btn-square` with raw grey.

### 1.4 Hard-coded header data (S2)

`QALayout.tsx` line 72 renders `Txs: 0` as a literal for every ready wallet. It looks like live data and is always wrong.

## 2. Safety: network and wallet context

### 2.1 No persistent network indicator (S1)

Network appears only as a small per-wallet chip inside the header (`QALayout.tsx`, `text-xs bg-white/20`), and only once a wallet is selected. Before that, the header is a plain gradient that reads "QA Helper". Mainnet wallets get exactly the same blue chrome as testnet ones. With a third network (Shielded testnet) arriving, and snap/RPC sessions that each have their own network, there is no single place that answers "where will this transaction land?".

Related: network switching is scattered. `NetworkSwapButton.tsx` toggles between exactly two values (`currentNetwork === 'TESTNET' ? 'MAINNET' : 'TESTNET'`), multisig has its own "Switch to Mainnet" link (`MultisigWalletManagement.tsx` line 330), and snap has a Change Network stage. A binary toggle cannot represent three networks.

### 2.2 Explorer links hard-code testnet (S1)

11 call sites pass `network="testnet"` to `ExplorerLink`, including the transaction hash block in `SnapMethodCard.tsx`. On mainnet or Shielded testnet these links point to the wrong explorer.

### 2.3 Wallet context is incomplete (S2)

The header shows Test and Funding wallets but not the RPC session, the Snap connection, or (soon) the helper server. Errors appear as a red chip that says "Error - Click to fix", which is a `div` with `onClick`, not a button (`QALayout.tsx` line 50). Not keyboard reachable.

## 3. Navigation and information architecture

### 3.1 Sidebar density (S2)

`Sidebar.tsx` renders each stage as a bordered card with a 20px emoji, a 16px title and a two-line description (`p-4 rounded-lg border-2`), about 110px tall. At 900px height you see 6 stages out of 46. Groups are bordered cards in turn, so a stage sits inside two nested borders.

- Groups accumulate in the expanded set and never collapse automatically, so after a few clicks the list becomes very long.
- The active stage is not scrolled into view. Opening `/tools/snaps/send-transaction` directly shows only Main QA and the collapsed groups above it; the active item is off screen.
- Group titles are uppercase with letter-spacing (`uppercase tracking-wider`), which reads as shouting and costs width.

### 3.2 Duplicate names with no family context (S2)

"Get Balance", "Get Address", "Get UTXOs", "Sign with Address", "Sign Oracle Data", "Create Token", "Send Transaction", "Initialize Bet", "Place Bet", "Set Bet Result", "Withdraw Prize", "Initialize Fee", "Deposit Fee Token" and "Withdraw Fee Token" each exist twice: once for WalletConnect RPC and once for Snap (`src/types/stage.ts`). The ten flat groups don't express that there are three integration families (Wallet-lib, WalletConnect RPC, MetaMask Snap). Stage headers add "(Snap)" to some titles and "RPC" to others ("Send Transaction RPC", "Send Transaction (Snap)").

### 3.3 Walkthroughs are orphaned (S2)

`/mobile` and `/desktop` routes exist (`App.tsx`) but nothing in the main sidebar or header links to them. Each has a different header gradient: blue to blue-700 (main), blue-600 to cyan-700 (desktop), purple-600 to indigo-700 (mobile). Purple is also used for "dry run" chips and will be wanted for "shielded", so the colours are already overloaded.

The walkthrough sidebar (`DesktopQASidebar.tsx`) is actually the better pattern: one line per step, a progress count per section, a left accent bar for the active item. The main sidebar should learn from it.

## 4. Hierarchy and layout inside stages

### 4.1 Stage headers are reimplemented 47 times (S3)

`<h1 className="mt-0 text-3xl font-bold">` appears in 47 files, each followed by an ad-hoc description paragraph. In Wallet Initialization the "Registered Wallets (0)" section renders *above* the page title (`WalletInitialization.tsx` lines 464 vs 727), so the first heading on the page is not the page.

Heading styles in use: 20+ distinct class combinations for h1–h3 (for example `text-lg font-bold m-0`, `text-lg font-bold mb-3`, `text-xl font-bold mb-4`, `text-sm font-semibold text-slate-800 …`).

### 4.2 One card style for everything (S3)

`card-primary` (2px blue border, light grey fill) is used for forms, alerts, debug panels, empty states and success notes alike; colour variants are made by appending raw palette classes (`card-primary mb-7.5 bg-yellow-50 border border-warning`, 17 uses; `… bg-green-50 border border-success`, 15 uses; `… bg-red-50 border-2 border-red-400`, 5 uses). Every block looks equally important, and the 2px saturated blue border is the loudest element on most screens.

### 4.3 Order of content (S2)

Test Wallet Cleanup shows a large dark "Debug Panel" before the user has a test wallet, and puts the blocking "No Test Wallet selected" message at the bottom, in red. The thing the user must do first is the last thing on the page.

### 4.4 RPC cards duplicate the Snap card instead of sharing it (S3)

`SnapMethodCard.tsx` is a good abstraction (inputs, live request preview, execute, response, rejection, dry run). The 18 files in `src/components/rpc/` (400–650 lines each) re-implement the same structure by hand, each with slightly different headings, chips and result blocks. `RpcSendTransactionCard.tsx` also builds its own address field and quick-fill buttons (around line 357) instead of using `common/AddressInput.tsx`.

## 5. Feedback states

### 5.1 Four treatments for "not ready" (S2)

- Dashed grey box: Wallet Initialization "No wallets registered yet".
- Blue info card with icon: `RpcNotConnectedBanner.tsx`, `SnapNotConnectedBanner.tsx`.
- Yellow dashed card with bold title: Custom Tokens "No Wallets Selected".
- Solid red error card: Test Wallet Cleanup "No Test Wallet selected".
- Yellow-bordered empty cards with yellow text: Push Notifications.

Same situation (missing prerequisite), five looks, and only the RPC/Snap banners link to where you fix it.

### 5.2 Not-connected hides the stage (S2)

RPC and Snap stages render only the banner when disconnected (RPC Send Transaction, Snap Send Transaction). A QA engineer cannot read the form, prepare inputs, or produce a dry-run request until connected, even though dry run does not need a session.

### 5.3 Native dialogs (S3)

`window.confirm` is used for destructive actions in `WalletInitialization.tsx` (lines 304, 614), `CustomTokens.tsx` (593) and `WalletNetworkControl.tsx` (49). Modals that exist (`SeedPhraseModal`, `DeepLinkModal`, `WalletBrowserModal`, the config string modals) have no `role="dialog"` or `aria-modal` (0 matches in `src/components`).

### 5.4 Toasts (S3)

Toasts sit bottom-left and use daisyUI alerts in the default daisyUI palette (see 1.3), so their greens and reds differ from inline status. `CopyButton.tsx` shows a toast on every copy, so copying three hashes produces three stacked toasts; an inline "Copied" tick is enough.

### 5.5 Silent cloud sync failure (S3)

On localhost the cloud wallet sync request (`services/cloudWalletSync.ts`) fails with a CORS error on every load and nothing is shown. When the helper server arrives, its health must be visible, not only logged.

## 6. Data legibility

### 6.1 Hashes, addresses and amounts (S2)

The whole UI is set in JetBrains Mono, including prose, so data does not stand out from labels; everything looks like data. At the same time there is no shared component for identifiers: `break-all` appears 76 times and `truncate` 4 times. A 64-char tx hash wraps over 2–3 lines inside narrow cards, and shielded addresses will be 97 characters. Amounts are not right-aligned or tabular in tables (`MultisigWalletManagement.tsx`, `TransactionHistory.tsx`).

### 6.2 Emoji as icons (S3)

Every stage has an emoji icon in `src/types/stage.ts` (🔑 ✅ 🪙 🔌 …), several duplicated (🪙 and 📤 twice, 🔑 for both wallet init and xpub). They render differently per OS, cannot be recoloured for state, and compete with the text. Stage UIs also mix react-icons (`Md*`, `Fi*`), inline hand-written SVG paths (`SnapMethodCard.tsx`, the banners, `ExplorerLink.tsx`) and Nerd Font glyphs.

## 7. Accessibility and contrast

### 7.1 Contrast failures (S2)

Measured against WCAG 2.2 AA (4.5:1 for text, 3:1 for large text and UI parts):

| Pair | Ratio | Where |
|---|---|---|
| `#ffc107` warning text on white | 1.63:1 | `text-warning` (24 uses), Push Notifications empty cards, `.status-connecting` |
| `#17a2b8` info on white | 3.04:1 | info icons and `btn-info` "Open Camera" (white on teal) |
| white on `#28a745` | 3.13:1 | `btn-success`, "Mark Complete" |
| white on `#007bff` | 3.98:1 | every primary button and the active sidebar item |
| `#6c757d` muted on `#f8f9fa` | 4.45:1 | sidebar descriptions on the grey sidebar |

### 7.2 Focus (S2)

No component sets a focus style (0 matches for `focus:` or `focus-visible:` in `src/components`). Sidebar items fall back to the browser outline; custom-styled buttons with `border-none` show almost nothing. Icon-only buttons in the multisig table rely on `title` without `aria-label`.

### 7.3 Interactive `div`s (S3)

Header wallet chips ("Error - Click to fix", "Txs") are clickable `div`s. Toasts with actions emulate buttons with `role="button"`.

## 8. Mobile and narrow widths (S1)

The shell has no responsive classes (0 `sm:`/`md:`/`lg:` in `Sidebar.tsx`, `QALayout.tsx`, `StageContent.tsx`). At 390px the sidebar keeps its `basis-80` and the stage content measures 0px wide; nothing but the sidebar is visible. The header's wallet info has no wrapping or overflow rule, so two wallets with balances cannot fit a narrow header. The tool has camera QR scanning and deep-link flows that are natural to use from a phone, so this matters more than it would for a typical internal tool.

## 9. Readiness for Shielded Outputs

Nothing in `src/` mentions shielded outputs yet. Gaps the upgrade will hit immediately:

- `NetworkType` is `'TESTNET' | 'MAINNET'` (`constants/network.ts`), and the UI assumes a binary toggle (2.1).
- `AddressInput.tsx` has a fixed `Address (base58)` placeholder, no notion of address kind, and quick-fill buttons for `Addr0` only. A 97-character `K3…` shielded address in a `w-full` text input is unreadable and uncheckable.
- The output editor in `RpcSendTransactionCard.tsx` has an "Output Type" two-button switch (address/data) built from raw classes; there is no shared segmented control to extend with transparent, amount-shielded and fully-shielded modes.
- Purple already means "dry run" (`SnapMethodCard.tsx`, `RpcSendTransactionCard.tsx`). If shielded also becomes purple, the two will be confused.
- There is nowhere to show a wallet's shielded capability (none, watch, view, full).
