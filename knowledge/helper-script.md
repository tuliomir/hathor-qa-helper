# Starting and stopping QA Helper (`scripts/qa-helper.sh`)

One command brings up a usable QA Helper: the client dev server, the local QA server, and an HTTPS URL on the tailnet. It's built to be driven by a button as well as from a terminal. Ruffus Desktop's laptop agent is the intended caller.

```bash
scripts/qa-helper.sh up        # start, wait until both answer, print status
scripts/qa-helper.sh down      # stop what this script started, remove the tailnet URL
scripts/qa-helper.sh status    # probe what is running
scripts/qa-helper.sh logs [client|server]   # follow the journal
```

From the root, `bun run helper:up`, `helper:down` and `helper:status` do the same.

## How it runs

- **Transient units.** The client and server run as transient systemd **user** units, `qa-helper-client` and `qa-helper-server` (`systemd-run --user --collect`).
  - They aren't children of the caller, so they survive the terminal or agent that started them.
  - Logs go to the journal: `journalctl --user -u qa-helper-client`.
  - This mirrors how Ruffus runs Ollama. Its laptop agent is sandboxed (`ProtectHome=read-only`), and a child process would die on every agent restart.
- **Status comes from probing:** `GET :5173/` for the client and `GET :5180/health` for the server. Bookkeeping isn't trusted. `ours` says whether the running process is this script's unit.
- **No duplicates.** `up` is idempotent. If a port is held by something this script didn't start, `up` refuses with exit code 1 rather than starting a second copy.
- **Tailnet URL.** It's published with `tailscale serve` on HTTPS port **8443** (`https://<machine>.<tailnet>.ts.net:8443/`). It stays off 443 so `down` can never remove another service's serve config. The script also passes that origin to:
  - the QA server, as `QA_SERVER_EXTRA_ORIGINS`
  - Vite, as `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`

  Set `QA_HELPER_TAILNET=0` for a local-only start.
- **Dependencies.** If `node_modules` is missing, `up` runs `bun install` first. This is the only time the script writes to the repo.

## Machine contract (`--json`)

`up --json`, `down --json` and `status --json` print one JSON line, the state after the command:

```json
{
  "running": true,
  "url": "https://<machine>.<tailnet>.ts.net:8443/",
  "client": { "up": true, "ours": true, "port": 5173 },
  "server": { "up": true, "ours": true, "port": 5180 },
  "tailnet": { "serving": true, "url": "https://<machine>.<tailnet>.ts.net:8443/" },
  "repo": "/path/to/qa-helper"
}
```

- `running` is true only when both client and server answer. `url` is the one to open: the tailnet URL when it's serving, otherwise `http://localhost:5173/`.
- Exit code 0 means success. On failure the exit code is non-zero and stderr has one line to show the user, e.g. "QA server not ready after 60s; see: journalctl --user -u qa-helper-server -n 50".
- `up` waits up to 60 s for both services. A warm start takes about 1–2 s.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `QA_HELPER_DIR` | the repo containing the script | Which checkout to run, e.g. a worktree on a feature branch |
| `QA_HELPER_TAILNET` | `1` | `0` skips `tailscale serve` |
| `QA_HELPER_TS_PORT` | `8443` | Tailnet HTTPS port |

## Security

Anyone who can open the tailnet URL can start wallets on the QA server, which then holds their seeds in memory. Keep it to your own tailnet and to test wallets. `down` removes the URL and stops the server, which stops its wallets.
