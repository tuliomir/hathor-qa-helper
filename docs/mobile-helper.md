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
| Configuration | Centralized TypeScript config | Single source of truth, type-safe, easy to maintain |

## Architecture

### New Directory Structure

```
src/
├── types/
│   └── mobileQA.ts                    # Type definitions (including config types)
├── config/
│   └── mobileQA/
│       ├── index.ts                   # Main config entry point (exports merged config)
│       ├── components.tsx             # Component registry and custom JSX components
│       ├── sections/                  # Section configs (split by QA area)
│       │   ├── newWallet.ts           # New wallet creation steps
│       │   ├── receiveSend.ts         # Receive & send operations
│       │   ├── tokenCreation.ts       # Token creation & registration
│       │   ├── nanoContracts.ts       # Nano contract workflows
│       │   └── ...                    # Other sections as needed
│       └── shared/                    # Shared configurations
│           ├── toolPresets.ts         # Reusable tool configurations
│           └── commonSteps.ts         # Reusable step templates
├── store/slices/
│   └── mobileQAProgressSlice.ts       # Progress tracking Redux slice
├── hooks/
│   └── useMobileQAProgress.ts         # Custom hook for progress
└── components/mobile/
    ├── MobileQALayout.tsx             # Main layout wrapper
    ├── MobileQASidebar.tsx            # Section navigation
    ├── MobileQAStepContent.tsx        # Step instructions display
    ├── MobileQAToolPanel.tsx          # Embedded tool panel (reads from config)
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
 * Includes configuration types for centralized QA content management
 */

import type { ReactNode, ComponentType } from 'react';
import type { RootState } from '../store';

// ============================================
// Status Types
// ============================================

export type MobileQAStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

// ============================================
// Configuration Types (Centralized Config System)
// ============================================

/**
 * Static props - values known at build time
 */
export type StaticProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Dynamic prop selector - derives prop value from Redux state at runtime
 */
export type DynamicPropSelector<T = unknown> = (state: RootState) => T;

/**
 * Tool props can be static values or dynamic selectors
 */
export type ToolPropValue<T = unknown> = T | DynamicPropSelector<T>;

/**
 * Tool props configuration supporting both static and dynamic values
 */
export interface ToolPropsConfig {
  /** Static props passed directly to the component */
  static?: StaticProps;
  /** Dynamic props derived from Redux state at runtime */
  dynamic?: Record<string, DynamicPropSelector>;
}

/**
 * Custom render function for inline JSX snippets
 * Receives current step context and returns ReactNode
 */
export type CustomRenderFn = (context: StepRenderContext) => ReactNode;

/**
 * Context provided to custom render functions
 */
export interface StepRenderContext {
  stepId: string;
  sectionId: string;
  isCompleted: boolean;
  /** Access to relevant Redux state */
  state: {
    selectedWalletId?: string;
    selectedTokenId?: string;
    // Add more state as needed
  };
}

/**
 * Tool configuration for a step - supports multiple configuration modes
 */
export type ToolConfig =
  | { type: 'component'; name: string; props?: ToolPropsConfig }
  | { type: 'custom'; render: CustomRenderFn }
  | { type: 'multiple'; tools: ToolConfig[] };

/**
 * Step configuration in the centralized config
 */
export interface StepConfig {
  id: string;
  title: string;
  description?: string;
  instructions: string[];    // Markdown-supported instructions
  expectedResult?: string;   // What should happen if step succeeds
  tool?: ToolConfig;         // Embedded tool configuration
  isOptional?: boolean;
  notes?: string[];          // Additional context or warnings
  /** Custom content to render below instructions */
  customContent?: CustomRenderFn;
}

/**
 * Section configuration in the centralized config
 */
export interface SectionConfig {
  id: string;
  title: string;
  description: string;
  icon?: string;             // Emoji or icon identifier
  steps: StepConfig[];
  prerequisiteSection?: string;  // Section ID that must be completed first
  /** Default tool for all steps in this section (can be overridden per step) */
  defaultTool?: ToolConfig;
}

/**
 * Root document configuration - single source of truth
 */
export interface MobileQAConfig {
  id: string;
  title: string;
  version: string;
  lastUpdated: string;
  sourceUrl: string;         // Link to original QA.md
  sections: SectionConfig[];
}

// ============================================
// Component Registry Types
// ============================================

/**
 * Component registry entry for lazy loading
 */
export interface ComponentRegistryEntry {
  component: ComponentType<Record<string, unknown>>;
  /** Human-readable description for the component */
  description?: string;
  /** Default props to merge with step-specific props */
  defaultProps?: StaticProps;
}

/**
 * Component registry - maps component names to their implementations
 */
export type ComponentRegistry = Record<string, ComponentRegistryEntry>;

// ============================================
// Progress Tracking Types (unchanged)
// ============================================

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

// ============================================
// Legacy types (for backward compatibility)
// ============================================

/** @deprecated Use StepConfig instead */
export interface MobileQAStep {
  id: string;
  title: string;
  instructions: string[];
  expectedResult?: string;
  toolComponent?: string;
  toolProps?: Record<string, unknown>;
  isOptional?: boolean;
  notes?: string[];
}

/** @deprecated Use SectionConfig instead */
export interface MobileQASection {
  id: string;
  title: string;
  description: string;
  icon?: string;
  steps: MobileQAStep[];
  prerequisiteSection?: string;
}

/** @deprecated Use MobileQAConfig instead */
export interface MobileQADocument {
  id: string;
  title: string;
  version: string;
  lastUpdated: string;
  sourceUrl: string;
  sections: MobileQASection[];
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

### Phase 3: Centralized Configuration System

**Goal**: Create the single-source-of-truth configuration for all QA content, helper screens, and embedded components.

#### 3.1 Component Registry

**File**: `src/config/mobileQA/components.tsx`

The component registry maps component names to their implementations and provides custom JSX components.

```typescript
import { lazy, type ComponentType } from 'react';
import type { ComponentRegistry, CustomRenderFn } from '../../types/mobileQA';

