# Desktop QA Development Guide

This document provides guidance for developing and maintaining the Desktop QA Walkthrough feature. The Desktop QA mirrors the Mobile QA implementation pattern but targets desktop wallet testing workflows.

## Architecture Overview

The Desktop QA follows a **configuration-driven architecture**:

```
src/config/desktopQA/
├── index.ts              # Main entry point, exports helper functions
├── components.tsx        # Component registry mapping keys to React components
└── sections/             # Individual section configurations
    ├── initialization.ts
    ├── addresses.ts
    ├── transactions.ts
    └── ... (24 total sections)
```

**Key files:**
- **Types**: `src/types/desktopQA.ts`
- **Redux Slice**: `src/store/slices/desktopQAProgressSlice.ts`
- **UI Components**: `src/components/desktop/`
- **Stage Components**: `src/components/stages/` (shared with main QA)
- **Common Components**: `src/components/common/` (reusable across all QA workflows)

## Creating New Test Steps

### 1. Add Step to Section Configuration

Edit the appropriate section file in `src/config/desktopQA/sections/`:

```typescript
// src/config/desktopQA/sections/addresses.ts
export const addressesSection: SectionConfig = {
  id: 'addresses',
  title: 'Addresses',
  description: 'Address management and QR code functionality',
  steps: [
    {
      id: 'step-1',           // Unique within section
      title: 'Copy address',   // Displayed in sidebar and header
      instructions: 'Copy your receiving address and receive **10 HTR**.',
      tool: { componentKey: 'FundTestAddress' },  // Optional: embedded tool
    },
    {
      id: 'step-2',
      title: 'Verify transaction',
      instructions: 'Verify the transaction appears in your wallet.',
      toolHint: 'The Get Balance tool could help verify the balance.',  // Optional hint
    },
  ],
};
```

### 2. Step Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier within the section (e.g., `'step-1'`) |
| `title` | Yes | Short title displayed in sidebar and step header |
| `instructions` | Yes | Markdown-formatted instructions (see Formatting below) |
| `tool` | No | Embedded tool component: `{ componentKey: 'ComponentName' }` |
| `toolHint` | No | Blue info box suggesting a tool might be useful |

### 3. Instruction Formatting (MarkdownText)

Instructions support simple markdown via `src/components/common/MarkdownText.tsx`:

