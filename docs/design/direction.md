# Design direction: the test bench

## Who this is for and what the UI must do

QA Helper is used by Hathor's QA engineers and wallet developers during test passes: start a funding wallet and a test wallet, fire RPC or Snap requests at a wallet under test, read back a hash, check a balance, clean up. Sessions are long, repetitive and detail-heavy. The UI has three jobs, in this order:

1. Never let someone act on the wrong network or the wrong wallet.
2. Make identifiers and amounts easy to read, compare and copy.
3. Get out of the way: dense, predictable, the same shape on every stage.

Friendliness here does not mean decoration. It means the user always knows where they are, what is connected, what will happen when they press the button, and what actually happened.

## The aesthetic: an instrument on a lab bench

The reference is bench test equipment: a signal generator, a bench power supply, a logic analyser. Those instruments share traits that fit this tool:

- A neutral, slightly cool chassis that recedes, with clearly separated control panels.
- Small status lights that are either on or off, never decorative.
- Channel colours: each probe or channel has one colour, used consistently on the cable, the trace and the label.
- Readouts in a fixed-width face, set apart from the labels around them.
- One loud warning when something is live.

Translated:

- **Chassis and panels.** The page background is a cool light grey (`base-200`). Stage content lives on white panels with a 1px border and no drop shadow. Inside a panel, sections are separated by a hairline rule and a heading, never by another nested card. There is one elevation level for content and one (with shadow) for things floating over it: menus, the command palette, toasts, dialogs.
- **Channel colours are networks.** Every network has one colour and one pattern, used for the rail across the top of the window, the network switcher, network chips and explorer links. Testnet is teal. Shielded testnet is violet with a diagonal hatch. Mainnet is red and visibly louder than the rest.
- **Readouts are data.** Monospace is reserved for values a user might compare or copy: hashes, addresses, token UIDs, amounts, JSON, method names. Labels, prose and navigation use a proportional sans. Today everything is monospace, so nothing stands out; splitting the two is the single biggest legibility gain.
- **Status lights.** Connection and wallet state is a small dot plus a word. The dot is never the only signal.

### Why not the obvious alternatives

- A dark "terminal hacker" theme (near-black with a neon accent) would look technical but hurts long reading sessions, and makes the mainnet warning compete with everything else that glows. Dark mode is provided as a theme, not as the identity.
- A generic SaaS dashboard (rounded cards everywhere, soft shadows, gradient header) is roughly what exists today, and it is the reason every block looks equally important.
- A brand-led look (big Hathor visuals) does not help a tester. The Hathor violet is used where it carries meaning: shielded privacy, which is Hathor's own feature.

### The one bold move

Spend the boldness on the **network rail**: a full-width strip at the very top of the window, always visible, in the active network's channel colour. Testnet: a 3px teal line, almost subliminal. Shielded testnet: a 4px violet line with diagonal hatching that matches every other shielded element. Mainnet: a 6px red band carrying the text "Mainnet: real funds", and primary transaction buttons switch to a red outline with the label "Send on mainnet". Everything else stays quiet and disciplined so the rail is the one thing people notice and remember.

## Typography

Two families, clearly distinct in role:

- **Atkinson Hyperlegible Next** for interface text. Designed by the Braille Institute for maximum character distinction (I/l/1, O/0, rn/m), which is the right property for a tool where misreading one character is a failed test. It is proportional, so labels and prose take less width than the current monospace. Self-host it (Fontsource package or files in `public/fonts/`), falling back to `system-ui`.
- **JetBrains Mono** for data. Already self-hosted in `public/fonts/`. Use it with `font-feature-settings: "zero"` (slashed zero) and `font-variant-numeric: tabular-nums` so hex hashes and amounts line up.

The scale follows the classic typographic scale (12, 14, 16, 18, 21, 24) rather than arbitrary Tailwind sizes. Body text is 14px because this is a dense tool used at arm's length on a desktop monitor; prose blocks (walkthrough instructions, Snap setup guide) go up to 16px with a 65ch measure. Sentence case everywhere, including group names in the sidebar; no tracked-out uppercase labels. Details and the full scale are in [tokens.md](tokens.md).

## Layout principles

- **Left-aligned, always.** Centred text is reserved for nothing. Stage content is left-aligned with a maximum width of 1120px so line lengths stay readable on wide monitors.
- **Compose and inspect side by side.** Method stages (RPC and Snap) split into a "Compose" column (inputs, execute) and an "Inspect" column (request preview, response, tx status) at 1280px and up, stacked below that. The user sees the request change as they type, and the response appears next to the inputs that produced it.
- **Preconditions on top, not instead.** A stage that needs a test wallet or a session shows a precondition strip at the top ("Test wallet: not selected. Choose a test wallet") and still renders its form. Execute is disabled with a reason. Dry run works without a session.
- **One header shape for every stage.** Breadcrumb (family and group), title, one-line description, the RPC method name as a chip when there is one. See [components.md](components.md).
- **Density by default.** 4px spacing grid. Fields are 36px tall, table rows 36px, sidebar rows 32px.

## Identifiers and amounts

