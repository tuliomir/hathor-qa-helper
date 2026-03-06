# Deploying to Cloudflare Pages

This project deploys to Cloudflare Pages as a static site. The deploy uses `wrangler pages deploy` to upload the `dist/` folder.

**Live URL:** https://hathor-qa-helper.pages.dev

## Authentication

Wrangler supports two auth methods. OAuth is simpler for local development; API tokens are required for CI/CD.

### Option A: OAuth Login (recommended for humans)

Run once to authenticate — the session is cached on disk and auto-refreshes:

```bash
bunx wrangler login
```

This opens a browser for Cloudflare OAuth. After granting access, the token is stored at `~/.config/.wrangler/config/default.toml`.

Verify with:
```bash
bunx wrangler whoami
```

Once authenticated, deploy with:
```bash
bun run upload
```

### Option B: API Token (required for CI/CD and agents)

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create a token with **Cloudflare Pages: Edit** permission
3. Set it as an environment variable:

```bash
# One-time in terminal:
CLOUDFLARE_API_TOKEN=<your-token> bun run upload

# Or save in .env (gitignored):
echo 'CLOUDFLARE_API_TOKEN=<your-token>' >> .env
bun run upload
```

## Deploy Commands

| Command | What it does |
|---|---|
| `bun run build` | TypeScript check + Vite production build → `dist/` |
| `bun run upload` | Build + deploy to Cloudflare Pages |
| `bun run deploy` | Deploy only (assumes `dist/` already exists) |

## For Claude Code / Non-Interactive Agents

Wrangler detects non-interactive environments (no TTY) and refuses OAuth login, requiring `CLOUDFLARE_API_TOKEN` instead. If you're an agent:

1. **Check if already authenticated:** `bunx wrangler whoami`
2. **If not authenticated:** Ask the user to either:
   - Run `bunx wrangler login` in their terminal (not through you), OR
   - Provide a `CLOUDFLARE_API_TOKEN` and set it in `.env`
3. **Once authenticated:** Run `bun run upload` to build and deploy

If wrangler login was done by the user in their terminal, the cached OAuth token at `~/.config/.wrangler/config/default.toml` will be available to agents too — it's a machine-level credential, not tied to the TTY session.

## Troubleshooting

- **"In a non-interactive environment, set CLOUDFLARE_API_TOKEN"** — You're running from a non-TTY context (e.g., Claude Code). Either have the user `wrangler login` first, or use an API token.
- **"You are not authenticated"** — Run `bunx wrangler login` or set `CLOUDFLARE_API_TOKEN`.
- **Build fails with buffer/polyfill errors** — See [buffer-polyfill.md](./buffer-polyfill.md).