```typescript
instructions: `
**Bold text** for emphasis.
*Italic text* for secondary emphasis.
++Underlined text++ for important items.
~~Strikethrough~~ for deprecated items.
[Link text](https://example.com) for external links.

Use \\n for line breaks within the string.
Use \\n\\n for paragraph breaks.
`
```

**Important**: Use regular strings with `\n`, not template literals with actual newlines followed by `\n`.

## Adjusting Existing Test Steps

### Modifying Instructions

Edit the `instructions` field in the section config file:

```typescript
// Before
instructions: 'Test the feature.',

// After
instructions: 'Test the feature.\n\n**Important:** Pay attention to error messages.',
```

### Adding a Tool to an Existing Step

1. Ensure the component is registered (see "Creating Components" below)
2. Add the `tool` field:

```typescript
{
  id: 'step-5',
  title: 'Send transaction',
  instructions: 'Send a test transaction.',
  tool: { componentKey: 'SendTransactionStage' },  // Add this line
}
```

### Removing a Tool

Simply remove the `tool` field or set it to `undefined`.

### Reordering Steps

Change the order in the `steps` array. Step IDs don't need to be sequential.

## LocalStorage Interactions

The Desktop QA uses several localStorage keys:

### 1. Progress Tracking

**Key**: `'desktop-qa-progress'`

```typescript
// Structure
{
  currentLocation: { sectionId: string, stepId: string },
  stepStatuses: {
    [sectionId]: {
      [stepId]: 'pending' | 'completed'
    }
  }
}
```

**Redux Slice**: `src/store/slices/desktopQAProgressSlice.ts`

**Actions**:
- `setCurrentLocation({ sectionId, stepId })` - Navigate to step
- `setStepStatus({ sectionId, stepId, status })` - Mark step completed
- `resetProgress()` - Clear all progress

### 2. Wallet Selection

**Key**: `'qa-helper-wallet-selection'`

```typescript
{
  fundingWalletId: string | null,
  testWalletId: string | null
}
```

**Redux Slice**: `src/store/slices/walletSelectionSlice.ts`

**Actions**:
- `setFundingWallet(walletId)` - Set funding wallet
- `setTestWallet(walletId)` - Set test wallet
- `clearWalletSelection()` - Clear both

### 3. Wallet Data

**Key**: `'qa-helper-wallets'`

Contains wallet metadata (seeds, names, networks). Managed by `walletStoreSlice.ts`.

### Debugging LocalStorage

```javascript
// In browser console
JSON.parse(localStorage.getItem('desktop-qa-progress'))
JSON.parse(localStorage.getItem('qa-helper-wallet-selection'))
JSON.parse(localStorage.getItem('qa-helper-wallets'))
```

## Creating / Adapting Components

### Component Types

1. **Stage Components** (`src/components/stages/`) - Full-featured tools for QA steps
2. **Common Components** (`src/components/common/`) - Reusable building blocks

### Registering a Component

Add to `src/config/desktopQA/components.tsx`:

```typescript
import MyNewComponent from '../../components/stages/MyNewComponent';

export const componentRegistry: Record<string, ComponentType> = {
  // ... existing components
  MyNewComponent,  // Add here
};
```

### Creating a New Stage Component

Stage components are **self-contained** - they read from Redux, not props:

```typescript
// src/components/stages/MyNewTool.tsx
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';

export default function MyNewTool() {
  const dispatch = useAppDispatch();

  // Read from Redux
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);

  // Component logic here

  return (
    <div className="space-y-4">
      <div className="card-primary">
        <h2 className="text-xl font-bold mb-2">Tool Title</h2>
        {/* Tool UI */}
      </div>
    </div>
  );
}
```

### Adapting Main QA Components

Many components in `src/components/stages/` work for both Main QA and Desktop QA:

1. **Check if it's self-contained** - Components should read from Redux, not receive props
2. **Register in Desktop QA** - Add to `components.tsx`
3. **Use in step config** - Reference by key

**Example - Reusing SendTransactionStage**:
```typescript
// In components.tsx - already imported
import { SendTransactionStage } from '../../components/stages/SendTransactionStage';

// In section config
tool: { componentKey: 'SendTransactionStage' }
```

### Creating Reusable Common Components

For functionality shared across multiple tools, create common components:

```typescript
// src/components/common/WalletAddressSelector.tsx
interface WalletAddressSelectorProps {
  walletId?: string;           // Optional - defaults to test wallet
  onAddressChange?: (address: string | null) => void;
}

export default function WalletAddressSelector({ ... }) {
  // Uses test wallet from Redux if walletId not provided
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const walletId = walletIdProp ?? testWalletId;
  // ...
}
```

## Wallet Auto-Loading

The `WalletAutoLoader` component (`src/components/common/WalletAutoLoader.tsx`) automatically starts selected wallets on any route:

- Placed in `App.tsx` at the root level
- Checks `fundingWalletId` and `testWalletId` from Redux
- Starts wallets that are in 'idle' status
- Prevents duplicate start attempts

**Console logs**: Look for `[WalletAutoLoader]` in browser console for debugging.

## UI Components

### DesktopQALayout

Main layout with sidebar + content area. Located at `src/components/desktop/DesktopQALayout.tsx`.

### DesktopQASidebar

Section/step navigation with progress indicators. Shows:
- Section progress (X/Y completed)
- Current section indicator (N/Total)
- Expandable step lists

### DesktopQAStepContent

Renders the current step with:
- Section/step header
- Instructions (via MarkdownText)
- Inline tool (if configured)
- Tool hint (if configured)
- Navigation buttons (Previous, Next, Complete & Next)

**Navigation handlers scroll to top** - `window.scrollTo(0, 0)` is called on navigation.

## Adding New Sections

1. Create section file in `src/config/desktopQA/sections/`:

```typescript
// src/config/desktopQA/sections/newSection.ts
import type { SectionConfig } from '../../../types/desktopQA';

export const newSection: SectionConfig = {
  id: 'new-section',
  title: 'New Section',
  description: 'Description for sidebar',
  steps: [
    // ... steps
  ],
};
```

2. Import and add to `src/config/desktopQA/index.ts`:

```typescript
import { newSection } from './sections/newSection';

const sections: SectionConfig[] = [
  // ... existing sections
  newSection,
];
```

## Common Patterns

### Showing Wallet Connection Status

```typescript
if (!walletId) {
  return (
    <div className="p-4 bg-yellow-50 border border-warning rounded-lg">
      <p className="text-yellow-800 m-0 text-sm mb-2">No wallet selected.</p>
      <Link to="/" className="text-blue-600 hover:text-blue-800 underline text-sm">
        Go to Wallet Initialization
      </Link>
    </div>
  );
}

if (!wallet || wallet.status !== 'ready') {
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-blue-800 m-0 text-sm">
        <span className="inline-block animate-pulse mr-2">⏳</span>
        Wallet is connecting... Please wait.
      </p>
    </div>
  );
}
```

### Success Messages

```typescript
{transactionSent && (
  <div className="mt-4 p-4 bg-green-50 border border-success rounded-lg">
    <p className="text-success font-medium m-0">Transaction sent successfully!</p>
  </div>
)}
```

### Error Messages

```typescript
{error && (
  <div className="p-3 bg-red-50 border border-danger rounded">
    <p className="m-0 text-red-900 text-sm">{error}</p>
  </div>
)}
```

## Testing Changes

1. Navigate to `/desktop` in the browser
2. Use browser console to check `[WalletAutoLoader]` logs
3. Check localStorage for persisted state
4. Test navigation between steps
5. Verify tools render correctly within steps

## Related Documentation

- `wallet-selection.md` - Wallet selection patterns
- `creating-stages.md` - General stage component patterns
- `daisyui-components.md` - UI component library
- `design-system.md` - Styling conventions
