/**
 * Flow runner: drives a chain of RPC stages the way a QA would by hand —
 * open the stage, fill its form, send, then wait on the wallet — so the
 * user only answers prompts on the phone.
 *
 * Per step: a rejection that comes back as the expected 5002 is recorded
 * and the step is sent again (QA_REOWN.md asks to reject every step once);
 * an approval is checked against the step's expectations and, for a tx,
 * waited on until a block confirms it and the contract executed it. Anything
 * else pauses the run for the user, who can resume, skip the step or take
 * over by hand: results land in the same slices the stages read.
 *
 * The run state lives in `flowRunSlice`; this module only holds the promise
 * of the run in progress.
 */

import type { UnknownAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { StageId } from '../types/stage';
import {
  flowAttemptRecorded,
  flowCurrentStepChanged,
  flowFinished,
  flowPrefillSet,
  flowStarted,
  flowStatusChanged,
  flowStepStatusChanged,
  flowStepTxHash,
  type FlowAttempt,
  type FlowStepStatus,
  type FlowVerdict,
} from '../store/slices/flowRunSlice';
import {
  recordRpcFailure,
  recordRpcResult,
  RpcRunError,
  type MethodSliceActions,
  type RpcHandlers,
  type RpcRequest,
  type RpcRunResult,
} from '../services/rpcRun';
import { classifyRpcError, RPC_USER_REJECTED_MESSAGE } from '../utils/rpcOutcome';
import type { NanoTxWait } from '../utils/nanoTxConfirmation';
import { extractErrorMessage } from '../utils/errorUtils';

export type Dispatch = (action: UnknownAction) => unknown;

/** What one attempt of a step sends, and what its stage form shows. */
export interface StepPlan {
  /** Values for the stage form (applied by `useFlowPrefill`). */
  prefill: Record<string, unknown>;
  call: (h: RpcHandlers) => Promise<{ request: RpcRequest; response: unknown }>;
}

export interface FlowStep {
  id: string;
  title: string;
  stageId: StageId;
  /** The slice the stage stores this method's request and response in. */
  actions: MethodSliceActions;
  /** Builds the attempt from the store; throws when a prerequisite is missing. */
  plan: (state: RootState) => StepPlan;
  /** Expectations an approved response breaks; empty when it is as expected. */
  validate: (response: unknown, state: RootState) => string[];
  /** The tx to wait for before moving on, if the step sends one. */
  txHash?: (response: unknown) => string | null;
  /** Extra state the stage keeps after an approval (e.g. the new contract ID). */
  onApproved?: (dispatch: Dispatch, response: unknown, state: RootState) => void;
}

export interface FlowDefinition {
  id: string;
  title: string;
  steps: FlowStep[];
  /** Why the flow can't start now, or null. */
  preflight: (state: RootState) => string | null;
  /** The end-of-run check (e.g. all funds came back). */
  verify: (env: FlowEnv) => Promise<FlowVerdict>;
}

export interface FlowEnv {
  getState: () => RootState;
  dispatch: Dispatch;
  navigate: (stageId: StageId) => void;
  /** Sends through the session's RPC handlers; throws like `runRpc`. */
  send: (call: StepPlan['call']) => Promise<RpcRunResult>;
  waitForTx: (hash: string, shouldAbort: () => boolean) => Promise<NanoTxWait>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

/** Pauses that let the user follow along. */
export const FLOW_TIMING = {
  /** Between filling a stage form and sending it. */
  fillMs: 700,
  /** How long a step shows its success before the next one starts. */
  successMs: 1000,
  /** Between a rejection and sending the step again. */
  retryMs: 1500,
};

let activeRun: Promise<void> | null = null;

/** True while a run's request may still be open on the wallet. */
export function isFlowRunInProgress(): boolean {
  return activeRun !== null;
}

/** Starts `flow` from its first step. Returns why it can't start, or null. */
export function startFlow(flow: FlowDefinition, env: FlowEnv): string | null {
  if (activeRun) return 'The previous run still has a request open on the wallet';
  const reason = flow.preflight(env.getState());
  if (reason) return reason;
  env.dispatch(
    flowStarted({
      flowId: flow.id,
      title: flow.title,
      steps: flow.steps.map(({ id, title, stageId }) => ({ id, title, stageId })),
      at: env.now(),
    })
  );
  launch(flow, env);
  return null;
}

/** Continues a paused run from its current step. Returns why it can't, or null. */
export function resumeFlow(flow: FlowDefinition, env: FlowEnv): string | null {
  if (activeRun) return 'The run is still waiting on the wallet';
  const reason = flow.preflight(env.getState());
  if (reason) return reason;
  env.dispatch(flowStatusChanged({ status: 'running', reason: null }));
  launch(flow, env);
  return null;
}

/** Resolves when the run in progress (if any) ends. For tests. */
export function flowRunSettled(): Promise<void> {
  return activeRun ?? Promise.resolve();
}

function launch(flow: FlowDefinition, env: FlowEnv) {
  const startedAt = env.getState().flowRun.startedAt;
  activeRun = runSteps(flow, env, startedAt).finally(() => {
    activeRun = null;
  });
}

type StepEnd = 'done' | 'stop';

async function runSteps(flow: FlowDefinition, env: FlowEnv, startedAt: number | null): Promise<void> {
  const run = () => env.getState().flowRun;
  // The user dismissed this run (or started another one).
  const gone = () => run().flowId !== flow.id || run().startedAt !== startedAt || run().status === 'idle';
  const pause = (reason: string) => env.dispatch(flowStatusChanged({ status: 'paused', reason }));

  try {
    for (;;) {
      if (gone()) return;
      const index = run().currentStep;
      if (index >= flow.steps.length) break;
      const end = await runStep(flow.steps[index], index, env, gone, pause);
      if (end === 'stop') return;
      env.dispatch(flowCurrentStepChanged(index + 1));
    }
    if (gone()) return;
    let verdict: FlowVerdict;
    try {
      verdict = await flow.verify(env);
    } catch (err) {
      verdict = { passed: false, detail: `Final check failed: ${extractErrorMessage(err)}` };
    }
    if (!gone()) env.dispatch(flowFinished({ verdict, at: env.now() }));
  } catch (err) {
    if (!gone()) pause(`Runner error: ${extractErrorMessage(err)}`);
  }
}

async function runStep(
  step: FlowStep,
  index: number,
  env: FlowEnv,
  gone: () => boolean,
  pause: (reason: string) => void
): Promise<StepEnd> {
  const { dispatch } = env;
  const setStatus = (status: FlowStepStatus) => dispatch(flowStepStatusChanged({ index, status }));
  const recordAttempt = (attempt: Omit<FlowAttempt, 'at'>) =>
    dispatch(flowAttemptRecorded({ index, attempt: { ...attempt, at: env.now() } }));
  const fail = (reason: string): StepEnd => {
    setStatus('failed');
    pause(reason);
    return 'stop';
  };

  // Resuming a step whose tx was already approved: only the wait is left.
  const resumed = env.getState().flowRun.steps[index];
  if (resumed?.status === 'confirming' && resumed.txHash) {
    return confirm(resumed.txHash);
  }

  for (;;) {
    if (gone()) return 'stop';
    if (env.getState().flowRun.status === 'stopping') {
      setStatus('pending');
      pause('Stopped by you');
      return 'stop';
    }

    let plan: StepPlan;
    try {
      plan = step.plan(env.getState());
    } catch (err) {
      return fail(extractErrorMessage(err));
    }

    setStatus('filling');
    env.navigate(step.stageId);
    dispatch(flowPrefillSet({ stageId: step.stageId, values: plan.prefill }));
    await env.sleep(FLOW_TIMING.fillMs);
    if (gone()) return 'stop';

    setStatus('awaiting-wallet');
    let result: RpcRunResult;
    try {
      result = await env.send(plan.call);
    } catch (err) {
      if (gone()) return 'stop';
      recordRpcFailure(dispatch, step.actions, false, err);
      const outcome = classifyRpcError(err);
      if (outcome.kind === 'rejected') {
        const problems = outcome.valid
          ? []
          : [`Expected the message "${RPC_USER_REJECTED_MESSAGE}", got "${outcome.message}"`];
        recordAttempt({
          outcome: 'rejected',
          asExpected: outcome.valid,
          code: outcome.code,
          message: outcome.message,
          problems,
          duration: durationOf(err),
        });
        if (!outcome.valid) return fail('The rejection came back with an unexpected message');
        setStatus('pending');
        await env.sleep(FLOW_TIMING.retryMs);
        continue;
      }
      recordAttempt({
        outcome: 'error',
        asExpected: false,
        code: outcome.code,
        message: outcome.message,
        problems: [],
        duration: durationOf(err),
      });
      return fail(`The wallet answered with an error: ${outcome.message}`);
    }
    if (gone()) return 'stop';

    recordRpcResult(dispatch, step.actions, false, result);
    const state = env.getState();
    const problems = step.validate(result.response, state);
    recordAttempt({
      outcome: 'approved',
      asExpected: problems.length === 0,
      code: null,
      message: problems.length === 0 ? 'Approved' : 'Approved, but the response is not as expected',
      problems,
      duration: result.duration,
    });
    if (problems.length > 0) return fail('The response is not what the step expects');
    step.onApproved?.(dispatch, result.response, state);

    const hash = step.txHash?.(result.response) ?? null;
    if (!hash) return succeed();
    dispatch(flowStepTxHash({ index, txHash: hash }));
    return confirm(hash);
  }

  async function confirm(hash: string): Promise<StepEnd> {
    setStatus('confirming');
    const wait = await env.waitForTx(hash, gone);
    if (wait.state === 'aborted' || gone()) return 'stop';
    if (wait.state === 'failed') return fail(`Tx ${hash.slice(0, 8)}…: ${wait.reason}`);
    if (wait.state === 'timeout') {
      // Stays `confirming`: resuming waits for the same tx instead of sending another.
      pause(`Tx ${hash.slice(0, 8)}… is not confirmed yet. Resume to keep waiting.`);
      return 'stop';
    }
    return succeed();
  }

  async function succeed(): Promise<StepEnd> {
    setStatus('succeeded');
    await env.sleep(FLOW_TIMING.successMs);
    if (gone()) return 'stop';
    setStatus('done');
    return 'done';
  }
}

function durationOf(err: unknown): number {
  return err instanceof RpcRunError ? err.duration : 0;
}
