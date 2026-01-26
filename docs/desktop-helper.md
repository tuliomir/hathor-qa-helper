# Desktop QA Walkthrough Implementation Guide

This document provides a complete implementation guide for the `/desktop` route feature. It is designed to support multi-session implementation, allowing work to be picked up and continued across different development sessions.

## Feature Overview

The `/desktop` route provides a guided walkthrough of the [Hathor Wallet Desktop QA document](https://github.com/HathorNetwork/hathor-wallet/blob/master/qa/QA.md). It helps QA engineers by:

1. Displaying step-by-step QA instructions in an organized UI
2. Embedding relevant helper tools alongside instructions (when available)
3. Tracking progress with localStorage persistence
4. Providing a link to the original QA document for reference

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Routing | react-router-dom | Clean URLs, proper back/forward navigation, shareable links |
| Content Source | Embedded in app | Works offline, fast loading, no rate limits |
| Progress Tracking | localStorage | Persists across browser sessions, no backend needed |
| Tool Display | Inline embedding | Seamless UX, no context switching between pages |
| Configuration | Centralized TypeScript config | Single source of truth, type-safe, easy to maintain |

## Architecture

### Directory Structure

```
src/
├── types/
│   └── desktopQA.ts                   # Type definitions
├── config/
│   └── desktopQA/
│       ├── index.ts                   # Main config entry point
│       ├── components.tsx             # Component registry
│       └── sections/                  # Section configs (split by QA area)
│           ├── walletUpdate.ts        # Wallet update testing
│           ├── initialization.ts      # Fresh wallet setup
│           ├── tokenEmptyWallet.ts    # Token creation with no funds
│           ├── addresses.ts           # Address management
│           ├── lockUnlock.ts          # Security locking
│           ├── createToken.ts         # Token creation
│           ├── transactionDetailCreation.ts
│           ├── sendTokens.ts          # Token transfers
│           ├── transactionDetailTimelock.ts
│           ├── tokenDetails.ts        # Token information
│           ├── registerUnregister.ts  # Token registration
│           ├── administrativeTools.ts # Mint, melt, authorities
│           ├── hideZeroBalance.ts     # Token visibility
│           ├── tokenBarScroll.ts      # UI scroll testing
│           ├── changeServer.ts        # Network switching
│           ├── addPassphrase.ts       # Passphrase security
│           ├── notificationsBugReport.ts
│           ├── reloadWallet.ts        # Offline/online
│           ├── registerSameName.ts    # Naming conflicts
│           ├── spendSameOutput.ts     # Output validation
│           ├── createNft.ts           # NFT creation
│           ├── resetLocked.ts         # Reset from lock
│           ├── resetMenu.ts           # Debug mode reset
│           └── lateBackup.ts          # Backup reminder
├── store/slices/
│   └── desktopQAProgressSlice.ts      # Progress tracking Redux slice
└── components/desktop/
    ├── DesktopQALayout.tsx            # Main layout wrapper
    ├── DesktopQASidebar.tsx           # Section navigation
    ├── DesktopQAStepContent.tsx       # Step instructions display
    ├── DesktopQAToolPanel.tsx         # Embedded tool panel
    └── DesktopQAHeader.tsx            # Header with progress bar
```

### Files Modified

| File | Changes |
|------|---------|
| `src/store/index.ts` | Added `desktopQAProgressReducer` |
| `src/App.tsx` | Added `/desktop/*` route |

---

## Section Reference Table

| Section ID | Config File | Embedded Tools |
|------------|-------------|----------------|
| `wallet-update` | `sections/walletUpdate.ts` | None |
| `initialization` | `sections/initialization.ts` | `WalletInitialization` |
| `token-empty-wallet` | `sections/tokenEmptyWallet.ts` | `CreateTokenStage` |
| `addresses` | `sections/addresses.ts` | `GetAddressStage`, `GetBalanceStage` |
| `lock-unlock` | `sections/lockUnlock.ts` | `GetBalanceStage` |
| `create-token` | `sections/createToken.ts` | `CreateTokenStage` |
| `transaction-detail-creation` | `sections/transactionDetailCreation.ts` | None |
| `send-tokens` | `sections/sendTokens.ts` | `SendTransactionStage`, `GetAddressStage` |
| `transaction-detail-timelock` | `sections/transactionDetailTimelock.ts` | `SendTransactionStage`, `GetBalanceStage` |
| `token-details` | `sections/tokenDetails.ts` | `CustomTokens` |
| `register-unregister` | `sections/registerUnregister.ts` | `CustomTokens` |
| `administrative-tools` | `sections/administrativeTools.ts` | `GetAddressStage` |
| `hide-zero-balance` | `sections/hideZeroBalance.ts` | `CustomTokens` |
| `token-bar-scroll` | `sections/tokenBarScroll.ts` | `CustomTokens` |
| `change-server` | `sections/changeServer.ts` | None |
| `add-passphrase` | `sections/addPassphrase.ts` | None |
| `notifications-bug-report` | `sections/notificationsBugReport.ts` | None |
| `reload-wallet` | `sections/reloadWallet.ts` | `WalletInitialization` |
| `register-same-name` | `sections/registerSameName.ts` | `CustomTokens` |
| `spend-same-output` | `sections/spendSameOutput.ts` | `GetAddressStage`, `SendTransactionStage` |
| `create-nft` | `sections/createNft.ts` | None |
| `reset-locked` | `sections/resetLocked.ts` | `WalletInitialization` |
| `reset-menu` | `sections/resetMenu.ts` | None |
| `late-backup` | `sections/lateBackup.ts` | `WalletInitialization` |

Reference the original QA.md for exact step content: https://github.com/HathorNetwork/hathor-wallet/blob/master/qa/QA.md

---

## Component Registry

Located in `src/config/desktopQA/components.tsx`, the registry maps component keys to their implementations:

| Component Key | Stage Component | Purpose |
|---------------|-----------------|---------|
| `WalletInitialization` | `WalletInitialization` | Add/manage wallets, seed extraction |
| `CreateTokenStage` | `CreateTokenStage` | Create custom tokens via RPC |
| `CustomTokens` | `CustomTokens` | View/register custom tokens |
| `SendTransactionStage` | `SendTransactionStage` | Send token transactions |
| `GetAddressStage` | `GetAddressStage` | Get and manage addresses |
| `GetBalanceStage` | `GetBalanceStage` | View wallet balance |

---

## Redux Store Structure

The `desktopQAProgress` slice manages:

```typescript
interface DesktopQAProgress {
  sections: Record<string, SectionProgress>;
  currentLocation: {
    sectionId: string;
    stepId: string;
  };
}
```

### Actions

- `setStepStatus({ sectionId, stepId, status })` - Update step completion status
- `setCurrentLocation({ sectionId, stepId })` - Navigate to a step
- `resetProgress()` - Clear all progress
- `initializeSectionProgress({ sectionId, stepIds })` - Initialize section

### Selectors

- `selectCurrentLocation` - Get current section/step
- `selectStepStatus(state, sectionId, stepId)` - Get step status
- `selectCompletedStepsCount(state, sectionId)` - Count completed steps in section
- `selectTotalCompletedSteps` - Total completed across all sections

---

## Testing Checklist

- [ ] Navigate to `/desktop` - starts at first section/step
- [ ] Progress persists across browser refresh
- [ ] Embedded tools render and function correctly
- [ ] "View Original" link opens GitHub QA.md in new tab
- [ ] Step completion toggle updates UI and localStorage
- [ ] Previous/Next navigation works at section boundaries
- [ ] Reset progress clears all data with confirmation
- [ ] Responsive layout works on different screen sizes

---

## Original QA Document

Always refer to the source document for the most accurate QA instructions:

**URL**: https://github.com/HathorNetwork/hathor-wallet/blob/master/qa/QA.md

When updating the configuration in `src/config/desktopQA/`, cross-reference this document to ensure accuracy.

---

## Session Continuation

To continue implementation in a new session:

1. Review this document for context
2. Check the current implementation state by looking at existing files
3. Identify any missing sections or steps
4. Add new tool integrations as needed

### Adding a New Section

1. Create `src/config/desktopQA/sections/yourSection.ts`
2. Export a `SectionConfig` object
3. Import and add to `sections` array in `src/config/desktopQA/index.ts`

### Adding a New Tool Component

1. Ensure the component exists in `src/components/stages/`
2. Add import and registry entry in `src/config/desktopQA/components.tsx`
3. Reference by key in section configs using `tool: { componentKey: 'ComponentName' }`
