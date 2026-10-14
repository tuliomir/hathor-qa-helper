import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const QA_SERVER_TARGET = 'http://127.0.0.1:5180';

/**
 * Answers `/qa-server/health` itself: 204 when the QA server is not running.
 * Through the plain proxy that case is a 500, which the browser logs as a
 * console error on every poll of the helper server pill.
 */
function qaServerHealth(): Plugin {
  return {
    name: 'qa-server-health',
    configureServer(server) {
      server.middlewares.use('/qa-server/health', async (_req, res) => {
        try {
          const upstream = await fetch(`${QA_SERVER_TARGET}/health`, { signal: AbortSignal.timeout(3000) });
          res.statusCode = upstream.status;
          res.setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json');
          res.end(await upstream.text());
        } catch {
          res.statusCode = 204;
          res.setHeader('x-qa-server', 'unreachable');
          res.end();
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    qaServerHealth(),
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Don't include 'buffer' here — the plugin's shim has __esModule + default=Buffer
      // which breaks CJS interop in rolldown-vite (wallet-lib's _interopRequireDefault
      // accesses .default.Buffer, but .default is the constructor, not the module).
      // The real `buffer` npm package (already in dependencies) has proper CJS exports.
      // globals.Buffer still injects the global Buffer via a separate banner import.
      include: ['crypto', 'stream', 'util', 'events', 'path'],
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      // Point 'buffer' to the real npm package so rolldown-vite doesn't externalize it.
      // Without this, removing buffer from the polyfill include list causes rolldown to
      // treat it as a Node.js built-in and externalize it for browser compatibility.
      buffer: 'buffer/',
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    proxy: {
      '/hathor-node/testnet': {
        target: 'https://node1.testnet.hathor.network',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/hathor-node\/testnet/, ''),
      },
      '/hathor-node/mainnet': {
        target: 'https://node1.mainnet.hathor.network',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/hathor-node\/mainnet/, ''),
      },
      '/hathor-node/shielded': {
        target: 'https://node1.shielded-outputs.testnet.hathor.network',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/hathor-node\/shielded/, ''),
      },
      // Local QA server (apps/server). It strips the /qa-server prefix itself.
      '/qa-server': {
        target: QA_SERVER_TARGET,
        changeOrigin: true,
      },
      '/swap-tokens': {
        target: 'https://wallet.swap.allowed-tokens.hathor.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/swap-tokens/, '/'),
      },
    },
  },
  optimizeDeps: {
    // WalletConnect packages were previously excluded to avoid SES lockdown
    // conflicts, but this caused CJS-to-ESM interop failures (missing named
    // exports like toMiliseconds, isReactNative, pino). The SES issue is now
    // handled by dynamically importing @walletconnect/sign-client in
    // walletConnectClient.ts, so pre-bundling is safe.
    //
    // ct-crypto-wasm loads its .wasm via `new URL(..., import.meta.url)`.
    // Pre-bundling moves the JS into .vite/deps and breaks that relative
    // URL, so it must be served as-is. Its CommonJS dependency
    // ct-crypto-provider then has to be pre-bundled explicitly, or the
    // browser gets raw CJS and the named import AbstractShieldedProvider
    // fails at runtime.
    exclude: ['@hathor/ct-crypto-wasm'],
    include: ['@hathor/ct-crypto-wasm > @hathor/ct-crypto-provider'],
  },
  build: {
    // Disable modulepreload to prevent WalletConnect from loading before dynamic import
    // This is crucial to avoid SES lockdown conflicts with polyfills
    modulePreload: false,
  },
});
