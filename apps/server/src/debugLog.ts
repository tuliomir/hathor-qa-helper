/**
 * The debug log's store: the last events in memory for `GET /debug-log`,
 * every event appended to a JSONL file that outlives restarts, and each
 * tab's latest state. See knowledge/debug-log.md.
 */

import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import {
  sanitize,
  type DebugEvent,
  type DebugEventInput,
  type DebugStatePost,
  type DebugStateResponse,
} from '@qa-helper/shared/debugLog';

export interface DebugLogOptions {
  /** JSONL file to append to; null keeps the log in memory only. */
  file: string | null;
  capacity?: number;
  /** The file is rotated to `<file>.1` past this size. */
  maxFileBytes?: number;
  now?: () => number;
}

/** `QA_DEBUG_LOG`, else `$XDG_STATE_HOME/qa-helper/debug-log.jsonl`. */
export function defaultDebugLogFile(env: Record<string, string | undefined> = process.env): string {
  if (env.QA_DEBUG_LOG) return env.QA_DEBUG_LOG;
  const state = env.XDG_STATE_HOME || join(homedir(), '.local', 'state');
  return join(state, 'qa-helper', 'debug-log.jsonl');
}

export class DebugLog {
  private events: DebugEvent[] = [];
  private seq = 0;
  private states = new Map<string, DebugStateResponse['tabs'][number]>();
  private readonly capacity: number;
  private readonly maxFileBytes: number;
  private readonly now: () => number;
  private fileError: string | null = null;
  private readonly options: DebugLogOptions;

  constructor(options: DebugLogOptions) {
    this.options = options;
    this.capacity = options.capacity ?? 5000;
    this.maxFileBytes = options.maxFileBytes ?? 20 * 1024 * 1024;
    this.now = options.now ?? Date.now;
    if (options.file) mkdirSync(dirname(options.file), { recursive: true });
  }

  get file(): string | null {
    return this.options.file;
  }

  /** Stores the events (sanitized again: the server trusts no client) and returns the last seq. */
  append(inputs: DebugEventInput[]): number {
    const lines: string[] = [];
    for (const input of inputs) {
      const event: DebugEvent = {
        seq: ++this.seq,
        at: input.at,
        tab: input.tab,
        page: input.page,
        kind: input.kind,
        type: input.type,
        data: sanitize(input.data),
      };
      this.events.push(event);
      lines.push(JSON.stringify(event));
    }
    if (this.events.length > this.capacity) this.events.splice(0, this.events.length - this.capacity);
    this.write(lines);
    return this.seq;
  }

  /** Events after `since`, oldest first, at most `limit` (the latest ones when more are waiting). */
  read({ since = 0, limit = 500, tab }: { since?: number; limit?: number; tab?: string } = {}): {
    events: DebugEvent[];
    last: number;
  } {
    const after = this.events.filter((e) => e.seq > since && (!tab || e.tab === tab));
    return { events: after.slice(-limit), last: this.seq };
  }

  setState(post: DebugStatePost): void {
    this.states.set(post.tab, { ...post, state: sanitize(post.state), receivedAt: this.now() });
  }

  /** Each tab's latest state, the most recently heard from first. */
  getStates(): DebugStateResponse {
    return { tabs: [...this.states.values()].sort((a, b) => b.receivedAt - a.receivedAt) };
  }

  /** Why the file is not being written, if it isn't. */
  get writeError(): string | null {
    return this.fileError;
  }

  private write(lines: string[]) {
    const file = this.options.file;
    if (!file || lines.length === 0) return;
    try {
      if (existsSync(file) && statSync(file).size > this.maxFileBytes) renameSync(file, `${file}.1`);
      appendFileSync(file, lines.join('\n') + '\n');
      this.fileError = null;
    } catch (err) {
      // The log must never break the server: memory still has the events.
      this.fileError = (err as Error).message;
    }
  }
}
