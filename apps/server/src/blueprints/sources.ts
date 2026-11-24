/**
 * Finds and reads the QA blueprint sources in a wallet-lib checkout. The .py
 * files stay in wallet-lib (its integration tests publish the same ones);
 * this repo never copies them.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { BlueprintIds } from '@qa-helper/shared/networks';

export type BlueprintKey = keyof BlueprintIds;

export const BLUEPRINT_KEYS: readonly BlueprintKey[] = ['bet', 'fee', 'authority'];

/** Relative to the wallet-lib root. */
export const BLUEPRINTS_SUBDIR = '__tests__/integration/configuration/blueprints';

export interface BlueprintSource {
  key: BlueprintKey;
  path: string;
  code: string;
  sha256: string;
  /** The `@export`ed class: the name the fullnode lists the blueprint under. */
  className: string;
}

export class PublisherError extends Error {
  override name = 'PublisherError';
}

/** A safety gate said no, as opposed to something breaking: the CLI exits 2, not 1. */
export class RefusedError extends PublisherError {
  override name = 'RefusedError';
}

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** `$WALLET_LIB_DIR`, else `wallet-lib` beside this repo's checkout. */
export function resolveWalletLibDir(
  env: Record<string, string | undefined>,
  repoRoot: string,
  exists: (path: string) => boolean = existsSync
): string {
  const fromEnv = env.WALLET_LIB_DIR?.trim();
  const dir = fromEnv ? resolve(fromEnv) : resolve(repoRoot, '..', 'wallet-lib');
  const origin = fromEnv ? '$WALLET_LIB_DIR' : 'the default (../wallet-lib beside this repo)';
  if (!exists(dir)) {
    throw new PublisherError(
      `wallet-lib not found at ${dir} (from ${origin}). Clone HathorNetwork/hathor-wallet-lib there or set WALLET_LIB_DIR.`
    );
  }
  return dir;
}

export function exportedClassName(code: string): string | null {
  return /@export\s+class\s+(\w+)/.exec(code)?.[1] ?? null;
}

export function loadBlueprintSources(
  walletLibDir: string,
  readFile: (path: string) => string = (p) => readFileSync(p, 'utf8'),
  exists: (path: string) => boolean = existsSync
): BlueprintSource[] {
  const missing = BLUEPRINT_KEYS.map((key) => join(walletLibDir, BLUEPRINTS_SUBDIR, `${key}.py`)).filter(
    (p) => !exists(p)
  );
  if (missing.length) {
    throw new PublisherError(`Blueprint source(s) missing in wallet-lib:\n  ${missing.join('\n  ')}`);
  }
  return BLUEPRINT_KEYS.map((key) => {
    const path = join(walletLibDir, BLUEPRINTS_SUBDIR, `${key}.py`);
    const code = readFile(path);
    const className = exportedClassName(code);
    if (!className) throw new PublisherError(`No @export class found in ${path}`);
    return { key, path, code, sha256: sha256(code), className };
  });
}
