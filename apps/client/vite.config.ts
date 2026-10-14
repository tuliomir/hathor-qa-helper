import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
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
  },
  build: {
    // Disable modulepreload to prevent WalletConnect from loading before dynamic import
    // This is crucial to avoid SES lockdown conflicts with polyfills
    modulePreload: false,
  },
})