// ============================================
// Lazy-loaded Stage Components
// ============================================

const WalletInitialization = lazy(() => import('../../components/stages/WalletInitialization'));
const AddressValidation = lazy(() => import('../../components/stages/AddressValidation'));
const TransactionHistory = lazy(() => import('../../components/stages/TransactionHistory'));
const CreateTokenStage = lazy(() => import('../../components/stages/CreateTokenStage'));
const CustomTokens = lazy(() => import('../../components/stages/CustomTokens'));
const PushNotifications = lazy(() => import('../../components/stages/PushNotifications'));
const BetInitializeStage = lazy(() => import('../../components/stages/BetInitializeStage'));
const BetDepositStage = lazy(() => import('../../components/stages/BetDepositStage'));

// ============================================
// Component Registry
// ============================================

export const componentRegistry: ComponentRegistry = {
  WalletInitialization: {
    component: WalletInitialization as ComponentType<Record<string, unknown>>,
    description: 'Add/manage wallets, OCR seed extraction, QR codes',
    defaultProps: {},
  },
  AddressValidation: {
    component: AddressValidation as ComponentType<Record<string, unknown>>,
    description: 'Validate addresses, display QR codes',
    defaultProps: { showQrCode: true },
  },
  TransactionHistory: {
    component: TransactionHistory as ComponentType<Record<string, unknown>>,
    description: 'View wallet transactions',
  },
  CreateTokenStage: {
    component: CreateTokenStage as ComponentType<Record<string, unknown>>,
    description: 'Create custom tokens via RPC',
  },
  CustomTokens: {
    component: CustomTokens as ComponentType<Record<string, unknown>>,
    description: 'View/register custom tokens',
  },
  PushNotifications: {
    component: PushNotifications as ComponentType<Record<string, unknown>>,
    description: 'Push notification testing',
  },
  BetInitializeStage: {
    component: BetInitializeStage as ComponentType<Record<string, unknown>>,
    description: 'Initialize bet nano contracts',
  },
  BetDepositStage: {
    component: BetDepositStage as ComponentType<Record<string, unknown>>,
    description: 'Deposit to bet contracts',
  },
};

// ============================================
// Custom Inline JSX Components
// ============================================

/**
 * Custom info box for displaying warnings or tips
 */
export const WarningBox: CustomRenderFn = ({ stepId }) => (
  <div className="alert alert-warning mt-4">
    <span>⚠️ Make sure to backup your seed phrase before proceeding with step {stepId}</span>
  </div>
);

