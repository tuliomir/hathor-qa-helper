import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for specific globals and modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Explicitly include Node.js module polyfills required by wallet-lib
      include: ['crypto', 'stream', 'util', 'events', 'path'],
      // Make sure to polyfill the buffer module
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: [
      // Use our custom buffer shim instead of the polyfill directly
      // Using find/replacement for exact matching
      {
        find: /^buffer$/,
        replacement: path.resolve(__dirname, './src/polyfills/buffer-shim.ts'),
      },
    ],
  },
  define: {
    global: 'globalThis',
  },
})
