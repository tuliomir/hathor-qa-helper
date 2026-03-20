---
name: playwright-navigation
description: This skill should be used when navigating the QA Helper app via Playwright, using "browser_navigate", "browser_click", "browser_snapshot", or any Playwright MCP tool. Also triggered when the user asks to "test via Playwright", "navigate to a stage", "run cleanup", "open the app in a browser", "take a snapshot", "click a button", or mentions Playwright, e2e testing, or browser automation in this project.
---

# Playwright Navigation for QA Helper

Procedural knowledge for navigating the Hathor QA Helper app via Playwright MCP tools.

## Core Rule: Direct URL Navigation

Never click sidebar buttons to navigate between stages. Sidebar items overlap during scroll/animation and cause click interception errors.

Always use `browser_navigate` with the full URL:
```
http://localhost:5173/tools/{groupSlug}/{stageSlug}
```

To find the correct URL for any stage, read the reference file at `references/stage-urls.md`.

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

If the header shows no wallet status, navigate to `/tools/main/wallet-initialization` first:
1. Click "Start {wallet name}" button
2. Wait for "ready" text (up to 60s)
3. Navigate to the target stage via URL

## Key Selectors

### Header
- Test wallet info: look for "Test:" label in header
- Funding wallet info: look for "Funding:" label in header
- Balance: displayed next to "Balance:" in header

### Cleanup Page (`/tools/auditing/test-wallet-cleanup`)
- Refresh button: `button` with text "Refresh"
- Execute Cleanup button: `button` with text "Execute Cleanup"
- Debug panel: shows real-time logs with timestamps
- Completion: look for "Cleanup completed successfully!" text

### Common Patterns
- Buttons are identified by their visible text
- Tables show token data with columns for Token, Balance, etc.
- Status messages appear as colored badges or inline text
- Error states show red text with error details

## Page Reload Caveats

- `browser_navigate` causes full page reload — Redux rehydrates from localStorage
- Wallet instances reconnect automatically (~10s simple, ~120s large)
- Snap connection state persists in Redux but MetaMask provider is lost
- Sidebar links provide SPA navigation without reload, but are unreliable due to click interception — always prefer `browser_navigate` with the full URL

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
4. Verify balances in header after completion
