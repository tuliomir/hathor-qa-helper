# Buffer Polyfill in rolldown-vite

This document tracks the Buffer polyfill configuration, the problems we've encountered, and the rationale behind each decision. This is a recurring pain point because `@hathor/wallet-lib` is a CJS library that relies on Node.js `buffer`, and we're running in a browser context via Vite.

## Stack

| Component | Version | Role |
|---|---|---|
| `vite` (aliased) | `rolldown-vite@7.1.14` | Bundler (Rollup replacement) |
| `vite-plugin-node-polyfills` | `^0.24.0` | Injects Node.js polyfills for browser |
| `buffer` (npm) | `^6.0.3` | Real Buffer implementation for browsers |
| `@hathor/wallet-lib` | `2.9.1` | CJS library that does `require('buffer').Buffer` |

## The Two Concerns

There are **two separate things** the buffer setup must provide:

1. **Global `Buffer`** — `globalThis.Buffer` must exist for code that uses `Buffer` as a global (like `Buffer.from(...)` without importing).
2. **Module resolution** — `require('buffer')` or `import 'buffer'` must return an object with a `.Buffer` property, because CJS libraries do `require('buffer').Buffer`.

These are independent. The plugin handles them through different mechanisms:
- Global: injected via an esbuild banner (`import __buffer_polyfill from '...shim'; globalThis.Buffer = globalThis.Buffer || __buffer_polyfill`)
- Module: resolved via the `resolve.alias` map during pre-bundling

## Problem: Plugin Shim Breaks CJS Interop (March 2025)

### Symptom

Clicking "Send from Fund Wallet" on the Address Validation page crashed with:
```
TypeError: Cannot read properties of undefined (reading 'from')
    at intToBytes (helpers.js)
    at P2PKH.createScript
    ...
```

### Root Cause

`@hathor/wallet-lib/lib/utils/buffer.js` does:
```js
var _buffer = _interopRequireDefault(require("buffer"));
// later:
_buffer.default.Buffer.from(arr)  // <-- crash here
```

The `_interopRequireDefault` function:
```js
function _interopRequireDefault(e) {
  return e && e.__esModule ? e : { default: e };
}
```

The plugin's shim (`vite-plugin-node-polyfills/shims/buffer/dist/index.cjs`) sets:
```js
exports.__esModule = true;
exports.default = Buffer;        // the Buffer CONSTRUCTOR
exports.Buffer = Buffer;         // also the constructor
```

So when `_interopRequireDefault` sees `__esModule: true`, it returns the module as-is. Then:
- `_buffer.default` = `Buffer` (the constructor function)
- `_buffer.default.Buffer` = `Buffer.Buffer` = **`undefined`** → crash

The real `buffer` npm package does NOT set `__esModule` or `default`. It just does:
```js
exports.Buffer = Buffer;
```
So `_interopRequireDefault` wraps it as `{ default: { Buffer, SlowBuffer, ... } }`, and `_buffer.default.Buffer` correctly resolves to the `Buffer` constructor.

### Why This Worked Before

With standard Vite/Rollup (before switching to rolldown-vite), the CJS-to-ESM interop handled this correctly — `require('buffer')` returned an object where `.Buffer` was accessible. rolldown-vite's interop handles the `__esModule` flag differently, exposing the bug in the shim's export structure.

### Approaches Tried and Why They Failed

#### 1. `overrides: { buffer: 'buffer/' }` in plugin config
**Failed.** The plugin's internal `y()` function checks `globals.Buffer` *before* `overrides`, so when `globals.Buffer: true`, the buffer override is never reached (line 36-43 of the plugin source).

#### 2. `resolve.alias: { buffer: 'buffer/' }` alone (without removing from include)
**Failed.** The plugin registers its own alias via `resolve.alias` in its `config()` hook, which merges with (and can override) user-provided aliases. The pre-bundled deps still used the shim.

#### 3. Removing `buffer` from `include` without `resolve.alias`
**Failed.** rolldown-vite treated `buffer` as a Node.js built-in and externalized it: `Module "buffer" has been externalized for browser compatibility`. The module became an empty stub at runtime.

### Working Solution

Two changes in `vite.config.ts`:

1. **Remove `buffer` from the plugin's `include` list** — prevents the plugin from aliasing `buffer` to its broken shim during pre-bundling.
2. **Add `resolve.alias: { buffer: 'buffer/' }`** — tells rolldown-vite to resolve `buffer` to the real npm package instead of externalizing it as a Node.js built-in. The trailing `/` is important — it forces resolution to the npm package directory.

```ts
nodePolyfills({
  globals: { Buffer: true, global: true, process: true },
  include: ['crypto', 'stream', 'util', 'events', 'path'],  // NO 'buffer'
  protocolImports: true,
}),
// ...
resolve: {
  alias: { buffer: 'buffer/' },
},
```

The `globals.Buffer: true` still works because global injection is a **separate mechanism** (banner import) that doesn't depend on the module alias map.

## Cloudflare Deploy Considerations

Cloudflare Workers/Pages have their own runtime constraints:

- **No Node.js built-ins** unless `nodejs_compat` is enabled in `wrangler.toml`
- The `buffer` npm package (v6) is a pure JS implementation that works in any browser-like environment, including Cloudflare
- If deploying to Cloudflare and seeing `buffer` errors, verify:
  1. The production build (`vite build`) bundles the real `buffer` package (check `dist/` output for buffer code)
  2. The polyfill plugin's build-time inject still references the shim for global injection — this should be fine since it only sets `globalThis.Buffer`
  3. If `buffer` is being externalized in the build, the `resolve.alias` may need to be path-absolute: `buffer: path.resolve(__dirname, 'node_modules/buffer/')` — but with the current include/alias setup this shouldn't be needed

## Key Files

| File | Role |
|---|---|
| `vite.config.ts` | Buffer alias and polyfill config |
| `package.json` | `buffer: ^6.0.3` in dependencies, `vite: npm:rolldown-vite@7.1.14` |
| `node_modules/vite-plugin-node-polyfills/dist/index.js` | Plugin source — see `y()` function for alias priority logic |
| `node_modules/vite-plugin-node-polyfills/shims/buffer/dist/index.cjs` | The problematic shim with `__esModule + default=Buffer` |
| `node_modules/buffer/index.js` | The real buffer package with proper CJS exports |
| `node_modules/@hathor/wallet-lib/lib/utils/buffer.js` | wallet-lib's buffer usage via `_interopRequireDefault` |

## Debugging Tips

If buffer issues resurface:

1. **Check the pre-bundled deps** — look in `node_modules/.vite/deps/` for the file containing `require_dist` or `intToBytes`. Search for `__esModule` and `exports.default` near the buffer section.
2. **Check console warnings** — `Module "buffer" has been externalized` means the alias isn't working.
3. **Kill dev server + clear cache** — `rm -rf node_modules/.vite && restart dev server`. rolldown-vite's in-memory cache survives HMR; only a full restart picks up config changes.
4. **Test in browser console** — run `Buffer.from([1,2,3])` to verify the global works, but the module-level issue won't show there.