| Data | Display | Copy | Expanded |
|---|---|---|---|
| Tx hash, token UID, NC id (64 hex) | `0000a3f1…9c0e77b2` (8 + 8, middle ellipsis), mono 13px | Copy button copies the full value; inline tick for 1.5s, no toast | Click the value to reveal the full hash in a popover, grouped in blocks of 8 |
| Transparent address (34 chars, `H…`/`W…`) | Shown in full when space allows; otherwise 6 + 6 | Same | Not needed |
| Shielded address (97 chars, `K3…`) | `K3` prefix highlighted, then 6 + 6: `K3·ab12cd…7xYz9Q`, with the shielded glyph in front | Same | Full value in blocks of 4 characters, wrapping only between blocks, so two addresses can be compared block by block |
| Amount | Right-aligned in tables, tabular figures, 2 decimals for HTR, token symbol after in sans, muted | Copies the raw integer value as well as the formatted one (two items in the copy menu) | n/a |
| Hidden (shielded) amount | A hatched pill with the word "hidden" | Not copyable | Tooltip explains which capability is needed to decrypt |
| Decrypted amount | The value, followed by an open-eye glyph and the tooltip "Decrypted with this wallet's view key" | As amount | n/a |

Rules:

- Never use `break-all` on an identifier inside running text. Truncate in the middle, never at the end; the end of a hash is as important as the start.
- Always show which network an explorer link opens: the link chip uses the network's channel colour.
- An identifier that belongs to one of the user's wallets gets a small wallet tag ("Test addr 0", "Funding addr 0"), so self-sends are obvious.

## Status colours

Status colours are separate from network colours and from the shielded colour. Each status has a colour, a dot shape and a word, so it reads in greyscale too.

| Meaning | Colour token | Dot | Word examples |
|---|---|---|---|
| Idle, not started | `neutral` / muted ink | hollow ring | Idle, Not connected |
| In progress | `warning` | ring with a sweeping arc (static under reduced motion) | Connecting, Syncing, Waiting for MetaMask, Unconfirmed |
| Ready, confirmed, success | `success` | filled | Ready, Connected, Confirmed |
| Failed, voided, rejected | `error` | filled with a bar | Error, Voided, Rejected |
| Informational | `info` | none | Notes and hints |
| Dry run | no colour: graphite with a dashed outline | dashed ring | Dry run, Not sent |

Dry run moves off purple (its current colour) on purpose: violet now means shielded. A dashed outline reads as "draft, not real", which is what dry run is.

## How "shielded" is signalled

Shielded is one concept with one look: the **veil**. Violet (`accent`) plus a 45° hatch pattern, and a shield glyph.

- **Glyph.** An outlined shield for amount-shielded, a filled shield for fully shielded. Transparent outputs have no glyph. The absence of the veil is the signal for "public".
- **Mode chips and selector.** Three modes, in plain words: "Transparent", "Amount shielded", "Fully shielded". The selector is a segmented control on every output row; the chosen mode's chip shows a short subline saying what is hidden ("Amount hidden; token visible", "Amount and token hidden"). Confirm the exact hiding semantics against the protocol spec before shipping the copy.
- **Badge.** `Shielded` badge (veil style) on any output, address or transaction that contains shielded data. A transaction with mixed outputs shows a count: "2 of 3 outputs shielded".
- **Hidden values.** Shown as the hatched "hidden" pill, never as `0`, `—` or an empty cell. An empty cell looks like a bug; a hatched pill looks like a decision.
- **Capability.** Each wallet shows a capability badge: a three-segment meter plus the word. None (empty meter), Watch (1 segment), View (2), Full (3). Proposed meanings, to confirm with the wallet-lib team: watch detects shielded outputs, view decrypts amounts, full can spend. The badge sits next to the wallet name in the wallet context bar and in wallet pickers.
- **Address kind.** The address input detects the kind as you type or paste and shows a tag at the right edge: "Transparent" or "Shielded" (veil). A shielded address pasted into a field that only accepts transparent addresses is an inline error that says so in those words.

## Network indicator

The active network is always visible in three places, and they always agree:

1. The **rail** across the top of the window (described above).
2. The **network switcher** in the top bar: a chip with the network's colour, name and pattern. Opening it lists all three networks with their full node URL and explorer, and a short note per network. Switching to mainnet requires a second click on a confirmation row that names what will change ("Funding and Test wallets will restart on mainnet").
3. **Every network chip and explorer link** in stages uses the same channel colour.

When different parts of the system disagree (for example the test wallet is on testnet but the snap reports mainnet), the top bar shows a mismatch warning in the wallet context bar, naming both values. That is a real QA failure mode and the UI should catch it rather than leave it to the tester.

| Network | Rail | Chip | Extra |
|---|---|---|---|
| Testnet | 3px teal | Teal outline, teal dot | none |
| Shielded testnet | 4px violet with 45° hatch | Violet outline with hatch-filled dot | Shielded tools appear in navigation only on this network (other networks show them disabled with the reason) |
| Mainnet | 6px solid red with label | Solid red, white text | Primary transaction buttons become "Send on mainnet" with a red outline; destructive cleanup stages require typing the wallet name |

## Mockups

Static HTML mockups of this direction live in [mockups/](mockups/): `app-shell.html` (shell, navigation, network switcher open, helper server pill), `send-shielded.html` (send transaction with the shielded output editor) and `shielded-inspector.html`. Each is a single file with no build step; open it through any local static server (browsers block some features on `file://`). A small toolbar in the bottom-right corner switches between Testnet, Shielded testnet and Mainnet and toggles the dark theme; `?net=mainnet&theme=dark` in the URL does the same. They are references for layout and tokens, not production code.

## Voice

Plain verbs, sentence case, no filler. Buttons say what happens ("Send transaction", "Start wallet", "Copy request"), and the resulting toast uses the same verb ("Transaction sent"). Precondition messages say what is missing and link to the fix: "Test wallet not selected. Choose a test wallet." Errors quote the underlying message verbatim in mono below a one-line plain explanation. Errors never apologise.
