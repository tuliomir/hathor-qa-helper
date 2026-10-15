import { beforeEach, describe, expect, test } from 'bun:test';
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import flowRunReducer, { flowDismissed, flowStepSkipped, flowStopRequested } from '../src/store/slices/flowRunSlice';
import {
  flowRunSettled,
  resumeFlow,
  startFlow,
  type FlowDefinition,
  type FlowEnv,
  type FlowStep,
} from '../src/flows/flowRunner';
import type { RpcHandlers } from '../src/services/rpcRun';
import { runRpc } from '../src/services/rpcRun';
import type { NanoTxWait } from '../src/utils/nanoTxConfirmation';
import type { RootState } from '../src/store';

const REJECTED = { code: 5002, message: 'Rejected by the user' };

/** A method slice like the stages' (request/response/error). */
const methodSlice = createSlice({
  name: 'method',
  initialState: { request: null as unknown, rawResponse: null as unknown, error: null as string | null },
  reducers: {
    setRequest: (s, a: PayloadAction<{ method: string; params: unknown; isDryRun: boolean }>) => {
      s.request = a.payload;
    },
    setResponse: (s, a: PayloadAction<{ response: unknown; duration: number }>) => {
      s.rawResponse = a.payload.response;
      s.error = null;
    },
    setError: (s, a: PayloadAction<{ error: string; duration: number }>) => {
      s.error = a.payload.error;
    },
  },
});

type Answer = { error: unknown } | { response: unknown };

/** Fake wallet: answers each step's calls from a script, in order. */
function harness(script: Record<string, Answer[]>, waits: Record<string, NanoTxWait[]> = {}) {
  const store = configureStore({ reducer: { flowRun: flowRunReducer, method: methodSlice.reducer } });
  const calls: string[] = [];
  const navigations: string[] = [];
  const waited: string[] = [];

  const step = (id: string, opts: Partial<FlowStep> = {}): FlowStep => ({
    id,
    title: id,
    stageId: 'rpc-bet-initialize',
    actions: methodSlice.actions,
    plan: () => ({
      prefill: { id },
      call: async () => {
        calls.push(id);
        const answer = script[id]?.shift();
        if (!answer) throw new Error(`no scripted answer for ${id}`);
        if ('error' in answer)
          throw Object.assign(answer.error as object, { requestParams: { method: id, params: {} } });
        return { request: { method: id, params: {} }, response: answer.response };
      },
    }),
    validate: (response) => ((response as { ok?: boolean }).ok ? [] : ['not ok']),
    txHash: (response) => (response as { hash?: string }).hash ?? null,
    ...opts,
  });

  const env: FlowEnv = {
    getState: () => store.getState() as unknown as RootState,
    dispatch: store.dispatch,
    navigate: (stageId) => navigations.push(stageId),
    send: (call) => runRpc({} as RpcHandlers, call),
    waitForTx: async (hash) => {
      waited.push(hash);
      return waits[hash]?.shift() ?? { state: 'confirmed', firstBlock: 'block' };
    },
    sleep: async () => {},
    now: () => 1000,
  };

  const flow = (steps: FlowStep[]): FlowDefinition => ({
    id: 'test-flow',
    title: 'Test flow',
    steps,
    preflight: () => null,
    verify: async () => ({ passed: true, detail: 'verified' }),
  });

  const run = () => store.getState().flowRun;
  return { store, env, step, flow, run, calls, navigations, waited };
}

beforeEach(async () => {
  await flowRunSettled();
});

