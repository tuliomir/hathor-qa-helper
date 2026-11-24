/**
 * Publishes the QA blueprints a network lacks. See knowledge/blueprint-publisher.md.
 *
 * Exit codes: 0 done / dry run / nothing to do, 1 error, 2 refused (confirmation or safety gate).
 */

import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { NETWORKS, type BlueprintIds } from '@qa-helper/shared/networks';
import { createFullnodeApi } from './fullnode.ts';
import { decideGate, HELP, parseCliArgs, promptAccepted, readSeed } from './gate.ts';
import {
  checkNetwork,
  computePlan,
  describePublishError,
  formatPlan,
  needsUnverifiedAck,
  registrySnippet,
  toPublish,
} from './plan.ts';
import { openPublisher, waitAccepted, type Publisher } from './publisher.ts';
import { loadBlueprintSources, PublisherError, RefusedError, resolveWalletLibDir } from './sources.ts';

const REPO_ROOT = resolve(import.meta.dir, '../../../..');
const log = (msg: string) => console.error(msg);

async function ask(question: string): Promise<string | null> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return await rl.question(question);
  } catch {
    return null;
  } finally {
    rl.close();
  }
}

async function main(): Promise<number> {
  const opts = parseCliArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(HELP);
    return 0;
  }
  if (opts.network === 'MAINNET') throw new RefusedError('Refusing to publish on mainnet.');
  const network = NETWORKS[opts.network];

  const sources = loadBlueprintSources(resolveWalletLibDir(process.env, REPO_ROOT));
  const seed = readSeed(opts.seedFile, process.env);

  const api = createFullnodeApi(network.fullNodeUrl);
  const version = await api.version();
  checkNetwork(network, version);

  let publisher: Publisher | null = null;
  try {
    if (seed) publisher = await openPublisher(seed, opts.network, log);
    const plan = await computePlan({ api, network, version, sources, publisher: publisher?.info ?? null });
    if (publisher) {
      for (const b of toPublish(plan)) b.weight = await publisher.weightOf(b.source.code);
    }
    console.log(formatPlan(plan));
    console.log('');

    const decision = decideGate({
      network: opts.network,
      dryRun: opts.dryRun,
      isTTY: Boolean(process.stdin.isTTY),
      confirm: opts.confirm,
      hasSeed: publisher !== null,
      toPublish: toPublish(plan).length,
      needsUnverifiedAck: needsUnverifiedAck(plan),
      allowUnverified: opts.allowUnverified,
    });
    switch (decision.action) {
      case 'dry-run':
        console.log('Dry run: nothing sent.');
        return 0;
      case 'nothing-to-do':
        break;
      case 'refuse':
        console.error(`Refused: ${decision.reason}`);
        return 2;
      case 'prompt':
        if (!promptAccepted(await ask(`Type ${opts.network} to publish, anything else to abort: `), opts.network)) {
          console.error('Aborted: nothing sent.');
          return 2;
        }
        break;
      case 'proceed':
        break;
    }

    const ids: Partial<BlueprintIds> = {};
    for (const b of plan.blueprints) if (b.status.kind === 'exists') ids[b.source.key] = b.status.id;

    for (const b of toPublish(plan)) {
      log(`Publishing ${b.source.key} (${b.source.className})...`);
      let id: string;
      try {
        id = await publisher!.publish(b.source.code);
      } catch (e) {
        throw new PublisherError(
          `Publishing ${b.source.key} failed: ${describePublishError(e, plan.publisher!.address)}` +
            `\nIds so far: ${JSON.stringify(ids)}`
        );
      }
      log(`  sent ${id}; waiting for its first block...`);
      try {
        await waitAccepted(api, id, opts.timeoutMinutes * 60_000);
      } catch (e) {
        throw new PublisherError(
          `${(e as Error).message}\nIds so far: ${JSON.stringify({ ...ids, [b.source.key]: id })}`
        );
      }
      log(`  accepted.`);
      ids[b.source.key] = id;
    }

    const all = ids as BlueprintIds;
    console.log(`Blueprint ids on ${opts.network}:`);
    for (const b of plan.blueprints) console.log(`  ${b.source.key.padEnd(9)} ${all[b.source.key]}`);
    console.log(`\nAdd to NETWORKS.${opts.network} in packages/shared/src/networks.ts:\n`);
    console.log(registrySnippet(all));
    return 0;
  } finally {
    await publisher?.stop().catch(() => {});
  }
}

main()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    if (e instanceof RefusedError) {
      console.error(`Refused: ${e.message}`);
      process.exit(2);
    }
    console.error(e instanceof PublisherError ? `Error: ${e.message}` : e);
    process.exit(1);
  });
