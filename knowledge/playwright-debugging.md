# Playwright Debugging

Use Playwright MCP tools for interactive debugging and testing.

## Quick Start

```bash
# Start dev server in background
bun run dev:restart

# Stop dev server
bun run dev:kill
```

## Common Workflow

1. **Start server**: `bun run dev:restart` (kills existing, cleans cache, starts fresh)
2. **Navigate**: `browser_navigate` to `http://localhost:5173`
3. **Interact**: Use `browser_click`, `browser_type`, `browser_snapshot`
4. **Check errors**: Console events appear in tool results
5. **Close**: `browser_close`
6. **Stop server**: `bun run dev:kill`

## Key Tools

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Go to URL |
| `browser_snapshot` | Get page accessibility tree (preferred over screenshot) |
| `browser_click` | Click element by ref |
| `browser_type` | Type into input |
| `browser_wait_for` | Wait for text or time |
| `browser_console_messages` | Get all console output |
| `browser_close` | Close browser |

## Reading Console Errors

Console events appear in the `### Events` section of tool results:
- `[ERROR]` - JavaScript errors (look for "Maximum update depth exceeded" for render loops)
- `[WARNING]` - Warnings (selector issues, deprecations)
- `[LOG]` - Debug logs

## Example: Debug Render Loop

```
1. bun run dev:restart
2. browser_navigate → http://localhost:5173
3. browser_click → Navigate to problem page
4. Check Events for "Maximum update depth exceeded"
5. browser_close
6. bun run dev:kill
```

## Package Scripts

- `dev:bg` - Start vite in background
- `dev:kill` - Kill server on ports 5173/5174
- `dev:restart` - Full restart with cache clean + 3s wait
- `dev:clean` - Clear vite cache only