describe('flow runner', () => {
  test('retries a rejected step, then waits for its tx and moves on', async () => {
    const h = harness({
      a: [{ error: { ...REJECTED } }, { response: { ok: true, hash: 'tx-a' } }],
      b: [{ response: { ok: true } }],
    });
    expect(startFlow(h.flow([h.step('a'), h.step('b')]), h.env)).toBeNull();
    await flowRunSettled();

    expect(h.calls).toEqual(['a', 'a', 'b']);
    expect(h.waited).toEqual(['tx-a']);
    expect(h.run().status).toBe('passed');
    expect(h.run().steps.map((s) => s.status)).toEqual(['done', 'done']);
    const attempts = h.run().steps[0].attempts;
    expect(attempts.map((a) => [a.outcome, a.asExpected])).toEqual([
      ['rejected', true],
      ['approved', true],
    ]);
    expect(h.run().steps[0].txHash).toBe('tx-a');
    // The stage's slice holds the last response, as after a manual send.
    expect(h.store.getState().method.rawResponse).toEqual({ ok: true });
    expect(h.run().prefill['rpc-bet-initialize']?.values).toEqual({ id: 'b' });
  });

  test('pauses on a rejection with the wrong message', async () => {
    const h = harness({ a: [{ error: { code: 5002, message: 'Nope' } }] });
    startFlow(h.flow([h.step('a')]), h.env);
    await flowRunSettled();

    expect(h.run().status).toBe('paused');
    expect(h.run().steps[0].status).toBe('failed');
    expect(h.run().steps[0].attempts[0].problems[0]).toContain('Rejected by the user');
  });

  test('pauses on any other error, and resume sends the step again', async () => {
    const h = harness({
      a: [{ error: { code: 5004, message: 'boom' } }, { response: { ok: true } }],
    });
    const flow = h.flow([h.step('a')]);
    startFlow(flow, h.env);
    await flowRunSettled();
    expect(h.run().status).toBe('paused');
    expect(h.run().reason).toContain('boom');
    expect(h.store.getState().method.error).toBe('boom');

    expect(resumeFlow(flow, h.env)).toBeNull();
    await flowRunSettled();
    expect(h.calls).toEqual(['a', 'a']);
    expect(h.run().status).toBe('passed');
  });

  test('pauses when an approved response breaks an expectation', async () => {
    const h = harness({ a: [{ response: { ok: false, hash: 'tx-a' } }] });
    startFlow(h.flow([h.step('a')]), h.env);
    await flowRunSettled();

    expect(h.run().status).toBe('paused');
    expect(h.run().steps[0].attempts[0]).toMatchObject({
      outcome: 'approved',
      asExpected: false,
      problems: ['not ok'],
    });
    expect(h.waited).toEqual([]);
  });

  test('a stop request pauses before the next send', async () => {
    const h = harness({ a: [{ error: { ...REJECTED } }], b: [] });
    const a = h.step('a');
    const plan = a.plan;
    // The user presses "Stop after this step" while the wallet shows the prompt.
    a.plan = (state) => {
      const p = plan(state);
      return {
        ...p,
        call: async (handlers) => {
          h.store.dispatch(flowStopRequested());
          return p.call(handlers);
        },
      };
    };
    startFlow(h.flow([a, h.step('b')]), h.env);
    await flowRunSettled();

    expect(h.calls).toEqual(['a']);
    expect(h.run().status).toBe('paused');
    expect(h.run().reason).toBe('Stopped by you');
    expect(h.run().steps[0].status).toBe('pending');
  });

  test('a failed tx pauses the run', async () => {
    const h = harness(
      { a: [{ response: { ok: true, hash: 'tx-a' } }] },
      { 'tx-a': [{ state: 'failed', reason: 'The contract failed to execute the tx' }] }
    );
    startFlow(h.flow([h.step('a')]), h.env);
    await flowRunSettled();

    expect(h.run().status).toBe('paused');
    expect(h.run().reason).toContain('failed to execute');
  });

  test('after a confirmation timeout, resume waits for the same tx without sending again', async () => {
    const h = harness({ a: [{ response: { ok: true, hash: 'tx-a' } }] }, { 'tx-a': [{ state: 'timeout' }] });
    const flow = h.flow([h.step('a')]);
    startFlow(flow, h.env);
    await flowRunSettled();
    expect(h.run().status).toBe('paused');
    expect(h.run().steps[0].status).toBe('confirming');

    resumeFlow(flow, h.env);
    await flowRunSettled();
    expect(h.calls).toEqual(['a']);
    expect(h.waited).toEqual(['tx-a', 'tx-a']);
    expect(h.run().status).toBe('passed');
  });

  test('skip moves past a step the user did by hand', async () => {
    const h = harness({ a: [{ error: { code: 1, message: 'x' } }], b: [{ response: { ok: true } }] });
    const flow = h.flow([h.step('a'), h.step('b')]);
    startFlow(flow, h.env);
    await flowRunSettled();

    h.store.dispatch(flowStepSkipped());
    resumeFlow(flow, h.env);
    await flowRunSettled();
    expect(h.run().steps.map((s) => s.status)).toEqual(['skipped', 'done']);
    expect(h.run().status).toBe('passed');
  });

  test('ending the run while the wallet is prompting drops its answer', async () => {
    const h = harness({ a: [{ response: { ok: true, hash: 'tx-a' } }] });
    const a = h.step('a');
    const plan = a.plan;
    a.plan = (state) => {
      const p = plan(state);
      return {
        ...p,
        call: async (handlers) => {
          h.store.dispatch(flowDismissed());
          return p.call(handlers);
        },
      };
    };
    startFlow(h.flow([a]), h.env);
    await flowRunSettled();

    expect(h.run().status).toBe('idle');
    expect(h.waited).toEqual([]);
    expect(h.store.getState().method.rawResponse).toBeNull();
  });

  test('refuses to start when the preflight fails', () => {
    const h = harness({});
    const flow = { ...h.flow([]), preflight: () => 'No session' };
    expect(startFlow(flow, h.env)).toBe('No session');
    expect(h.run().status).toBe('idle');
  });
});
