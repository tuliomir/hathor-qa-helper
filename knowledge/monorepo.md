# Monorepo layout

QA Helper is a Bun-workspaces monorepo. It became one when Shielded Outputs arrived. Browsers can verify shielded transactions but cannot create them, because the only browser crypto provider, `@hathor/ct-crypto-wasm`, is verifier-only. So the shielded sends live in a local server that uses the native `@hathor/ct-crypto-node` provider.

```
apps/
├── client/    # @qa-helper/client: the React/Vite UI (was the repo root)
└── server/    # @qa-helper/server: local Bun HTTP server, 127.0.0.1:5180
packages/
└── shared/    # @qa-helper/shared: network registry + server API contract
knowledge/     # Team docs (paths inside are relative to apps/client unless stated)
```

## Rules

- Install and run scripts from the root. Root scripts delegate with `bun --filter`. Per-workspace scripts also work from inside each workspace.
- `packages/shared` ships TypeScript source with no build step. Vite and Bun both import it directly via the `exports` map (`@qa-helper/shared/networks`, `@qa-helper/shared/serverApi`).
- Anything both apps must agree on belongs in `packages/shared`: network URLs, the HTTP contract, amount encoding. Amounts cross the wire as decimal strings.
- The `vite` → `rolldown-vite` resolution lives in the root `package.json`, because workspace `resolutions` are ignored.
- The Prettier config is at the root. The ESLint config is per app.

## Deployment

- **Client:** unchanged. Cloudflare Pages (or Firebase) serves `apps/client/dist`. Deploy with `bun run upload` from the root.
- **Server:** local only for now. The client works without it. Only the shielded-sending stages need it, and they show its status.
- **Planned: hosting the server on Cloudflare.** Not done yet.
  - The blocker is that Workers can't load NAPI addons, so `@hathor/ct-crypto-node` won't run there.
  - The options are a container-based deployment (Cloudflare Containers) or a future WASM prover build of the crypto package.
  - Hosting it also means adding authentication. The server holds wallet seeds, and today it trusts anything on localhost.
