# RPC Testing Feature - Implementation Plan

## Overview
This feature will add comprehensive RPC testing capabilities to the QA Helper tool. Users will be able to make RPC calls to a local wallet RPC server (running on another port) via WalletConnect, view intermediate processing steps, inspect requests/responses, and easily copy data for reproduction.

**Testing Model**: We're testing external RPC calls made TO a local wallet RPC server via WalletConnect. The wallet-lib serves as the "source of truth" to validate responses and help construct correct requests.

**Architecture**:
- Local RPC server runs on a different port (e.g., localhost:3001)
- QA Helper connects via WalletConnect protocol
- RPC calls are made through WalletConnect client's `request()` method
- Responses are compared against wallet-lib's expected output

## Core Requirements
1. **WalletConnect Integration**: Connect to local RPC server via WalletConnect
2. **Two-Section Display**: Show **Request** (method + params) and **Response** (from RPC server)
3. **Dry Run Mode**: Generate requests without sending them to RPC server
4. **Request Display**: Collapsible blue-themed section with method + params (copyable)
5. **Response Display**: Collapsible section with prettified response (copyable)
6. **Intermediates** (for complex RPCs): Calculated values shown in request params (e.g., oracle buffer, timestamp)
7. **Response Validation**: Optional comparison against wallet-lib expected values
8. **Error Handling**: Display request params even when RPC calls fail

## Architecture

### 1. WalletConnect Integration

#### WalletConnect Context
**Location**: `src/contexts/WalletConnectContext.tsx` (to be created)

**Purpose**: Manage WalletConnect client and session

**Key Features**:
- Initialize WalletConnect client
- Connect/disconnect to local RPC server
- Maintain session state
- Provide `client.request()` method for RPC calls

**Example Usage**:
```typescript
const { client, session, connect, disconnect } = useWalletConnect();

// Make RPC call
const result = await client.request({
  topic: session.topic,
  chainId: HATHOR_TESTNET_CHAIN,
  request: {
    method: 'htr_getBalance',
    params: { network: 'testnet', tokens: ['00'] }
  }
});
```

### Data storage

All RPC units ( we will call them "cards" ) will store their information in a single `rpc` slice in Redux, allowing for integration on other parts of the application. The generated data will be added to a "RPC History" in this redux, allowing for the tester to reproduce the entire sequence of RPC calls made during a testing session along with a reference of their responses. All this data will have an option to be exported to JSON.

### 2. RPC Card Pattern

Each RPC method has its own dedicated card component. This allows for:
- Custom input fields per RPC method
- Tailored parameter validation
- Method-specific help text and examples

**Common Card Structure** (all cards follow this pattern):
```typescript
interface RpcCardProps {
  onExecute: (params: MethodParams) => Promise<{ request: any; response: any }>;
  disabled?: boolean;
  isDryRun?: boolean;
  // Method-specific params and setters
}

// Card state
const [loading, setLoading] = useState(false);
const [result, setResult] = useState<any>(null);
const [error, setError] = useState<string | null>(null);
const [requestInfo, setRequestInfo] = useState<{ method: string; params: any } | null>(null);
const [expanded, setExpanded] = useState(false);
const [requestExpanded, setRequestExpanded] = useState(false);
```

**Display Sections** (standard across all cards):

1. **Card Header**
   - Title + description
   - "DRY RUN" badge if in dry run mode
   - Input fields (method-specific)
   - Execute button

2. **Request Section** (collapsible, blue-themed)
   - Shown when execution starts (before response)
   - Displays `{ method: string, params: object }`
   - Copy button for full request JSON
   - Preserved even if RPC call fails

3. **Response Section** (collapsible)
   - Success: Green checkmark + prettified response
   - Error: Red X + error message
   - Dry Run: Purple flask icon + info message (no actual response)
   - Copy button for full response JSON

### 3. Specific RPC Components

#### `RpcGetBalanceCard` (Phase 1 - Initial Implementation)
**Location**: `src/components/rpc/RpcGetBalanceCard.tsx`

**Purpose**: Get balance for specified tokens from the RPC server

**User Inputs**:
- Token IDs (array of strings)
- Add/remove token inputs
- Import known tokens button