/**
 * Quick action buttons for common operations
 */
export const QuickActions: CustomRenderFn = ({ state }) => (
  <div className="flex gap-2 mt-4">
    <button className="btn btn-sm btn-outline" disabled={!state.selectedWalletId}>
      Copy Address
    </button>
    <button className="btn btn-sm btn-outline" disabled={!state.selectedWalletId}>
      View Balance
    </button>
  </div>
);

/**
 * Network status indicator
 */
export const NetworkStatus: CustomRenderFn = () => (
  <div className="badge badge-success gap-2">
    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
    Connected to Testnet
  </div>
);
```

#### 3.2 Section Configuration Files

Create individual section config files for better maintainability.

**File**: `src/config/mobileQA/sections/newWallet.ts`

```typescript
import type { SectionConfig } from '../../../types/mobileQA';

export const newWalletSection: SectionConfig = {
  id: 'new-wallet',
  title: 'New Wallet Creation',
  description: 'Create and initialize a new Hathor wallet',
  icon: '🔐',
  defaultTool: { type: 'component', name: 'WalletInitialization' },
  steps: [
    {
      id: 'create-wallet',
      title: 'Create New Wallet',
      description: 'Generate a new wallet with seed phrase',
      instructions: [
        'Open the mobile app and tap "Create New Wallet"',
        'Write down the 24-word seed phrase carefully',
        'Verify the seed phrase by selecting words in order',
      ],
      expectedResult: 'Wallet is created and you see the main dashboard',
      notes: ['Never share your seed phrase with anyone'],
    },
    {
      id: 'verify-address',
      title: 'Verify Receiving Address',
      description: 'Check the wallet address matches across platforms',
      instructions: [
        'Go to the Receive screen on mobile',
        'Compare the address with the QA Helper below',
        'Scan the QR code to verify it matches',
      ],
      expectedResult: 'Address matches between mobile and QA Helper',
      tool: {
        type: 'component',
        name: 'AddressValidation',
        props: {
          static: { showQrCode: true, showCopyButton: true },
          dynamic: {
            walletId: (state) => state.walletSelection.testWalletId,
          },
        },
      },
    },
  ],
};
```

**File**: `src/config/mobileQA/sections/nanoContracts.ts`

```typescript
import type { SectionConfig } from '../../../types/mobileQA';
import { NetworkStatus } from '../components';

export const nanoContractsSection: SectionConfig = {
  id: 'nano-contracts',
  title: 'Nano Contracts',
  description: 'Test nano contract creation and interaction',
  icon: '📜',
  prerequisiteSection: 'receive-send',
  steps: [
    {
      id: 'initialize-bet',
      title: 'Initialize Bet Contract',
      instructions: [
        'Select the funding wallet from the dropdown',
        'Set the oracle address and result options',
        'Click "Initialize" and confirm the transaction',
      ],
      expectedResult: 'Transaction is sent and NC ID is displayed',
      tool: {
        type: 'component',
        name: 'BetInitializeStage',
        props: {
          dynamic: {
            fundingWalletId: (state) => state.walletSelection.fundingWalletId,
          },
        },
      },
      customContent: NetworkStatus,
    },
    {
      id: 'deposit-to-bet',
      title: 'Deposit to Bet Contract',
      instructions: [
        'Enter the NC ID from the previous step',
        'Select the amount and betting option',
        'Confirm the deposit transaction',
      ],
      tool: {
        type: 'multiple',
        tools: [
          { type: 'component', name: 'BetDepositStage' },
          { type: 'custom', render: ({ state }) => (
            <div className="text-sm text-base-content/70 mt-2">
              Current wallet: {state.selectedWalletId || 'None selected'}
            </div>
          )},
        ],
      },
    },
  ],
};
```

#### 3.3 Shared Configurations

**File**: `src/config/mobileQA/shared/toolPresets.ts`

```typescript
import type { ToolConfig } from '../../../types/mobileQA';

/**
 * Reusable tool configurations for common scenarios
 */
