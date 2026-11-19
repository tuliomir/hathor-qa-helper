/** Argument parsing, seed loading and the confirmation gate: everything that decides whether anything is sent. */

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { isNetworkKey, type NetworkKey } from '@qa-helper/shared/networks';
import { PublisherError } from './sources.ts';

export const SEED_ENV = 'BLUEPRINT_PUBLISHER_SEED';

export interface CliOptions {
  network: NetworkKey;
  dryRun: boolean;
  confirm: string | null;
  seedFile: string | null;
  allowUnverified: boolean;
  timeoutMinutes: number;
  help: boolean;
}

export const HELP = `Publish QA Helper's nano contract blueprints (bet, fee, authority) to a network that lacks them.

Usage:
  bun run blueprints:publish -- --network <KEY> --dry-run [--seed-file <path>]
  bun run blueprints:publish -- --network <KEY> --confirm <KEY> --seed-file <path>

Options:
  --network <KEY>       Registry key from packages/shared/src/networks.ts (MAINNET is refused).
  --dry-run             Print the plan and exit 0. Sends nothing; the seed is optional.
  --confirm <KEY>       Required when stdin is not a TTY (agents). Must equal --network.
                        On a TTY without it, you are asked to type the network key.
  --seed-file <path>    File holding the publisher's 24 words. Or set ${SEED_ENV}.
                        Seeds are never accepted as an argument and never printed.
  --allow-unverified    Publish even when the node can't list on-chain blueprints, so
                        a duplicate published by someone else can't be ruled out.
  --timeout-min <n>     Minutes to wait for each tx's first block (default 10).
  --help                This text.

Sources come from wallet-lib: $WALLET_LIB_DIR, else ../wallet-lib beside this repo.

Publishing costs no HTR (an on-chain blueprint tx has no inputs or outputs), but
the publisher's address 0 signs it. Don't use a miner's seed: its huge history
takes many minutes to load. A fresh seed works.`;

export function parseCliArgs(argv: string[]): CliOptions {
  if (argv.some((a) => a === '--seed' || a.startsWith('--seed='))) {
    throw new PublisherError(`Seeds are not accepted as arguments. Use --seed-file <path> or ${SEED_ENV}.`);
  }
  const { values } = parseArgs({
    args: argv,
    options: {
      network: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      confirm: { type: 'string' },
      'seed-file': { type: 'string' },
      'allow-unverified': { type: 'boolean', default: false },
      'timeout-min': { type: 'string', default: '10' },
      help: { type: 'boolean', default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  const help = values.help ?? false;
  const network = values.network;
  if (!help && !network) throw new PublisherError('--network <KEY> is required.');
  if (network && !isNetworkKey(network)) throw new PublisherError(`Unknown network key '${network}'.`);
  const timeoutMinutes = Number(values['timeout-min']);
  if (!(timeoutMinutes > 0)) throw new PublisherError('--timeout-min must be a positive number.');
  return {
    network: (network ?? 'TESTNET') as NetworkKey,
    dryRun: values['dry-run'] ?? false,
    confirm: values.confirm ?? null,
    seedFile: values['seed-file'] ?? null,
    allowUnverified: values['allow-unverified'] ?? false,
    timeoutMinutes,
    help,
  };
}

/** The seed from --seed-file or the env var, or null when neither is set. */
export function readSeed(
  seedFile: string | null,
  env: Record<string, string | undefined>,
  readFile: (path: string) => string = (p) => readFileSync(p, 'utf8')
): string | null {
  if (seedFile && env[SEED_ENV]) {
    throw new PublisherError(`Both --seed-file and ${SEED_ENV} are set; use one.`);
  }
  let raw: string | undefined;
  if (seedFile) {
    try {
      raw = readFile(seedFile);
    } catch (e) {
      throw new PublisherError(`Can't read --seed-file ${seedFile}: ${(e as Error).message}`);
    }
  } else {
    raw = env[SEED_ENV];
  }
  if (raw === undefined) return null;
  const seed = raw.trim().split(/\s+/).join(' ');
  if (!seed) throw new PublisherError('The seed is empty.');
  return seed;
}

export type GateDecision =
  | { action: 'dry-run' }
  | { action: 'nothing-to-do' }
  | { action: 'prompt' }
  | { action: 'proceed' }
  | { action: 'refuse'; reason: string };

export function decideGate(input: {
  network: NetworkKey;
  dryRun: boolean;
  isTTY: boolean;
  confirm: string | null;
  hasSeed: boolean;
  toPublish: number;
  needsUnverifiedAck: boolean;
  allowUnverified: boolean;
}): GateDecision {
  if (input.network === 'MAINNET') return { action: 'refuse', reason: 'Refusing to publish on mainnet.' };
  if (input.dryRun) return { action: 'dry-run' };
  if (input.toPublish === 0) return { action: 'nothing-to-do' };
  if (!input.hasSeed) {
    return { action: 'refuse', reason: `A publisher seed is required: --seed-file <path> or ${SEED_ENV}.` };
  }
  if (input.needsUnverifiedAck && !input.allowUnverified) {
    return {
      action: 'refuse',
      reason:
        "This node can't list on-chain blueprints, so a duplicate published by another wallet can't be ruled out. " +
        'Check the network another way, then re-run with --allow-unverified.',
    };
  }
  if (input.confirm !== null) {
    return input.confirm === input.network
      ? { action: 'proceed' }
      : { action: 'refuse', reason: `--confirm '${input.confirm}' does not match --network '${input.network}'.` };
  }
  if (input.isTTY) return { action: 'prompt' };
  return {
    action: 'refuse',
    reason: `Not a TTY: re-run with --confirm ${input.network} after reviewing the plan (or --dry-run).`,
  };
}

export const promptAccepted = (answer: string | null, network: NetworkKey) => answer?.trim() === network;
