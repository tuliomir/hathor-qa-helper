# Playwright Navigation Tips for QA Helper

## Direct URL Navigation

Always prefer direct URL navigation over clicking sidebar buttons:
- Sidebar items overlap during scroll/animation and cause click interception
- Use `page.goto('/tools/{groupSlug}/{stageSlug}')` directly

### Common URLs

| Stage | URL |
|-------|-----|
| Wallet Initialization | `/tools/main-qa/wallet-initialization` |
| Address Validation | `/tools/main/address-validation` |
| Custom Tokens | `/tools/main/custom-tokens` |
| Test Wallet Cleanup | `/tools/auditing/test-wallet-cleanup` |
| Get UTXOs | `/tools/rpc/get-utxos` |
| Send Transaction (RPC) | `/tools/rpc/send-transaction` |
| Snap Connection | `/tools/snaps/connection` |
| Get Network (Snap) | `/tools/snaps/get-network` |

## Wallet Setup

Wallets auto-start from Redux persisted state, but on fresh page
navigation they reconnect (~10-30s depending on wallet size):

1. Navigate to wallet initialization
2. Wait for `ready` text to appear (wallets connecting)
3. Select wallets from dropdowns using `selectOption`
4. Navigate to target stage via URL

### Starting an idle wallet

```
click "Start {wallet name}" button → wait for "ready" (up to 60s)
```

### Wallet with many tokens (e.g., iOS 38 rc4)

Takes longer to sync. Wait up to 120s for ready state. After
navigation, the cleanup page needs a "Refresh" click to load
token data.

## Waiting for Async Operations

- Wallet sync: `waitFor('ready', 60000)`
- Cleanup execution: `waitFor('failed' or 'completed', 120000)`
- Transaction settlement: 5-15s typically
- Token balance update: triggers via websocket, usually <5s

## Dropdown Selection

Use the `browser_select_option` tool with the `values` array parameter:
```
ref: comboboxRef, values: ["Option Text"]
```

## Page Reload Caveats

- `page.goto()` causes full reload → Redux rehydrates from localStorage
- Wallet instances need to reconnect (~10s for simple wallets)
- Snap connection state persists in Redux but MetaMask provider is lost
- For SPA navigation without reload, click sidebar links instead