**Request Structure**:
```typescript
{
  method: 'htr_getBalance',
  params: {
    network: 'testnet',  // or 'mainnet'
    tokens: ['00', 'token-id-1', 'token-id-2']
  }
}
```

**Response Structure** (from RPC server):
```typescript
{
  response: [
    {
      token: { id: '00', name: 'Hathor', symbol: 'HTR' },
      balance: { unlocked: 100, locked: 0 },
      transactions: 5,
      // ... other fields
    }
  ]
}
```

**Response Pretty Display**:
- Array of balance objects
- Each object shown in collapsible section
- Key-value pairs formatted with proper spacing
- Token info prominently displayed

**Response Validation** (future enhancement):
- Call wallet-lib's `getBalance()` with same tokens
- Compare RPC response vs wallet-lib expected values
- Show validation badge (✓ match / ⚠ mismatch)
- List differences if any

**Implementation Notes**:
- Follow exact pattern from reference `rpc-get-balance-card.tsx`
- No intermediates - simple direct RPC call
- Dry run mode supported (shows request, but response = null)

### 4. RPC Handlers

#### `createRpcHandlers` Function
**Location**: `src/services/rpcHandlers.ts`

**Purpose**: Create RPC handler functions that execute calls via WalletConnect

**Pattern**:
```typescript
export interface RpcHandlerDependencies {
  client: WalletConnectClient;  // WalletConnect client
  session: SessionTypes.Struct; // Active WalletConnect session
  updateBalance?: (data: any) => void;  // Optional state updaters
  balanceTokens?: string[];
  dryRun?: boolean;  // If true, skip actual RPC call
}

export const createRpcHandlers = (deps: RpcHandlerDependencies) => {
  const { client, session, dryRun = false } = deps;

  return {
    getRpcBalance: async () => { /* ... */ },
    getRpcInitializeBet: async (params: InitializeBetParams) => { /* ... */ },
    // ... other handlers
  };
};
```

**Handler Return Value**:
All handlers return `{ request, response }`:
```typescript
{
  request: {
    method: string,   // e.g., 'htr_getBalance'
    params: object    // Method-specific parameters
  },
  response: any | null  // Response from RPC server (null if dry run)
}
```

**Example - GetBalance Handler** (Simple RPC):
```typescript
getRpcBalance: async () => {
  if (!session || !client) {
    throw new Error('WalletConnect session not available');
  }

  // Filter empty tokens
  const filteredTokens = balanceTokens.filter(t => t.trim() !== '');

  // Build request params
  const requestParams = {
    method: 'htr_getBalance',
    params: {
      network: 'testnet',
      tokens: filteredTokens
    }
  };

  try {
    let result;

    if (dryRun) {
      // Dry run: don't actually call RPC
      result = null;
    } else {
      // Make the RPC request via WalletConnect
      result = await client.request({
        topic: session.topic,
        chainId: HATHOR_TESTNET_CHAIN,
        request: requestParams
      });
    }

    // Optional: Update local state
    if (result?.response && updateBalance) {
      result.response.forEach((item: any) => {
        updateBalance({
          token: item.token,
          balance: item.balance,
          // ...
        });
      });
    }

    // Return both request and response
    return {
      request: requestParams,
      response: result
    };
  } catch (error) {
    // Attach request to error so UI can display it
    const errorWithRequest = error as any;
    errorWithRequest.requestParams = requestParams;
    throw errorWithRequest;
  }
}
```

