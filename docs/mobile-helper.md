# Mobile QA Walkthrough Implementation Guide

This document provides a complete implementation guide for the `/mobile` route feature. It is designed to support multi-session implementation, allowing work to be picked up and continued across different development sessions.

## Feature Overview

The `/mobile` route provides a guided walkthrough of the [Hathor Wallet Mobile QA document](https://github.com/HathorNetwork/hathor-wallet-mobile/blob/master/QA.md). It helps QA engineers by:

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

## Architecture

### New Directory Structure

```
src/
├── types/
│   └── mobileQA.ts                    # Type definitions
├── data/
│   └── mobileQAContent.ts             # Embedded QA document
├── store/slices/
│   └── mobileQAProgressSlice.ts       # Progress tracking Redux slice
├── hooks/
│   └── useMobileQAProgress.ts         # Custom hook for progress
└── components/mobile/
    ├── MobileQALayout.tsx             # Main layout wrapper
    ├── MobileQASidebar.tsx            # Section navigation
    ├── MobileQAStepContent.tsx        # Step instructions display
    ├── MobileQAToolPanel.tsx          # Embedded tool panel
    ├── MobileQAHeader.tsx             # Header with progress bar
    ├── MobileQAProgressBar.tsx        # Visual progress indicator
    └── StepCheckbox.tsx               # Step completion toggle
```

### Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add `react-router-dom` dependency |
| `src/main.tsx` | Wrap App with `BrowserRouter` |
| `src/App.tsx` | Add `Routes` and route definitions |
| `src/store/index.ts` | Add `mobileQAProgressReducer` |

---

## Implementation Phases

### Phase 1: Foundation

**Goal**: Set up routing and type system.

#### 1.1 Install Dependencies

```bash
yarn add react-router-dom
```

#### 1.2 Create Type Definitions

**File**: `src/types/mobileQA.ts`

```typescript
/**
 * Type definitions for the Mobile QA walkthrough system
 */

export type MobileQAStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface MobileQAStep {
  id: string;
  title: string;
  instructions: string[];    // Markdown-supported instructions
  expectedResult?: string;   // What should happen if step succeeds
  toolComponent?: string;    // Component name to embed (e.g., 'WalletInitialization')
  toolProps?: Record<string, unknown>;
  isOptional?: boolean;
  notes?: string[];          // Additional context or warnings
}

export interface MobileQASection {
  id: string;
  title: string;
  description: string;
  icon?: string;             // Emoji or icon identifier
  steps: MobileQAStep[];
  prerequisiteSection?: string;  // Section ID that must be completed first
}

export interface MobileQADocument {
  id: string;
  title: string;
  version: string;
  lastUpdated: string;
  sourceUrl: string;         // Link to original QA.md
  sections: MobileQASection[];
}

// Progress tracking types
export interface StepProgress {
  status: MobileQAStepStatus;
  completedAt?: number;      // Unix timestamp
  notes?: string;            // User notes for this step
}

export interface SectionProgress {
  steps: Record<string, StepProgress>;
  startedAt?: number;
  completedAt?: number;
}

export interface MobileQAProgress {
  documentId: string;
  documentVersion: string;
  sections: Record<string, SectionProgress>;
  lastAccessedSection?: string;
  lastAccessedStep?: string;
  updatedAt: number;
}
```

#### 1.3 Create Progress Redux Slice

**File**: `src/store/slices/mobileQAProgressSlice.ts`

```typescript
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { MobileQAProgress, MobileQAStepStatus } from '../../types/mobileQA';

const STORAGE_KEY = 'mobile-qa-progress';

function loadFromStorage(): MobileQAProgress | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveToStorage(progress: MobileQAProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

const initialState: MobileQAProgress = loadFromStorage() || {
  documentId: 'hathor-mobile-qa',
  documentVersion: '1.0.0',
  sections: {},
  updatedAt: Date.now(),
};

const mobileQAProgressSlice = createSlice({
  name: 'mobileQAProgress',
  initialState,
  reducers: {
    setStepStatus(
      state,
      action: PayloadAction<{
        sectionId: string;
        stepId: string;
        status: MobileQAStepStatus;
        notes?: string;
      }>
    ) {
      const { sectionId, stepId, status, notes } = action.payload;

      if (!state.sections[sectionId]) {
        state.sections[sectionId] = { steps: {}, startedAt: Date.now() };
      }

      state.sections[sectionId].steps[stepId] = {
        status,
        completedAt: status === 'completed' ? Date.now() : undefined,
        notes,
      };

      state.updatedAt = Date.now();
      saveToStorage(state);
    },

    setCurrentLocation(
      state,
      action: PayloadAction<{ sectionId: string; stepId?: string }>
    ) {
      state.lastAccessedSection = action.payload.sectionId;
      state.lastAccessedStep = action.payload.stepId;
      state.updatedAt = Date.now();
      saveToStorage(state);
    },

    resetProgress(state) {
      state.sections = {};
      state.lastAccessedSection = undefined;
      state.lastAccessedStep = undefined;
      state.updatedAt = Date.now();
      saveToStorage(state);
    },
  },
});

export const { setStepStatus, setCurrentLocation, resetProgress } = mobileQAProgressSlice.actions;
export default mobileQAProgressSlice.reducer;
```

#### 1.4 Update Store Configuration

**File**: `src/store/index.ts` - Add the new reducer:

```typescript
import mobileQAProgressReducer from './slices/mobileQAProgressSlice';

// Add to the store configuration:
mobileQAProgress: mobileQAProgressReducer,
```

---

### Phase 2: Routing Setup

**Goal**: Add react-router-dom routing without breaking existing stage system.

#### 2.1 Update main.tsx

```typescript
import { BrowserRouter } from 'react-router-dom';

// Wrap App with BrowserRouter:
<BrowserRouter>
  <App />
</BrowserRouter>
```

#### 2.2 Update App.tsx

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import QALayout from './components/QALayout';
import MobileQALayout from './components/mobile/MobileQALayout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<QALayout />} />
      <Route path="/mobile" element={<MobileQALayout />} />
      <Route path="/mobile/:sectionId" element={<MobileQALayout />} />
      <Route path="/mobile/:sectionId/:stepId" element={<MobileQALayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

---

### Phase 3: QA Content Structure

**Goal**: Create the embedded QA document content.

**File**: `src/data/mobileQAContent.ts`

This file contains the structured QA document. Sections should map to the original QA.md structure:

| Section ID | Title | Embedded Tool |
|------------|-------|---------------|
| `app-update` | App Update Validation | None |
| `new-wallet` | New Wallet Creation | `WalletInitialization` |
| `receive-send` | Receive & Send Operations | `AddressValidation` |
| `transaction-history` | Transaction History | `TransactionHistory` |
| `settings` | Settings Management | None |
| `biometry` | Biometry Testing | None |
| `token-creation` | Token Creation & Registration | `CreateTokenStage`, `CustomTokens` |
| `qr-scanning` | QR Code Scanning | `AddressValidation` |
| `push-notifications` | Push Notifications | `PushNotifications` |
| `nano-contracts` | Nano Contracts | `BetInitializeStage`, `BetDepositStage` |
| `whitelabel` | Whitelabel Testing | None |

Reference the original QA.md for exact step content: https://github.com/HathorNetwork/hathor-wallet-mobile/blob/master/QA.md

---

### Phase 4: UI Components

**Goal**: Build the walkthrough UI.

#### 4.1 MobileQALayout.tsx

Main layout with three areas:
- **Left sidebar**: Section navigation with progress indicators
- **Center content**: Step instructions and expected results
- **Right panel**: Embedded tool (when `toolComponent` is specified)

#### 4.2 MobileQASidebar.tsx

Features:
- Collapsible accordion for sections
- Progress badges (completed/total steps)
- Visual indication of current section/step
- Scroll to current step on mount

#### 4.3 MobileQAStepContent.tsx

Features:
- Step title and instructions
- Expected result display
- Step completion checkbox
- Notes input field
- Previous/Next navigation buttons

#### 4.4 MobileQAToolPanel.tsx

Features:
- Lazy-loaded tool components
- Component mapping registry
- Loading state with skeleton
- Error boundary for failed loads

Component mapping:

```typescript
const toolComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  WalletInitialization: lazy(() => import('../stages/WalletInitialization')),
  AddressValidation: lazy(() => import('../stages/AddressValidation')),
  TransactionHistory: lazy(() => import('../stages/TransactionHistory')),
  CreateTokenStage: lazy(() => import('../stages/CreateTokenStage')),
  CustomTokens: lazy(() => import('../stages/CustomTokens')),
  PushNotifications: lazy(() => import('../stages/PushNotifications')),
  BetInitializeStage: lazy(() => import('../stages/BetInitializeStage')),
  BetDepositStage: lazy(() => import('../stages/BetDepositStage')),
};
```

#### 4.5 MobileQAHeader.tsx

Features:
- Document title
- Overall progress bar
- "View Original" button (opens QA.md in new tab)
- "Reset Progress" button with confirmation
- Link back to main QA Helper (`/`)

---

### Phase 5: Tool Integration

**Goal**: Ensure embedded tools work correctly within the walkthrough context.

Considerations:
- Tools may need adaptation for narrower panel width
- Some tools depend on wallet selection from WalletInitialization
- Ensure Redux state is shared between main app and mobile walkthrough

---

### Phase 6: Polish & Testing

**Goal**: Finalize UX and verify functionality.

#### Testing Checklist

- [ ] Navigate to `/mobile` - redirects to first section/step
- [ ] Progress persists across browser refresh
- [ ] Embedded tools render and function correctly
- [ ] "View Original" link opens GitHub QA.md in new tab
- [ ] Step completion toggle updates UI and localStorage
- [ ] Previous/Next navigation works at section boundaries
- [ ] Reset progress clears all data with confirmation
- [ ] Responsive layout works on different screen sizes

---

## Reference Information

### Existing Stage Components

Location: `src/components/stages/`

| Component | Purpose |
|-----------|---------|
| `WalletInitialization.tsx` | Add/manage wallets, OCR seed extraction, QR codes |
| `AddressValidation.tsx` | Validate addresses, display QR codes |
| `TransactionHistory.tsx` | View wallet transactions |
| `CreateTokenStage.tsx` | Create custom tokens via RPC |
| `CustomTokens.tsx` | View/register custom tokens |
| `PushNotifications.tsx` | Push notification testing |
| `BetInitializeStage.tsx` | Initialize bet nano contracts |
| `BetDepositStage.tsx` | Deposit to bet contracts |

### Redux Store Structure

See `src/store/index.ts` for the complete store configuration. Key slices for the mobile walkthrough:

- `walletStore` - Wallet instances and metadata
- `walletSelection` - Funding/test wallet selection
- `mobileQAProgress` - Progress tracking (new)

### Useful Hooks

- `useWalletStore()` - Access wallet CRUD operations
- `useAppSelector()` / `useAppDispatch()` - Redux hooks
- `useToast()` - User notifications
- `useStage()` - Stage navigation (existing system)

---

## Original QA Document

Always refer to the source document for the most accurate QA instructions:

**URL**: https://github.com/HathorNetwork/hathor-wallet-mobile/blob/master/QA.md

When updating the embedded content in `src/data/mobileQAContent.ts`, cross-reference this document to ensure accuracy.

---

## Session Continuation

To continue implementation in a new session:

1. Review this document for context
2. Check the current implementation state by looking at existing files
3. Identify which phase you're in based on what's implemented
4. Continue from where the previous session left off

Use the phase checklist to track progress:

- [ ] Phase 1: Foundation (types, Redux slice, dependencies)
- [ ] Phase 2: Routing (BrowserRouter, Routes, basic layout)
- [ ] Phase 3: QA Content (embedded document structure)
- [ ] Phase 4: UI Components (sidebar, content, tool panel, header)
- [ ] Phase 5: Tool Integration (component mapping, adaptations)
- [ ] Phase 6: Polish & Testing (UX refinements, testing)
