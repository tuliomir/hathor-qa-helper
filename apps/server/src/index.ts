/** Boots the QA server on 127.0.0.1. See knowledge/server.md. */

import { QA_SERVER_DEFAULT_PORT } from '@qa-helper/shared/serverApi';
import pkg from '../package.json' with { type: 'json' };
import { createApp, parseExtraOrigins } from './app.ts';
import { createWalletFactory } from './walletFactory.ts';

const port = Number(process.env.QA_SERVER_PORT ?? QA_SERVER_DEFAULT_PORT);
const extraOrigins = parseExtraOrigins(process.env.QA_SERVER_EXTRA_ORIGINS);
const app = createApp({ factory: createWalletFactory(), version: pkg.version, extraOrigins });
if (extraOrigins.length) console.log(`Extra allowed origins: ${extraOrigins.join(', ')}`);

const server = Bun.serve({
  hostname: '127.0.0.1',
  port,
  // Wallet starts return at once, but sends wait for mining.
  idleTimeout: 255,
  async fetch(req) {
    const res = await app(req);
    // Method, path and status only: bodies carry seeds.
    console.log(`${req.method} ${new URL(req.url).pathname} ${res.status}`);
    return res;
  },
});
console.log(`QA server listening on http://${server.hostname}:${server.port}`);

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal}: stopping ${app.registry.size} wallet(s)`);
  await server.stop(true);
  await app.registry.stopAll();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
