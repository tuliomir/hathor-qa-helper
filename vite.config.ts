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
  optimizeDeps: {
    // Exclude WalletConnect packages from pre-bundling to avoid SES lockdown conflicts
    exclude: ['@walletconnect/sign-client', '@walletconnect/core', '@walletconnect/modal'],
  },
  build: {
    // Disable modulepreload to prevent WalletConnect from loading before dynamic import
    // This is crucial to avoid SES lockdown conflicts with polyfills
    modulePreload: false,
  },
})
