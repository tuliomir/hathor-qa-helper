---
name: playwright-navigation
description: This skill should be used when navigating the QA Helper app via Playwright, using "browser_navigate", "browser_click", "browser_snapshot", or any Playwright MCP tool. Also triggered when the user asks to "test via Playwright", "navigate to a stage", "run cleanup", "open the app in a browser", "take a snapshot", "click a button", or mentions Playwright, e2e testing, or browser automation in this project.
---

# Playwright Navigation for QA Helper

Procedural knowledge for navigating the Hathor QA Helper app via Playwright MCP tools.

## Core Rule: Direct URL Navigation

Prefer `browser_navigate` with the full URL over clicking through the navigation:
```
http://localhost:5173/tools/{groupSlug}/{stageSlug}
```

To find the correct URL for any stage, read the reference file at `references/stage-urls.md`. The walkthroughs live at `/mobile` and `/desktop`.

If you do use the navigation, it is `navigation` named **Stages**: families are regions, groups are buttons (`aria-expanded`), stages are links with sentence-case names, and the current stage has `aria-current="page"`. Below 1024px it is a drawer opened by the **Open navigation** button.

## Wallet Lifecycle

After any `browser_navigate` call, the page fully reloads. Redux state rehydrates from localStorage, but wallet instances must reconnect.

### Wait Times

| Operation | Timeout |
|-----------|---------|
| Simple wallet sync | 30s |
| Large wallet sync (e.g., iOS 38 rc4) | 120s |
| Transaction settlement | 5-15s |
| Token balance update (websocket) | ~5s |
| Cleanup execution (batched fallback) | 120s |

### Wallet Connection Flow

1. Navigate to the target page via URL
2. Wait for wallet status text to change from "Connecting..." → balance display
3. For pages that load token data (e.g., cleanup), click "Refresh" after wallets connect
4. Large wallets (many tokens/UTXOs) take longer — use extended timeouts

### Starting an Idle Wallet

If the top bar's wallet context shows no running wallet, navigate to `/tools/main/wallet-initialization` first:
1. Click the button named "Start {wallet name}"
2. Wait for the wallet's status chip to read "ready" (up to 60s)
3. Navigate to the target stage via URL

## Key Selectors

### Shell (every route)
- Stage navigation: `navigation` named "Stages"; filter: searchbox "Filter stages" (`/` focuses it)
- Command palette: button "Find stage", or `Control+K` / `Meta+K`; dialog "Command palette" with a combobox and `option`s
- Workspace switcher: button "Workspace: Tools" (menu items "Tools", "Mobile walkthrough", "Desktop walkthrough")
- Wallet context: `group` "Wallet context" with buttons "Test wallet: {name}" and "Funding wallet: {name}" (status and HTR balance inside), plus "RPC: …" and "Snap: …"
- Helper server pill: button starting with "Helper server:"; network switcher: button "Network: {label}"

### Stage layout
- Title: the page's `h1` (sentence case); the breadcrumb is `navigation` "Breadcrumb"
- Preconditions: the strip under the header lists unmet requirements with a fix link
- Method stages: a compose panel (titled with the action, inputs and the primary button) next to an "Inspect" panel. The primary button is named after the action ("Send transaction", "Get xpub"); "Edit raw" opens the request in the Raw RPC editor
- Outcome: the Inspect panel's result region has `data-result="success" | "error" | "rejected" | "dry-run"`

### Cleanup Page (`/tools/auditing/test-wallet-cleanup`)
- Refresh button: `button` named "Refresh"
- Execute button: `button` named "Execute cleanup" ("Execute cleanup on mainnet" on mainnet, which asks to type the wallet name)
- Debug panel: a collapsed `details` at the bottom with timestamped logs
- Completion: a success callout "Cleanup completed."

### Common Patterns
- Buttons are identified by their accessible name (sentence case); icon-only buttons have an `aria-label`
- Tables are `DataTable`s; below 768px rows render as stacked cards
- Hashes and addresses are middle-truncated `Identifier`s: read the full value from the copy button or the popover, not the visible text
- Errors are callouts with `role="alert"`

## Page Reload Caveats

- `browser_navigate` causes full page reload — Redux rehydrates from localStorage
- Wallet instances reconnect automatically (~10s simple, ~120s large)
- Snap connection state persists in Redux but MetaMask provider is lost
- Navigation links give SPA navigation without a reload; prefer `browser_navigate` when you want a clean state

## Dropdown Selection

To select a dropdown option, use the `browser_select_option` MCP tool. Pass the element `ref` from the page snapshot and a `values` array containing the visible option text to select.

## Async Operation Patterns

### Waiting for Completion
- Use `browser_wait_for` with expected text: "completed", "failed", "ready"
- For long operations, wait with `time` parameter then take a snapshot
- Check debug panel logs for detailed progress

### Transaction Flow
1. Click action button (e.g., "Execute Cleanup")
2. UI shows loading state with step descriptions
3. Wait for completion text or check debug logs
4. Verify balances in the top bar's wallet context after completion
