/**
 * Local implementation of token configuration string generation.
 *
 * This replaces `tokensUtils.getConfigurationString` from @hathor/wallet-lib
 * because the library's internal CJS `require("buffer")` breaks under Vite's
 * ESM polyfill interop in production builds. Using direct ESM imports here
 * avoids the issue entirely.
 */
import { Buffer } from 'buffer';
import { createHash } from 'crypto';

function getChecksum(bytes: Buffer): Buffer {
  const hash1 = createHash('sha256').update(bytes).digest();
  const hash2 = createHash('sha256').update(hash1).digest();
  return hash2.slice(0, 4) as Buffer;
}

export function getConfigurationString(uid: string, name: string, symbol: string): string {
  const partialConfig = `${name}:${symbol}:${uid}`;
  const checksum = getChecksum(Buffer.from(partialConfig));
  return `[${partialConfig}:${checksum.toString('hex')}]`;
}
