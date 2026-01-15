/**
 * Buffer polyfill shim
 *
 * The wallet-lib uses: import buffer from 'buffer'; buffer.Buffer.from()
 * The nodePolyfills plugin provides a global Buffer, but not as default.Buffer
 * This shim wraps the global Buffer to match wallet-lib's expected import pattern.
 */

// Get the Buffer from globalThis (provided by the nodePolyfills plugin)
// Using globalThis instead of global for better browser compatibility
const BufferGlobal = (globalThis as { Buffer: BufferConstructor }).Buffer;

// Named export (for imports like: import { Buffer } from 'buffer')
export const Buffer = BufferGlobal;

// Default export with Buffer property (for imports like: import buffer from 'buffer'; buffer.Buffer.from())
export default {
  Buffer: BufferGlobal,
};
