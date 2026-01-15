# Creating New Stages

Guide for adding new QA stages to the application. Follow these steps in order.

## Overview

A complete stage requires:
1. **Redux Slice** - State management for request/response/form data
2. **RPC Handler** - Service function to make the RPC call
3. **RPC Card Component** - UI for displaying request/response
4. **Stage Component** - Main stage UI with form inputs
5. **Stage Registration** - Type definitions and routing

## Step 1: Create Redux Slice

Create `src/store/slices/{featureName}Slice.ts`:

```tsx
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface FeatureResponse {
  // Define response structure from RPC
}

export interface FeatureState {
  request: { method: string; params: unknown } | null;
  response: FeatureResponse | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
  // Form state fields
  fieldName: string;
}

const initialState: FeatureState = {
  request: null,
  response: null,
  rawResponse: null,
  error: null,
  timestamp: null,
  duration: null,
  isDryRun: false,
  fieldName: 'default',
};

const featureSlice = createSlice({
  name: 'feature',
  initialState,
  reducers: {
    setFeatureRequest: (
      state,
      action: PayloadAction<{ method: string; params: unknown; isDryRun: boolean }>
    ) => {
      state.request = { method: action.payload.method, params: action.payload.params };
      state.isDryRun = action.payload.isDryRun;
      state.timestamp = Date.now();
      state.response = null;
      state.rawResponse = null;
      state.error = null;
      state.duration = null;
    },
    setFeatureResponse: (
      state,
      action: PayloadAction<{ response: unknown; duration: number }>
    ) => {
      state.rawResponse = action.payload.response;
      state.duration = action.payload.duration;
      state.error = null;
      // Parse response into structured format
      try {
        const data = action.payload.response as { response?: FeatureResponse };
        if (data?.response) {
          state.response = data.response;
        }
      } catch (error) {
        state.response = null;
      }
    },
    setFeatureError: (
      state,
      action: PayloadAction<{ error: string; duration: number }>
    ) => {
      state.error = action.payload.error;
      state.duration = action.payload.duration;
      state.response = null;
      state.rawResponse = null;
    },
    setFeatureFormData: (state, action: PayloadAction<{ fieldName: string }>) => {
      state.fieldName = action.payload.fieldName;
    },
    clearFeatureData: (state) => {
      state.request = null;
      state.response = null;
      state.rawResponse = null;
      state.error = null;
      state.timestamp = null;
      state.duration = null;
      state.isDryRun = false;
    },
  },
});

export const {
  setFeatureRequest,
  setFeatureResponse,
  setFeatureError,
  setFeatureFormData,
  clearFeatureData,
} = featureSlice.actions;

export default featureSlice.reducer;
```

**Register in store** (`src/store/index.ts`):
```tsx
import featureReducer from './slices/featureSlice';

export const store = configureStore({
  reducer: {
    // ... existing reducers
    feature: featureReducer,
  },
});
```

See [wallet-state-management.md](wallet-state-management.md) for Redux patterns.

## Step 2: Add RPC Handler (optional)

If the stage relates to a rpc request, add to `src/services/rpcHandlers.ts`:

```tsx
getRpcFeature: async (param1: string, param2: number) => {
  if (!session || !client) {
    throw new Error('WalletConnect session not available');
  }

  const params: { network: string; param1: string; param2?: number } = {
    network: DEFAULT_NETWORK,
    param1,
  };

  // Add optional params only if provided
  if (param2 !== null) {
    params.param2 = param2;
  }

  const requestParams = {
    method: 'htr_featureMethod',
    params,
  };

  try {
    let result;
    if (dryRun) {
      result = null;
    } else {
      result = await client.request({
        topic: session.topic,
        chainId: HATHOR_TESTNET_CHAIN,
        request: requestParams,
      });
    }
    return { request: requestParams, response: result };
  } catch (error) {
    const errorWithRequest = error as { requestParams?: unknown };
    errorWithRequest.requestParams = requestParams;
    throw errorWithRequest;
  }
},
```

## Step 3: Create Card Component (optional)

