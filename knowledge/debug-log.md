# Debug log

The QA Helper records what happens in each browser tab and sends it to the local QA server, so an agent asked "help me with this run" can read what the tester did instead of asking for screenshots.

It runs only under the Vite dev server (the helper, `bun run helper:up`, or `bun dev`), where the QA server is. The production build records nothing.

## Reading it

From the machine running the helper:

```sh
# Events after seq 0 (all kept in memory, up to 5000), oldest first
curl -s 'http://127.0.0.1:5180/debug-log?since=0&limit=200'
# Only new ones: pass the `last` from the previous answer
curl -s 'http://127.0.0.1:5180/debug-log?since=1234'
# One tab only
curl -s 'http://127.0.0.1:5180/debug-log?tab=fhwp77'
# Where each tab is now: flow run, networks, RPC session, test and funding wallets
curl -s 'http://127.0.0.1:5180/debug-state'
```

Every event is also appended to a JSONL file that outlives server restarts: `$XDG_STATE_HOME/qa-helper/debug-log.jsonl` (`~/.local/state/qa-helper/debug-log.jsonl`), or `QA_DEBUG_LOG` when set. Past 20 MB it is rotated to `.1`. `GET /debug-log` names the file and reports `writeError` if writing fails. `tail -f` it to watch live.

Start with `/debug-state` for a question about the current run; read the log for how it got there.

## Events

Each event has `seq` (server order), `at` (browser time), `tab` (kept across reloads of a tab), `page` (the app path), `kind` and `type`:

| `kind` | `type` | `data` |
|---|---|---|
| `action` | Redux action type | The payload (for a rejected thunk: payload, error, meta) |
| `route` | The new path | none |
| `error` | `console.error`, `window.error` or `unhandledrejection` | The arguments or the error |

Actions recorded (`isRecordedAction` in `src/services/debugLog.ts`):

- every `flowRun/*`, `walletConnect/*`, `network/*` and `walletSelection/*` action;
- RPC requests, answers and errors from any method slice (`*/setRequest`, `*/setResponse`, `*/setError`);
- `walletStore`: `addWallet`, `removeWallet`, `updateNetwork`, `updateWalletStatus`, and the `startWallet` and `stopWallet` thunks;
- `rpc` dry-run changes, and the QA server's session and signer changes.

Left out as noise: balance, token and wallet-event updates, the QA server's session polling, toasts, forms. `walletConnect/initialize/fulfilled` is recorded without its payload (the whole client). Widen the lists when a question needs more.

## Secrets

`sanitize` (`packages/shared/src/debugLog.ts`) runs in the tab before sending and again on the server. It replaces with `[redacted]` any field named like a seed, words, mnemonic, PIN, password, passphrase, private key or secret, and any string that looks like a 12 to 24 word mnemonic. It also turns bigints into strings and cuts long strings (2000 chars), arrays (50) and deep nesting.

The QA server's own request lines still print only method, path and status: wallet bodies carry seeds.

## Design notes

- One log on the server, fed by every tab and device on the helper, instead of one per tab: nothing is recorded twice and two devices stay apart by `tab`.
- The client batches every 1.5 s, keeps up to 1000 events while the server is down, and sends what is left when the tab closes. A failed send is never logged (it would feed itself).
- The state snapshot (`src/store/debugSnapshot.ts`) is sent a second after a recorded action.
