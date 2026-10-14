/**
 * Design lint: fails when src/ uses what the redesign retired (raw Tailwind
 * palette classes, the 7.5 spacing and 2xs size aliases, card-primary,
 * break-all, window.confirm). Same regex as the rollout's lane check
 * (docs/design/rollout.md). Run with `bun run lint:design`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RETIRED =
  /mb-7\.5|mt-7\.5|card-primary|text-2xs|break-all|window\.confirm|\b(?:bg|text|border)-(?:blue|green|red|yellow|gray|purple|orange|amber|indigo|slate|emerald)-[0-9]{2,3}/g;

const EXTENSIONS = /\.(tsx?|jsx?|css)$/;

export interface DesignViolation {
  line: number;
  match: string;
}

export function findDesignViolations(source: string): DesignViolation[] {
  const found: DesignViolation[] = [];
  source.split('\n').forEach((text, i) => {
    for (const m of text.matchAll(RETIRED)) found.push({ line: i + 1, match: m[0] });
  });
  return found;
}

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (EXTENSIONS.test(name)) yield path;
  }
}

if (import.meta.main) {
  const root = join(import.meta.dir, '..');
  const src = join(root, 'src');
  let count = 0;
  for (const file of sourceFiles(src)) {
    for (const v of findDesignViolations(readFileSync(file, 'utf8'))) {
      console.log(`${relative(root, file)}:${v.line}: ${v.match}`);
      count++;
    }
  }
  if (count > 0) {
    console.error(`\ndesign-lint: ${count} retired class${count === 1 ? '' : 'es'}; see knowledge/design-system.md`);
    process.exit(1);
  }
  console.log('design-lint: clean');
}