export const toolPresets = {
  /** Address validation with QR and copy functionality */
  addressWithQr: {
    type: 'component',
    name: 'AddressValidation',
    props: { static: { showQrCode: true, showCopyButton: true } },
  } satisfies ToolConfig,

  /** Wallet initialization for creating new wallets */
  walletInit: {
    type: 'component',
    name: 'WalletInitialization',
    props: { static: { allowImport: true } },
  } satisfies ToolConfig,

  /** Transaction history with filtering */
  txHistory: (walletIdSelector: (state: unknown) => string | undefined) => ({
    type: 'component',
    name: 'TransactionHistory',
    props: {
      dynamic: { walletId: walletIdSelector },
    },
  }) satisfies ToolConfig,
};
```

**File**: `src/config/mobileQA/shared/commonSteps.ts`

```typescript
import type { StepConfig } from '../../../types/mobileQA';
import { toolPresets } from './toolPresets';

/**
 * Reusable step templates
 */
export const commonSteps = {
  /** Standard "verify address" step */
  verifyAddress: (overrides?: Partial<StepConfig>): StepConfig => ({
    id: 'verify-address',
    title: 'Verify Address',
    instructions: [
      'Check the receiving address on your device',
      'Compare with the address shown in QA Helper',
    ],
    expectedResult: 'Addresses match exactly',
    tool: toolPresets.addressWithQr,
    ...overrides,
  }),

  /** Standard "check balance" step */
  checkBalance: (overrides?: Partial<StepConfig>): StepConfig => ({
    id: 'check-balance',
    title: 'Check Balance',
    instructions: [
      'Open the wallet on mobile',
      'Verify the balance matches expected value',
    ],
    ...overrides,
  }),
};
```

#### 3.4 Main Configuration Entry Point

**File**: `src/config/mobileQA/index.ts`

```typescript
import type { MobileQAConfig } from '../../types/mobileQA';

// Import section configs
import { newWalletSection } from './sections/newWallet';
import { receiveSendSection } from './sections/receiveSend';
import { tokenCreationSection } from './sections/tokenCreation';
import { nanoContractsSection } from './sections/nanoContracts';
// ... import other sections

// Re-export component registry for use in tool panel
export { componentRegistry } from './components';

/**
 * Main Mobile QA Configuration
 * This is the single source of truth for all QA content
 */
export const mobileQAConfig: MobileQAConfig = {
  id: 'hathor-mobile-qa',
  title: 'Hathor Wallet Mobile QA',
  version: '1.0.0',
  lastUpdated: '2025-01-17',
  sourceUrl: 'https://github.com/HathorNetwork/hathor-wallet-mobile/blob/master/QA.md',
  sections: [
    // Sections are imported and ordered here
    newWalletSection,
    receiveSendSection,
    tokenCreationSection,
    nanoContractsSection,
    // ... add other sections in order
  ],
};

/**
 * Helper to get a section by ID
 */
export function getSection(sectionId: string) {
  return mobileQAConfig.sections.find((s) => s.id === sectionId);
}

/**
 * Helper to get a step by section and step ID
 */
export function getStep(sectionId: string, stepId: string) {
  const section = getSection(sectionId);
  return section?.steps.find((s) => s.id === stepId);
}

/**
 * Get all section IDs in order
 */
export function getSectionIds(): string[] {
  return mobileQAConfig.sections.map((s) => s.id);
}
```

#### 3.5 Section Reference Table

| Section ID | Config File | Embedded Tools |
|------------|-------------|----------------|
| `app-update` | `sections/appUpdate.ts` | None |
| `new-wallet` | `sections/newWallet.ts` | `WalletInitialization` |
| `receive-send` | `sections/receiveSend.ts` | `AddressValidation` |
| `transaction-history` | `sections/transactionHistory.ts` | `TransactionHistory` |
| `settings` | `sections/settings.ts` | None |
| `biometry` | `sections/biometry.ts` | None |
| `token-creation` | `sections/tokenCreation.ts` | `CreateTokenStage`, `CustomTokens` |
| `qr-scanning` | `sections/qrScanning.ts` | `AddressValidation` |
| `push-notifications` | `sections/pushNotifications.ts` | `PushNotifications` |
| `nano-contracts` | `sections/nanoContracts.ts` | `BetInitializeStage`, `BetDepositStage` |
| `whitelabel` | `sections/whitelabel.ts` | None |

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
- Reads tool configuration from centralized config
- Resolves dynamic props using Redux selectors
- Supports multiple tool modes: component, custom JSX, multiple
- Lazy-loaded components via registry
- Loading state with skeleton
- Error boundary for failed loads

Implementation:

```typescript
import { Suspense, useMemo } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { componentRegistry } from '../../config/mobileQA';
import type { ToolConfig, StepRenderContext } from '../../types/mobileQA';

