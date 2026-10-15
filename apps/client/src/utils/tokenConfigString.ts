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

export interface ParsedToken {
  uid: string;
  name?: string;
  symbol?: string;
}

export type ParseTokenResult = { ok: true; token: ParsedToken } | { ok: false; error: string };

const TOKEN_UID_RE = /^[0-9a-f]{64}$/;
// Same shape wallet-lib accepts: the name is greedy, so it may contain colons.
const CONFIG_RE = /^\[([\s\S]+):([^:]+):([0-9a-fA-F]{64}):([0-9a-fA-F]{8})\]$/;

/** Reads `[name:symbol:uid:checksum]`, checking the checksum. */
export function parseConfigurationString(config: string): ParseTokenResult {
  const match = CONFIG_RE.exec(config.trim());
  if (!match) return { ok: false, error: 'Not a configuration string ([name:symbol:uid:checksum])' };
  const [, name, symbol, uid, checksum] = match;
  if (getConfigurationString(uid, name, symbol) !== `[${name}:${symbol}:${uid}:${checksum.toLowerCase()}]`) {
    return { ok: false, error: 'Configuration string checksum mismatch: check for a typo' };
  }
  return { ok: true, token: { uid: uid.toLowerCase(), name, symbol } };
}

/** A token UID (64 hex characters) or a configuration string. */
export function parseTokenInput(input: string): ParseTokenResult {
  const value = input.trim();
  if (value === '') return { ok: false, error: 'Enter a token UID or configuration string' };
  if (value.startsWith('[')) return parseConfigurationString(value);
  const uid = value.toLowerCase();
  if (uid === '00') return { ok: false, error: 'HTR is always included' };
  if (!TOKEN_UID_RE.test(uid)) return { ok: false, error: 'A token UID is 64 hexadecimal characters' };
  return { ok: true, token: { uid } };
}