If the stage relates to an RPC request, create `src/components/rpc/RpcFeatureCard.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import { ExplorerLink } from '../common/ExplorerLink';
import { DEFAULT_NETWORK, type NetworkType } from '../../constants/network';

const safeStringify = (obj: unknown, space?: number): string => {
  return JSON.stringify(
    obj,
    (_, value) => (typeof value === 'bigint' ? value.toString() : value),
    space
  );
};

export interface RpcFeatureCardProps {
  onExecute: () => Promise<{ request: unknown; response: unknown }>;
  disabled?: boolean;
  isDryRun?: boolean;
  network?: NetworkType;
  initialRequest?: { method: string; params: unknown } | null;
  initialResponse?: unknown | null;
  initialError?: string | null;
}

export const RpcFeatureCard: React.FC<RpcFeatureCardProps> = ({
  onExecute,
  disabled = false,
  isDryRun = false,
  network = DEFAULT_NETWORK,
  initialRequest = null,
  initialResponse = null,
  initialError = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: unknown } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(false);
  const { showToast } = useToast();

  // Load persisted data from Redux
  useEffect(() => {
    if (initialRequest) { setRequestInfo(initialRequest); setRequestExpanded(true); }
    if (initialResponse) { setResult(initialResponse); setExpanded(true); }
    if (initialError) { setError(initialError); setExpanded(true); }
  }, [initialRequest, initialResponse, initialError]);

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRequestInfo(null);

    try {
      const { request, response } = await onExecute();
      setRequestInfo(request as { method: string; params: unknown });
      setResult(response);
      setRequestExpanded(true);
      setExpanded(true);
      showToast(isDryRun ? 'Request generated' : 'Success', 'success');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setExpanded(true);
      if (err && typeof err === 'object' && 'requestParams' in err) {
        setRequestInfo(err.requestParams as { method: string; params: unknown });
        setRequestExpanded(true);
      }
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Render request/response sections...
  // Use ExplorerLink for tx_id fields
  // <ExplorerLink hash={txId} network={network} />
};
```

**Key patterns**:
- Use `safeStringify` for BigInt values
- Use `ExplorerLink` for transaction IDs
- Collapsible request/response sections with `CopyButton`

See [design-system.md](design-system.md) for UI component classes.
See [new-transaction.handling.md](new-transaction-handling.md) for details on how to exhibit transaction ids.

## Step 4: Create Stage Component

Create `src/components/stages/FeatureStage.tsx`:

```tsx
import React, { useMemo, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  setFeatureRequest,
  setFeatureResponse,
  setFeatureError,
  setFeatureFormData,
  clearFeatureData,
} from '../../store/slices/featureSlice';
import { selectIsWalletConnectConnected } from '../../store/slices/walletConnectSlice';
import { RpcFeatureCard } from '../rpc/RpcFeatureCard';
import { createRpcHandlers } from '../../services/rpcHandlers';
import { useWalletStore } from '../../hooks/useWalletStore';
import Select from '../common/Select';

export const FeatureStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();

  // Redux state
  const walletConnect = useSelector((state: RootState) => state.walletConnect);
  const isDryRun = useSelector((state: RootState) => state.rpc.isDryRun);
  const isConnected = useSelector(selectIsWalletConnectConnected);
  const featureData = useSelector((state: RootState) => state.feature);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);

  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  // Local form state
  const [fieldValue, setFieldValue] = useState<string>(featureData.fieldName);

  // Save form state to Redux
  useEffect(() => {
    dispatch(setFeatureFormData({ fieldName: fieldValue }));
  }, [fieldValue, dispatch]);

  // Create RPC handlers
  const rpcHandlers = useMemo(() => {
    if (!walletConnect.client || !walletConnect.session) return null;
    return createRpcHandlers({
      client: walletConnect.client,
      session: walletConnect.session,
      dryRun: isDryRun,
    });
  }, [walletConnect.client, walletConnect.session, isDryRun]);

  // Execute handler with Redux storage
  const handleExecute = async () => {
    if (!rpcHandlers) throw new Error('RPC handlers not initialized');

    // Clear previous data before new request
    dispatch(clearFeatureData());

    const startTime = Date.now();
    try {
      const { request, response } = await rpcHandlers.getRpcFeature(fieldValue);
      const duration = Date.now() - startTime;

      dispatch(setFeatureRequest({ method: request.method, params: request.params, isDryRun }));
      dispatch(setFeatureResponse({ response, duration }));

      return { request, response };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setFeatureError({ error: errorMessage, duration }));
      throw error;
    }
  };

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Feature Name RPC</h1>
      <p className="text-muted mb-7.5">Description of what this stage tests</p>

      {/* Connection warning */}
      {!isConnected && (
        <div className="card-primary mb-7.5 bg-blue-50 border border-info">
          {/* Info icon + "Not Connected" message */}
        </div>
      )}

      {/* Form inputs */}
      {isConnected && rpcHandlers && testWallet && (
        <>
          <div className="card-primary mb-7.5">
            <label className="block mb-1.5 font-bold">Field:</label>
            <Select value={fieldValue} onChange={(e) => setFieldValue(e.target.value)}>
              <option value="opt1">Option 1</option>
              <option value="opt2">Option 2</option>
            </Select>
          </div>

          <RpcFeatureCard
            onExecute={handleExecute}
            disabled={false}
            isDryRun={isDryRun}
            network={testWallet.metadata.network}
            initialRequest={featureData.request}
            initialResponse={featureData.rawResponse}
            initialError={featureData.error}
          />
        </>
      )}

      {/* Duration info */}
      {featureData.timestamp && (
        <div className="card-primary mt-7.5 bg-green-50 border border-success">
          {/* Success icon + duration display */}
        </div>
      )}
    </div>
  );
};
```

**Key patterns**:
- Clear previous data with `clearFeatureData()` before new requests
- Save form state to Redux for persistence across navigation
- Use `Select` component for dropdowns (includes chevron icon)
- Pass `network` prop to RPC card for explorer links

## Step 5: Register the Stage

### 5.1 Add to StageId type

In `src/types/stage.ts`:
```tsx
export type StageId = '...' | 'rpc-feature' | '...';
```

### 5.2 Add to STAGE_GROUPS

In `src/types/stage.ts`, add to appropriate group:
```tsx
{
  id: 'rpc-feature',
  title: 'Feature Name',
  description: 'Description of the feature',
  icon: '📦',  // Choose appropriate emoji
},
```

### 5.3 Add to StageContent routing

In `src/components/StageContent.tsx`:
```tsx
import { FeatureStage } from './stages/FeatureStage';

// In the render:
{currentStage === 'rpc-feature' && <FeatureStage />}
```

## Common Components

### Select Dropdown
```tsx
import Select from '../common/Select';

<Select value={value} onChange={(e) => setValue(e.target.value)}>
  <option value="opt1">Option 1</option>
</Select>
```

### Explorer Link (for tx_id fields)
```tsx
import { ExplorerLink } from '../common/ExplorerLink';

<ExplorerLink hash={txId} network={network} />
<ExplorerLink hash={tokenUid} specificPage="token_detail" network={network} />
<ExplorerLink hash={ncId} specificPage="nc_detail" network={network} />
```

### Copy Button
```tsx
import CopyButton from '../common/CopyButton';

<CopyButton text={textToCopy} label="Copy" />
```

## Checklist

- [ ] Redux slice created and registered in store
- [ ] RPC handler added to `rpcHandlers.ts`
- [ ] RPC card component created
- [ ] Stage component created
- [ ] StageId type updated
- [ ] Stage added to STAGE_GROUPS
- [ ] Stage routing added to StageContent
- [ ] Build passes: `bun run build`

## Related Docs

- [architecture.md](architecture.md) - Project structure
- [development-practices.md](development-practices.md) - Code quality standards
- [design-system.md](design-system.md) - UI components and styling
- [wallet-state-management.md](wallet-state-management.md) - Redux patterns
- [bigint-handling.md](bigint-handling.md) - Handling BigInt values