**Example - InitializeBet Handler** (With intermediate calculations):
```typescript
getRpcInitializeBet: async (params: InitializeBetParams) => {
  if (!session || !client) {
    throw new Error('WalletConnect session not available');
  }

  // INTERMEDIATE CALCULATION 1: Convert oracle address to buffer
  const oracleBuffer = getOracleBuffer(params.oracleAddress);

  // INTERMEDIATE CALCULATION 2: Convert Date to unix timestamp
  const timestamp = Math.floor(params.deadline.getTime() / 1000);

  // Build invoke params (shows intermediate values)
  const invokeParams: any = {
    network: 'testnet',
    method: 'initialize',
    blueprint_id: params.blueprintId,
    actions: [],
    args: [
      oracleBuffer,   // <-- intermediate value 1
      params.token,
      timestamp,      // <-- intermediate value 2
    ],
    push_tx: params.push_tx,
    nc_id: null,
  };

  // Build request params
  const requestParams = {
    method: 'htr_sendNanoContractTx',
    params: invokeParams
  };

  try {
    let response;

    if (dryRun) {
      response = null;
    } else {
      response = await client.request({
        topic: session.topic,
        chainId: HATHOR_TESTNET_CHAIN,
        request: requestParams
      });
    }

    // Return request (which shows intermediate calculations) and response
    return {
      request: requestParams,
      response
    };
  } catch (error) {
    const errorWithRequest = error as any;
    errorWithRequest.requestParams = requestParams;
    throw errorWithRequest;
  }
}
```

**Key Differences points**:
1. **No intermediate RPCS**: Intermediate calculations are done locally (oracle buffer, timestamps)
2. **Single RPC call**: Each handler makes ONE RPC call (except special cases like `setResult` which makes two)
3. **Request structure visible**: Intermediate values appear in the request params, not separate
4. **Dry run support**: Handlers check `dryRun` flag and skip actual RPC call if true

### 4. New Stage for RPC Testing

#### Add RPC Testing Stage
**Location**: Update `src/types/stage.ts`

```typescript
export type StageId =
  | 'wallet-initialization'
  | 'address-validation'
  | 'custom-tokens'
  | 'transaction-history'
  | 'rpc-testing';  // NEW

export const STAGES: Stage[] = [
  // ... existing stages ...
  {
    id: 'rpc-testing',
    title: 'RPC Testing',
    description: 'Test RPC calls with detailed request/response inspection',
    icon: '🔌',
  },
];
```

#### RPC Testing Stage Component
**Location**: `src/components/stages/RpcTesting.tsx`

