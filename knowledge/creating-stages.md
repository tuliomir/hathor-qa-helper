# Creating new stages

Every stage has the same skeleton: `StageHeader`, then `PreconditionStrip`, then the content, usually one or more `MethodCard`s. The visual rules and components are in `design-system.md`; `bun run lint` fails on retired classes.

```tsx
<div className="flex max-w-stage flex-col gap-4">
  <StageHeader stageId="snap-get-xpub" description="…" method="htr_getXpub" />
  <PreconditionStrip requirements={[snapRequirement]} />
  <SnapMethodCard /* or RpcMethodCard, or MethodCard */>{/* inputs */}</SnapMethodCard>
</div>
```

- **`StageHeader`** reads title, description, family and group from the registry (`types/stage.ts`) and sets the tab title. Pass `method` for the method chip.
- **`PreconditionStrip`** takes `Requirement`s from the hooks in `hooks/useRequirements.ts`: `useRequireTestWallet()`, `useRequireTestAddress()`, `useRequireFundingWallet()`, `useRequireRpcSession()`, `useRequireSnap()`, `useRequireHelperServer()`, `useRequireServerSession(session)`, `useRequireNetwork(key)`, `useRequireCapability(level)`. Feed the same list to `firstUnmetReason()` for the card's `disabledReason`, so the button says why it is disabled while dry run stays available. Use `useRequireTestAddress()` when the stage only needs the test wallet's address 0 (RPC requests, sending to the test wallet); it also accepts address-only wallets. Read that address with `useTestWalletAddress0()`, not `instance.getAddressAtIndex(0)`. Keep `useRequireTestWallet()` for stages that sign with the test wallet or read its balances.
- **`MethodCard`** is Compose (your inputs + `ExecuteBar`) beside Inspect (the live request, then the response, dry-run, rejection or error). Give it a `liveRequest` built with `useMemo` from the inputs, so testers see the request change as they type.

Then register the stage (see the last section).

## WalletConnect RPC stage

Reference: `stages/BasicInfoStage.tsx` + `rpc/RpcConnectedNetworkCard.tsx` (small), `stages/SendTransactionStage.tsx` + `rpc/RpcSendTransactionCard.tsx` (full).

1. **Request builder.** A pure function in `utils/rpcCoreRequests.ts` (or `utils/nanoRpcRequests.ts`) that returns `{ method, params }`. Unit-test it in `tests/`. The card uses it for `liveRequest` and the stage passes it as the dry-run request.
2. **Handler.** A method in `services/rpcHandlers.ts` that returns `{ request, response }` and skips the call in dry run.
3. **Slice.** `store/slices/{feature}Slice.ts` with the shared `MethodSliceState` shape (`request`, `rawResponse`, `error`, `timestamp`, `duration`, `isDryRun`) and `setRequest` / `setResponse` / `setError` actions. Register it in `store/index.ts`. Store BigInt as strings.
4. **Card.** `rpc/Rpc{Feature}Card.tsx` renders `RpcMethodCard` (not `MethodCard`): it arms mainnet from the WalletConnect session's chain and adds "Edit raw". Put inputs in `Field` / `AddressInput` / `AmountInput`, and give a `renderResponse` for a formatted view (`ResponseFields`, `DataTable`, `Identifier`).
5. **Stage.** `useRpcStageCall(ACTIONS, { balanceTokens? })` gives `execute(call, dryRunRequest)` and `isDryRun`. Read the slice with `useSelector` and map it with `toMethodData()`.

```tsx
const rpcSession = useRequireRpcSession();
const call = useRpcStageCall(FEATURE_ACTIONS);
const data = useSelector((s: RootState) => s.feature);

<RpcFeatureCard
  onExecute={() => call.execute((h) => h.getFeature(param), buildFeatureRequest(param))}
  methodData={toMethodData(data)}
  isDryRun={call.isDryRun}
  disabledReason={firstUnmetReason([rpcSession])}
/>
```

Transactions: pass `getTxHash` to show a `TxIdDisplay` above the response, and `txExplorerPage="nc_detail"` when the hash is a new nano contract's ID.

## MetaMask Snap stage

Reference: `stages/SnapGetXpubStage.tsx` (small), `stages/SnapSendTransactionStage.tsx` (full).

1. **Handler.** A method in `services/snapHandlers.ts`: `featureMethod: (param) => invoke('htr_featureMethod', { param })`.
2. **Stage.** `useSnapMethod('featureMethod')` gives `isDryRun`, `methodData` and `execute`; results are stored generically in `snapMethodsSlice`, so there is no slice to write. Render `SnapMethodCard`: it detects MetaMask rejections, extracts tx hashes and arms mainnet from the snap's network. It forwards `inspectExtra`, `secondaryActions` and `txExplorerPage`.

```tsx
const { isDryRun, methodData, execute } = useSnapMethod('getXpub');
const snapRequirement = useRequireSnap();
const liveRequest = useMemo(() => ({ method: 'htr_getXpub', params: { network } }), [network]);

<SnapMethodCard
  title="Get xpub"
  liveRequest={liveRequest}
  methodData={methodData}
  isDryRun={isDryRun}
  onExecute={() => execute((h) => h.getXpub(network))}
  disabledReason={firstUnmetReason([snapRequirement])}
>
  {/* inputs */}
</SnapMethodCard>
```

## Server-backed stage (QA server)

Reference: the Shielded stages (`stages/Shielded*Stage.tsx`, `shielded-qa-stages.md`). Use this path when the browser can't do the work, for example shielded sends.

- Call the server only through `services/qaServerClient.ts`; add the route to the contract in `packages/shared/src/serverApi.ts` first.
- Preconditions: `useRequireHelperServer()` (reads the top bar's health poll; never poll again) and `useRequireServerSession(session)`. Show `QaServerDownCallout` (`shielded/QaServerParts.tsx`) when the server is down.
- Use plain `MethodCard`. Keep `methodData` in local state (or a slice) and build `liveRequest` as `{ method: 'POST /wallets/:id/send', params: request }`. Pass `isMainnet` from the session's network and `renderError` to show `QaServerErrorCallout`.
- Sessions and pickers come from `useServerSessions()` and `SessionPicker` / `ClientWalletPicker`.

## Register the stage

1. Add the `StageId` to `src/types/stage.ts`, and the stage (sentence-case `title`, one-line `description`, optional `methods`) to its group in `STAGE_GROUPS`. The group's `family` drives the nav and the breadcrumb.
2. Add the slug to `src/config/stageRoutes.ts` (URL `/tools/{groupSlug}/{stageSlug}`).
3. Add the component to `STAGE_COMPONENT_MAP` in `src/components/StageContent.tsx`.
4. Add an entry to `MAIN_QA_STAGES` in `e2e/helpers/stage-navigator.ts` (id, title, group and family titles, URL) so the smoke e2e (`e2e/smoke.spec.ts`) loads it.

## Checklist

- [ ] `StageHeader` first, `PreconditionStrip` second, `firstUnmetReason()` as the disabled reason
- [ ] `liveRequest` built from the inputs; dry run works without a session
- [ ] Request builders and other logic unit-tested in `tests/`
- [ ] No raw palette classes, emoji or hand-pasted SVG (`bun run lint` passes)
- [ ] Registered in `types/stage.ts`, `config/stageRoutes.ts`, `StageContent.tsx` and the smoke list
- [ ] Checked by eye at 1440px and 390px
- [ ] `bun run typecheck`, `bun run test`, `bun run build`
