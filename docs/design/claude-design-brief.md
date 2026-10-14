# Claude Design brief: QA Helper design system

Load this file into a new Claude Design project (claude.ai/design) as a design-system project. It is self-contained: everything needed to mock screens is here. The longer rationale lives next to it in `docs/design/` (`direction.md`, `tokens.md`, `shell.md`, `components.md`).

## Product

QA Helper is an internal web tool used by Hathor Network's QA team to test Hathor wallets. It runs in the browser (React 19, Tailwind, daisyUI 5) and talks to three things:

- **wallet-lib**: the tool starts its own "funding" and "test" wallets from seed phrases and uses them to send, receive and inspect transactions.
- **WalletConnect RPC**: it connects to a wallet under test (mobile or desktop) and sends RPC requests such as `htr_getBalance` or `htr_sendTransaction`.
- **MetaMask Snap**: it sends the same kinds of requests to the Hathor MetaMask Snap.

It is organised as about 46 **stages** (one screen per test tool, e.g. "Send transaction", "Get balance") grouped into **groups** and, in the new design, **families**: Wallets, WalletConnect RPC, MetaMask Snap, Shielded. It also has two guided **walkthroughs** (mobile wallet and desktop wallet release checklists) with step-by-step instructions and progress.

An upcoming release adds:

- **Shielded outputs** (confidential transactions). Outputs can be Transparent, Amount shielded (amount hidden) or Fully shielded (amount and token hidden). Shielded addresses are 97-character base58 strings starting with `K3`. Each wallet has a **shielded capability**: None, Watch, View or Full.
- A third network, **Shielded testnet**, next to Testnet and Mainnet.
- A local **helper server** (Bun) whose connection status the client shows.

## Users

QA engineers and wallet developers at Hathor. Technical, fast, keyboard-friendly. They run the same handful of stages many times a day, copy and compare long hashes and addresses, and switch between networks and wallets. Mostly on a desktop monitor; sometimes on a phone next to a mobile wallet (QR scanning, deep links).

## Principles

1. **Never act on the wrong network or wallet.** The active network is always visible; mainnet is unmistakable.
2. **Data is legible.** Hashes, addresses and amounts are monospace, truncated in the middle, one click to copy, easy to compare.
3. **Same shape everywhere.** Every stage has the same header, precondition strip, compose area and inspect area.
4. **Show, don't hide.** Missing prerequisites are listed on top; the stage still renders and dry run still works.
5. **Quiet chassis, loud signals.** Neutral panels; colour is reserved for status, network and shielded.

## Aesthetic

A lab test bench: a neutral cool-grey chassis, white instrument panels with 1px borders and no shadows, small status lights (dot + word), monospace readouts for data, and **channel colours for networks**. The memorable element is the **network rail**, a strip across the very top of the window: thin teal for Testnet, violet with diagonal hatching for Shielded testnet, a thick red band reading "Mainnet: real funds" for Mainnet.

Shielded data has its own visual language, the **veil**: violet plus a 45° hatch pattern and a shield glyph (outline shield = amount shielded, filled shield = fully shielded). Hidden values are shown as a hatched pill with the word "hidden", never as zero or blank.

Avoid: gradients, nested cards, uppercase tracked labels, emoji icons, centred text, soft drop shadows on every box, purple for anything other than shielded.

## Tokens

### Colour (light theme "bench")

| Role | Hex |
|---|---|
| Page (chassis) | `#F1F2F5` |
| Panel | `#FFFFFF` |
| Divider | `#D9DCE3` |
| Field border | `#8B92A1` |
| Text | `#1A1D24` |
| Muted text | `#5A6170` |
| Primary action | `#2747C8` (white text) |
| Quiet action | `#E4E7EE` (dark text) |
| Shielded / veil | `#6A3BD1`, tint `#EFE9FC` |
| Info | `#2E6A9E`, tint `#E7F0F8` |
| Success | `#1B7A47`, tint `#E6F4EC` |
| Warning | `#E8A317` fill with `#2B1D00` text; `#8A5300` as text on white; tint `#FDF3DC` |
| Error | `#C0262D`, tint `#FBE9EA` |
| Testnet channel | `#0B7A73`, tint `#E3F3F1` |
| Shielded testnet channel | `#6A3BD1` + hatch |
| Mainnet channel | `#C0262D` |

Dark theme "bench-dark": page `#15171C`, panel `#1C1F26`, divider `#2C313B`, text `#E6E8EE`, muted `#9AA1AF`, primary `#7E9BFF`, shielded `#B39BFF`, success `#4CC38A`, warning `#F2B33D`, error `#FF7A7A`, testnet `#3CC4B9`, mainnet `#FF6B6B`.

All text pairs meet WCAG AA (4.5:1); field borders meet 3:1.

### Type

- Interface: **Atkinson Hyperlegible Next** (400, 500, 600, 700).
- Data: **JetBrains Mono** with slashed zero and tabular figures.
- Scale: caption 12/16, body 14/20, body large 16/24 (prose), panel title 18/26 semibold, dialog title 21/28 semibold, page title 24/32 bold, data 13/20 mono, small data 12/16 mono.
- Sentence case everywhere. No uppercase labels.

### Spacing, size, radius, elevation

- 4px grid. Field gap 12px, panel padding 16px (20px on wide screens), gap between panels 16px, stage padding 24px.
- Controls 36px tall; small buttons 28px; nav rows 32px; table rows 36px; top bar 48px.
- Radius: panels 6px, fields and buttons 4px, checkboxes 3px, status chips and network chip fully rounded, rail and tables 0.
- Flat panels. One shadow, only for floating layers (menus, palette, toasts, dialogs): `0 10px 28px -8px rgb(16 20 30 / .22), 0 2px 6px -2px rgb(16 20 30 / .14)`.
- Focus: 2px primary outline, 2px offset, on everything interactive.