**Layout**:
```
┌─────────────────────────────────────────┐
│  RPC Testing                            │
├─────────────────────────────────────────┤
│  📋 Wallet Information                  │
│  ┌────────────────────────────────────┐ │
│  │ • Get Balance                      │ │
│  │ • Get Address        (future)      │ │
│  │ • Get Network        (future)      │ │
│  └────────────────────────────────────┘ │
│                                         │
│  💸 Transactions                        │
│  ┌────────────────────────────────────┐ │
│  │ • Send Transaction   (future)      │ │
│  │ • Create Token       (future)      │ │
│  └────────────────────────────────────┘ │
│                                         │
│  🎲 Nano Contracts                      │
│  ┌────────────────────────────────────┐ │
│  │ • Initialize Bet     (future)      │ │
│  │ • Place Bet          (future)      │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Foundation + GetBalance (Current Focus)
**Status**: 🔴 Not Started

**Tasks**:
1. **WalletConnect Setup**
   - [ ] Install WalletConnect dependencies (`@walletconnect/sign-client`, etc.)
   - [ ] Create `src/contexts/WalletConnectContext.tsx`
   - [ ] Implement connect/disconnect functionality
   - [ ] Add WalletConnect provider to app

2. **RPC Infrastructure**
   - [ ] Create `src/services/rpcHandlers.ts`
   - [ ] Implement `createRpcHandlers` factory function
   - [ ] Implement `getRpcBalance` handler
   - [ ] Add dry run mode support

3. **UI Components**
   - [ ] Create `src/components/rpc/` directory
   - [ ] Create `RpcGetBalanceCard.tsx` component
   - [ ] Implement token input list (add/remove functionality)
   - [ ] Implement "Import Known Tokens" feature
   - [ ] Add request section (collapsible, blue-themed)
   - [ ] Add response section (collapsible, with pretty rendering)
   - [ ] Add dry run mode badge

4. **Stage Integration**
   - [ ] Add 'rpc-testing' to StageId type in `src/types/stage.ts`
   - [ ] Add RPC Testing to STAGES array
   - [ ] Create `src/components/stages/RpcTesting.tsx`
   - [ ] Add WalletConnect connection widget
   - [ ] Add dry run mode toggle
   - [ ] Wire up RpcGetBalanceCard in stage
   - [ ] Update StageContent to include RPC Testing

5. **Testing & Polish**
   - [ ] Test WalletConnect connection flow
   - [ ] Test RPC call with connected wallet
   - [ ] Test dry run mode (request shown, no response)
   - [ ] Test error handling (display request even on error)
   - [ ] Test copy functionality (request and response)
   - [ ] Test token add/remove/import
   - [ ] Test response pretty rendering

**Acceptance Criteria**:
- ✓ User can connect to local RPC server via WalletConnect
- ✓ User can toggle dry run mode on/off
- ✓ User can add/remove/import token IDs from the list of tokenUIDs from that wallet ( see CustomWallet stage )
- ✓ User can execute getBalance RPC call
- ✓ Request section displays method + params with copy button
- ✓ Response section displays pretty formatted result with copy button
- ✓ Dry run mode shows request but no response
- ✓ Errors are properly displayed with request params preserved
- ✓ All sections are collapsible
- ✓ UI matches DaisyUI styling

#### Note:
On WalletConnect successful connection, an "address" is returned from the client, which is supposed to be the address at index 0 of the wallet. In that moment we should verify if that address matches the address at index 0 of the currently selected test wallet in the QA Helper. If they don't match, we should show a warning to the user indicating that the connected wallet does not match the selected test wallet and not display the RPC Cards for interaction.

### Phase 2: Additional Wallet RPCs (Future)
**Status**: ⚪ Planned

**RPC Calls**:
- Get Address (with address index input)
- Get Network
- Get Extended Public Key (xpub)
- Get UTXOs (simple and advanced)

### Phase 3: Transaction RPCs (Future)
**Status**: ⚪ Planned

**RPC Calls**:
- Send Transaction
  - Intermediates: UTXO selection, change calculation, fee calculation
- Create Token
  - Intermediates: Authority addresses, token configuration

### Phase 4: Nano Contract RPCs (Future)
**Status**: ⚪ Planned

**RPC Calls**:
- Initialize Bet
  - Intermediates: Oracle script generation (CRITICAL - main example)
  - Oracle address → buffer conversion shown
  - Deadline → timestamp conversion shown
- Place Bet
  - Intermediates: Bet option encoding, amount calculation
- Set Result (Oracle action)
  - Intermediates: Signature data, result encoding
- Withdraw Prize
  - Intermediates: Prize calculation, UTXO selection

## Component Reusability Patterns

### Input Components
Create reusable form inputs that can be shared across RPC cards:

1. **TokenListInput**: Multi-token input with add/remove
2. **AddressInput**: Address input with validation and address book integration
3. **AmountInput**: Amount input with unit conversion display
4. **DateTimeInput**: Date/time picker for deadlines
5. **NetworkSelector**: Network selection dropdown

### Display Components
Create reusable display components:

1. **JsonDisplay**: Pretty JSON with syntax highlighting and copy
2. **TableDisplay**: Generic table for structured data
3. **KeyValueDisplay**: Key-value pairs with labels
4. **HashDisplay**: Transaction/NC hash with explorer link and copy
5. **IntermediateStep**: Individual intermediate step display

## State Management

### Local State (Component Level)
Each RPC card manages its own:
- Input parameters
- Execution state
- Results

### Shared State (Context/Redux)
Consider adding RPC execution history:
- Recent RPC calls
- Ability to replay past calls
- Export/import RPC sequences for test cases

## Integration with Existing Wallet System

### Wallet Selection
- RPC calls use the currently selected "test wallet"
- Display which wallet is being used in the header
- Validate wallet is initialized before allowing RPC calls

### Wallet Library Integration
- Use `@hathor/wallet-lib` for actual RPC execution
- Map between UI parameters and wallet-lib API
- Handle wallet-lib specific errors and edge cases

## Copy Functionality Requirements

All copyable elements must:
1. Show visual feedback on copy (toast or inline indicator)
2. Copy formatted JSON (2-space indentation)
3. Include all relevant data (not truncated)
4. Support both click and keyboard shortcuts
5. Use existing `CopyButton` component from `src/components/common/CopyButton.tsx`

## Error Handling Strategy

### Error Display
- Inline errors in the card (like base-snap-card)
- Global error toast for critical failures
- Preserve request/intermediates even on error
- Clear error indication in status

### Error Recovery
- Allow retry without re-entering parameters
- Preserve successful intermediates on retry
- Clear errors on new execution

## Testing Strategy

### Manual Testing Checklist (Per RPC)
- [ ] Execute with valid inputs → success
- [ ] Execute with invalid inputs → proper error
- [ ] Copy request → valid JSON
- [ ] Copy intermediate → valid data
- [ ] Copy response → valid JSON
- [ ] Collapse/expand sections → smooth animation
- [ ] Execute multiple times → state properly resets
- [ ] Switch wallets mid-test → uses correct wallet
- [ ] Network errors → properly handled

## Future Enhancements

### RPC Sequences
- Define multi-step RPC sequences (e.g., initialize bet → place bet → set result → withdraw)
- Save sequences as test cases
- Replay sequences with one click

### RPC History
- View past RPC executions
- Filter by method, status, timestamp
- Export history for debugging

### Response Comparison
- Compare responses across different executions
- Highlight differences
- Useful for regression testing

### Custom RPC Calls
- Allow users to define custom RPC calls via JSON
- Useful for testing new/undocumented methods
- Save custom calls for reuse

## Design Considerations

### Visual Hierarchy
1. Card title and description (most prominent)
2. Execute button (primary action)
3. Input fields (secondary)
4. Results (appears after execution)
   - Request (medium importance)
   - Intermediates (medium-high importance)
   - Response (highest importance when available)

### Color Coding
- **Status Colors**:
  - Idle: Gray
  - Preparing: Yellow
  - Sent: Blue
  - Completed: Green
  - Error: Red

- **Section Colors**:
  - Request: Blue accent
  - Intermediates: Yellow/Orange accent
  - Response: Green accent
  - Error: Red accent

### Responsive Design
- Cards should stack vertically on mobile
- Collapsible sections help manage screen space
- Copy buttons always visible and accessible

## Notes and Questions

### Questions for User (if needed during implementation):
1. Should we add rate limiting to prevent accidental RPC spam? -- No
2. Should we cache RPC responses (e.g., network, balance)? -- Yes
3. Do we need to support custom RPC endpoints? -- No
4. Should we add RPC execution time metrics? -- Yes

### Technical Decisions Pending:
1. Use Context API or Redux for RPC history? -- Use Redux.
2. Should we add WebSocket support for real-time updates? -- No
3. Should intermediate updates be throttled/debounced? -- No

## Current Focus: Phase 1 - GetBalance Implementation

The next steps are to:
1. Set up WalletConnect integration
2. Create RPC handler service using WalletConnect client
3. Build RpcGetBalanceCard component (NOT a base card - dedicated component)
4. Create RPC Testing stage with connection widget + dry run toggle
5. Test with local RPC server

## Key Architecture Decisions (Confirmed)

1. **WalletConnect**: Connect to local RPC server via WalletConnect protocol
2. **No Base Card**: Each RPC method has its own dedicated card component
3. **Simple Return Structure**: Handlers return `{ request, response }` - no complex state management
4. **Intermediates in Request**: For complex RPCs, intermediate calculations appear in the request params
5. **Dry Run Mode**: Handlers check flag and skip actual RPC call
6. **DaisyUI Styling**: Use DaisyUI classes, not shadcn/ui components
7. **Source of Truth**: wallet-lib used for validation (future enhancement)

## Reference Implementation

Primary reference: `/Users/tuliomir/code/bet-dapp/packages/bet-dapp/src/components/rpcs/`
- `rpc-tester.tsx` - Main tester component with WalletConnect
- `rpc-get-balance-card.tsx` - GetBalance card implementation
- `rpc-method-handlers.tsx` - RPC handlers using WalletConnect
- `rpc-walletconnect.tsx` - Connection widget
- `rpc-initialize-bet-card.tsx` - Example of RPC with intermediate calculations

---

**Last Updated**: 2025-11-18
**Current Phase**: Phase 1 - Foundation + GetBalance
**Status**: Planning Complete, Ready for Implementation
**Architecture**: WalletConnect RPC Testing