interface ToolPanelProps {
  toolConfig: ToolConfig | undefined;
  sectionId: string;
  stepId: string;
  isCompleted: boolean;
}

export function MobileQAToolPanel({ toolConfig, sectionId, stepId, isCompleted }: ToolPanelProps) {
  // Build render context with relevant state
  const context: StepRenderContext = useAppSelector((state) => ({
    stepId,
    sectionId,
    isCompleted,
    state: {
      selectedWalletId: state.walletSelection.testWalletId,
      selectedTokenId: state.tokens.selectedTokenId,
    },
  }));

  if (!toolConfig) return null;

  return (
    <div className="tool-panel">
      <Suspense fallback={<div className="skeleton h-48 w-full" />}>
        <ToolRenderer config={toolConfig} context={context} />
      </Suspense>
    </div>
  );
}

function ToolRenderer({ config, context }: { config: ToolConfig; context: StepRenderContext }) {
  const state = useAppSelector((s) => s);

  if (config.type === 'custom') {
    return <>{config.render(context)}</>;
  }

  if (config.type === 'multiple') {
    return (
      <div className="space-y-4">
        {config.tools.map((tool, idx) => (
          <ToolRenderer key={idx} config={tool} context={context} />
        ))}
      </div>
    );
  }

  // type === 'component'
  const entry = componentRegistry[config.name];
  if (!entry) {
    return <div className="alert alert-error">Unknown component: {config.name}</div>;
  }

  // Resolve props: merge defaultProps + static + dynamic
  const resolvedProps = useMemo(() => {
    const props: Record<string, unknown> = { ...entry.defaultProps };

    if (config.props?.static) {
      Object.assign(props, config.props.static);
    }

    if (config.props?.dynamic) {
      for (const [key, selector] of Object.entries(config.props.dynamic)) {
        props[key] = selector(state);
      }
    }

    return props;
  }, [config.props, entry.defaultProps, state]);

  const Component = entry.component;
  return <Component {...resolvedProps} />;
}
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

### Configuration System

The centralized configuration system provides a single source of truth for all QA content.

**Key Files:**
| File | Purpose |
|------|---------|
| `src/config/mobileQA/index.ts` | Main entry point, exports merged config |
| `src/config/mobileQA/components.tsx` | Component registry and custom JSX |
| `src/config/mobileQA/sections/*.ts` | Individual section configurations |
| `src/config/mobileQA/shared/toolPresets.ts` | Reusable tool configurations |
| `src/config/mobileQA/shared/commonSteps.ts` | Reusable step templates |

**Adding a New Section:**
1. Create `src/config/mobileQA/sections/yourSection.ts`
2. Export a `SectionConfig` object
3. Import and add to `sections` array in `src/config/mobileQA/index.ts`

**Adding a New Tool Component:**
1. Create the component in `src/components/stages/`
2. Add lazy import and registry entry in `src/config/mobileQA/components.tsx`
3. Reference by name in section configs

### Stage Components (via Component Registry)

Location: `src/components/stages/` (registered in `src/config/mobileQA/components.tsx`)

| Component | Purpose |
|-----------|---------|
| `WalletInitialization` | Add/manage wallets, OCR seed extraction, QR codes |
| `AddressValidation` | Validate addresses, display QR codes |
| `TransactionHistory` | View wallet transactions |
| `CreateTokenStage` | Create custom tokens via RPC |
| `CustomTokens` | View/register custom tokens |
| `PushNotifications` | Push notification testing |
| `BetInitializeStage` | Initialize bet nano contracts |
| `BetDepositStage` | Deposit to bet contracts |

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

When updating the configuration in `src/config/mobileQA/`, cross-reference this document to ensure accuracy.

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
- [ ] Phase 3: Centralized Config (component registry, section configs, shared presets)
- [ ] Phase 4: UI Components (sidebar, content, tool panel, header)
- [ ] Phase 5: Tool Integration (dynamic props, custom JSX, adaptations)
- [ ] Phase 6: Polish & Testing (UX refinements, testing)
