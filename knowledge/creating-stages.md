# Creating New Stages

Guide for adding new QA stages. There are two paths: **WalletConnect RPC stages** and **MetaMask Snap stages**.

## WalletConnect RPC Stage

A complete RPC stage requires:
1. **Redux Slice** — State for request/response/form data
2. **RPC Handler** — Function in `services/rpcHandlers.ts`
3. **RPC Card Component** — UI in `components/rpc/`
4. **Stage Component** — Main UI in `components/stages/`
5. **Stage Registration** — Types + routing

### Step 1: Create Redux Slice

Create `src/store/slices/{featureName}Slice.ts` with standard shape:

```typescript
interface FeatureState {
  request: { method: string; params: unknown } | null;
  response: FeatureResponse | null;
  rawResponse: unknown | null;
  error: string | null;
  timestamp: number | null;
  duration: number | null;
  isDryRun: boolean;
  // Form state fields for persistence across navigation
}
```

Standard actions: `setRequest`, `setResponse`, `setError`, `setFormData`, `clearData`.

Register in `src/store/index.ts`.

### Step 2: Add RPC Handler

In `src/services/rpcHandlers.ts`, add a method that returns `{ request, response }`:

```typescript
getFeature: async (param: string) => {
  const requestParams = { method: 'htr_featureMethod', params: { network: DEFAULT_NETWORK, param } };
  const result = dryRun ? null : await client.request({ topic: session.topic, chainId, request: requestParams });
  return { request: requestParams, response: result };
},
```

### Step 3: Create RPC Card Component

Create `src/components/rpc/RpcFeatureCard.tsx`. Key patterns:
- Use `safeStringify` for BigInt values
- Use `ExplorerLink` for transaction IDs, `CopyButton` for copyable text
- Collapsible request/response sections
- Load persisted data from Redux via props (`initialRequest`, `initialResponse`, `initialError`)

### Step 4: Create Stage Component

Create `src/components/stages/FeatureStage.tsx`. Key patterns:
- Clear previous data with `clearData()` before new requests
- Save form state to Redux for persistence across navigation
- Check WalletConnect connection before rendering form
- Pass `network` prop to RPC card for explorer links

### Step 5: Register the Stage

1. Add `StageId` to `src/types/stage.ts`
2. Add to the appropriate group in `STAGE_GROUPS` (same file)
3. Add slug mappings in `src/config/stageRoutes.ts` (both `GROUP_SLUG_MAP` and `STAGE_SLUG_MAP`)
4. Add rendering case in `src/components/StageContent.tsx`

---

## MetaMask Snap Stage

Snap stages are simpler — they use the shared `useSnapMethod` hook.

### Step 1: Add Handler

In `src/services/snapHandlers.ts`, add a method:

```typescript
featureMethod: (param: string) => invoke('htr_featureMethod', { param }),
```

### Step 2: Create Stage Component

Create `src/components/stages/SnapFeatureStage.tsx`:

```typescript
export const SnapFeatureStage: React.FC = () => {
  const { isSnapConnected, isDryRun, methodData, execute } = useSnapMethod('featureMethod');
  const snapAddress = useSelector(selectSnapAddress);

  const handleExecute = () => execute((h) => h.featureMethod(param));

  // Render form + SnapResponseDisplay for results
};
```

Key differences from RPC stages:
- **No separate Redux slice needed** — `snapMethodsSlice` stores all snap method results generically
- **No RPC Card component needed** — use `SnapResponseDisplay` or `SnapRequestPreview`
- **`useSnapMethod` provides everything** — connection check, dry-run, execute, handlers, methodData

### Step 3: Register the Stage

Same as RPC: update `types/stage.ts`, `config/stageRoutes.ts`, and `StageContent.tsx`.

---

## Common Components

| Component | Import | Usage |
|-----------|--------|-------|
| `Select` | `common/Select` | Dropdown with chevron icon |
| `ExplorerLink` | `common/ExplorerLink` | Link to Hathor explorer (`hash`, `specificPage`, `network`) |
| `CopyButton` | `common/CopyButton` | Copy text to clipboard |
| `TxStatus` | `common/TxStatus` | Transaction confirmation status badge |
| `DryRunCheckbox` | `common/DryRunCheckbox` | Toggle dry-run mode |
| `TimelockPicker` | `common/TimelockPicker` | Date picker for timelocked transactions |

## Checklist

- [ ] Handler added (rpcHandlers.ts or snapHandlers.ts)
- [ ] Redux slice created and registered (RPC only)
- [ ] Card component created (RPC only)
- [ ] Stage component created
- [ ] StageId added to `types/stage.ts`
- [ ] Stage added to correct group in `STAGE_GROUPS`
- [ ] Slugs added to `config/stageRoutes.ts`
- [ ] Rendering added to `StageContent.tsx`
- [ ] Build passes: `bun run build`