## Components and their states

| Component | States to design |
|---|---|
| Network rail | testnet, shielded testnet, mainnet |
| Top bar | default; narrow (context collapsed); phone (menu, short network chip) |
| Network switcher | closed per network; open menu; mainnet confirmation row |
| Helper server pill | connected, connecting, offline (with start instructions in popover), outdated |
| Wallet context bar | no wallets; test ready + funding syncing; error; network mismatch warning; with capability badges |
| Stage nav (sidebar) | families with session dots; group expanded/collapsed; active stage; filter with results; shielded family disabled off Shielded testnet |
| Command palette | empty (recent); typing with mixed RPC/Snap results; actions section |
| Stage header | with method chip; without |
| Precondition strip | all met (collapsed line); one unmet with fix link; pending |
| Panel | default; inset; with header actions |
| Callout | info, success, warning, error, shielded, dry run |
| Field | default, focus, filled, disabled with reason, invalid, read-only |
| Address input | empty; transparent detected; shielded detected (97 chars, grouped preview); wrong kind error; quick-fill buttons and "Fill from" menu |
| Amount input | empty; valid with base-unit hint; above balance warning; Max |
| Segmented control | default; option disabled with reason |
| Shield mode selector | Transparent, Amount shielded, Fully shielded selected; disabled off Shielded testnet |
| Output editor row | transparent; shielded (veil edge); data output |
| Identifier | tx hash truncated; full popover; transparent address; shielded address; with wallet tag; copied tick |
| Tx id display | unconfirmed, confirmed, voided, with shielded count |
| JSON panel | preview; sent; formatted vs raw; long content scrolling |
| Execute bar | ready; disabled with reason; running; dry run on; mainnet armed ("Click again to send on mainnet") |
| Method card result | success, dry run, rejected in wallet, error with raw message |
| Status dot / chip | idle, in progress, ready, error, dry run |
| Capability badge | None, Watch, View, Full |
| Shielded badge | amount, full, "2 of 3 shielded" |
| Hidden amount pill | hidden; decrypted value with eye glyph |
| Data table | rows; empty; loading skeleton; phone stacked rows |
| Toasts | success, warning, error, stacked "+2 more" |
| Confirm dialog | default; danger; type-to-confirm |
| Empty / loading / error blocks | one of each |

## The five screens to mock

1. **App shell on Testnet, Send transaction (RPC) stage.** Rail, top bar with both wallets ready, RPC connected, Snap not connected, helper server connected; sidebar with WalletConnect RPC family open and "Send transaction" active; stage header with `htr_sendTransaction`; compose column with two outputs; inspect column with a live request preview. Then the same screen with the network switcher open.
2. **Send transaction on Shielded testnet with the shielded output editor.** Three outputs: one transparent, one amount shielded, one fully shielded with a 97-char `K3…` address showing the grouped preview. Test wallet capability badge "Full". Summary line "3 outputs, 2 shielded". Execute bar ready.
3. **Shielded transaction inspector.** Tx hash input; summary with confirmed status and "2 of 3 shielded"; "Decrypting with Test wallet, View"; outputs table where one amount is decrypted, one is hidden (hatched pill) and one is transparent; a shielded callout explaining the hidden value; one expanded commitment JSON panel.
4. **Mainnet state.** Any transaction stage on Mainnet: red rail band "Mainnet: real funds", red network chip, execute button armed "Click again to send on mainnet", plus the wallet context bar showing a network mismatch warning ("Snap on testnet; app on mainnet").
5. **Precondition and empty states on a phone (390px).** Snap send transaction with the Snap not connected: drawer closed, short network chip, server dot, precondition strip with a "Connect the Snap" link, form still visible below with dry run available. Include the open drawer variant showing the wallet context at the top of the navigation.

Optional sixth: the Desktop walkthrough inside the same shell (step list in the sidebar, instructions as prose, progress in the top bar).

## Content to use in mocks

- Wallet names: "Android Nov14" (test), "Funding 01" (funding).
- Balances: 12.50 HTR, 1,204.00 HTR; token "TST" with 100.00.
- Tx hash (made up, right shape): `00004f3a9c1be27d55e0a8f3c4d9b6127e0f88a1c2d3e4f5a6b7c8d9e0f1a2b3`.
- Transparent testnet address: `wRxmoq2bDxViPqFGmAsZVBwHNwjEyFj9zz` (the multisig address the app already uses for quick-fill).
- Shielded address (placeholder; real ones come from the wallet): `K3` followed by 95 base58 characters, e.g. `K3ab12cdEf9q2Lmn` … `7xYz9Q`.
- RPC methods: `htr_sendTransaction`, `htr_getBalance`, `htr_getUtxos`, `htr_signWithAddress`.

## Syncing with the repo

The repo copy of this brief and its companions live in `docs/design/` on the `design/audit` branch of `qa-helper`. To keep the Claude Design project and the repo in step, start the `/design-sync` command yourself in a Claude Code session opened in the `qa-helper` repo and point it at this Claude Design project and at `docs/design/`. It has to be started by you: it needs your claude.ai session and your confirmation of what to sync. After a sync, review the diff in `docs/design/` like any other change before committing it; tokens in `tokens.md` are the source of truth for code, so if the design project changes a colour, update `tokens.md` (and its contrast table) in the same commit.
