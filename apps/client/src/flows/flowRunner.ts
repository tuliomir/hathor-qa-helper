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
 * over by hand: results land in the same slices the stages read. A step can
 * also check its confirmed tx on chain (e.g. who paid the fee); a failed
 * check pauses too, and resuming checks the same tx again.
 *
 * Not every step is an approval: a request the wallet must refuse passes on
 * its first refusal, a request with no prompt (e.g. `htr_getBalance`) is
 * never rejected, and a local step is work the app does itself (e.g.
 * scattering funds). A step with a review question ends by asking the user
 * whether the wallet's screen looked right; "no" pauses after the step.
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
  flowStepChecked,
  flowStepReviewed,
  flowStepStatusChanged,
  flowStepTxHash,
  type FlowAttempt,
  type FlowCheck,
  type FlowReview,
  type FlowStepExpectation,
  type FlowStepState,
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
import { classifyRpcError, RPC_USER_REJECTED_MESSAGE, type RpcErrorOutcome } from '../utils/rpcOutcome';
import type { NanoTxWait } from '../utils/nanoTxConfirmation';
import { extractErrorMessage } from '../utils/errorUtils';

export type Dispatch = (action: UnknownAction) => unknown;

/** What one attempt of a step sends, and what its stage form shows. */
export interface StepPlan {
  /** Values for the stage form (applied by `useFlowPrefill`). */
  prefill: Record<string, unknown>;
  call: (h: RpcHandlers) => Promise<{ request: RpcRequest; response: unknown }>;
}

interface FlowStepBase {
  id: string;
  title: string;
  stageId: StageId;
  /** Checks on the confirmed tx; throws when it can't check. */
  checkOnChain?: (txHash: string, env: FlowEnv) => Promise<FlowCheck[]>;
  /** Asked once the step is done (e.g. "Did the confirmation screen show …?"). */
  review?: string;
}

export interface RpcFlowStep extends FlowStepBase {
  kind?: 'rpc';
  /** What the wallet should do with the request; an approval by default. */
  expects?: Exclude<FlowStepExpectation, 'local'>;
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
  /**
   * Checks an approved answer against the test wallet (e.g. the address is
   * the wallet's); shown with the step's checks, a failed one pauses. A step
   * with a tx shows its on-chain checks instead.
   */
  checkAnswer?: (response: unknown, env: FlowEnv) => Promise<FlowCheck[]>;
  /** For a step the wallet must refuse: what its refusal breaks. Any refusal passes without it. */
  validateRefusal?: (outcome: RpcErrorOutcome) => string[];
}

/** Work the app does itself, with the test wallet it runs (no RPC request). */
export interface LocalFlowStep extends FlowStepBase {
  kind: 'local';
  /** Does the work; returns the tx to wait for, if any. Throws to pause the run. */
  perform: (env: FlowEnv) => Promise<{ txHash?: string | null }>;
}

export type FlowStep = RpcFlowStep | LocalFlowStep;

export function expectationOf(step: FlowStep): FlowStepExpectation {
  return step.kind === 'local' ? 'local' : (step.expects ?? 'approval');
}

/** Approval steps done without a rejection: the run tested only half of them. */
export function untestedRejections(steps: FlowStepState[]): string[] {
  return steps
    .filter((s) => s.status === 'done' && s.expects === 'approval' && !s.attempts.some((a) => a.outcome === 'rejected'))
    .map((s) => s.title);
}

export interface FlowDefinition {
  id: string;
  title: string;
  steps: FlowStep[];
  /** Why the flow can't start now, or null. */
  preflight: (state: RootState) => string | null;
  /**
   * Picks what the steps need beyond the store (e.g. a token by its balance)
   * and keeps it in `flowRun.context`. Runs on start and on every resume, so
   * it must keep what an earlier run picked; throws to pause the run.
   */
  prepare?: (env: FlowEnv) => Promise<void>;
  /** A line about what `prepare` picked, for the run panel. */
  summary?: (context: Record<string, string>) => string | null;
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
  /** The test wallet when it runs from its seed; null for address-only or stopped wallets. */
  testWallet: () => FlowWallet | null;
  /** Asks the user `question` in the run panel; null once `shouldAbort` (the run ended). */
  askReview: (question: string, shouldAbort: () => boolean) => Promise<FlowReview | null>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

/** What a flow can read from the running test wallet. */
export interface FlowWallet {
  tokenUids: () => Promise<string[]>;
  /** Unlocked balance in base units. */
  balance: (tokenUid: string) => Promise<bigint>;
  isFeeToken: (tokenUid: string) => Promise<boolean>;
  addressAt: (index: number) => Promise<string>;
  /** The address's index in the wallet, or null when it isn't the wallet's. */
  addressIndex: (address: string) => Promise<number | null>;
  /** How many txs the wallet has seen on `address`. */
  addressTxCount: (address: string) => Promise<number>;
  /** Splits the transparent HTR into UTXOs of 1, 2, 3 … base units (`computeScatterOutputs`). */
  scatterHtr: () => Promise<{ txHash: string; amounts: bigint[] }>;
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
      steps: flow.steps.map((step) => ({
        id: step.id,
        title: step.title,
        stageId: step.stageId,
        expects: expectationOf(step),
        reviewQuestion: step.review ?? null,
      })),
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

/** `flagged`: done, but the user said the wallet's screen was off. */
type StepEnd = 'done' | 'stop' | 'flagged';

async function runSteps(flow: FlowDefinition, env: FlowEnv, startedAt: number | null): Promise<void> {
  const run = () => env.getState().flowRun;
  // The user dismissed this run (or started another one).
  const gone = () => run().flowId !== flow.id || run().startedAt !== startedAt || run().status === 'idle';
  const pause = (reason: string) => env.dispatch(flowStatusChanged({ status: 'paused', reason }));

  try {
    if (flow.prepare) {
      try {
        await flow.prepare(env);
      } catch (err) {
        if (!gone()) pause(extractErrorMessage(err));
        return;
      }
    }
    for (;;) {
      if (gone()) return;
      const index = run().currentStep;
      if (index >= flow.steps.length) break;
      const end = await runStep(flow.steps[index], index, env, gone, pause);
      if (end === 'stop') return;
      env.dispatch(flowCurrentStepChanged(index + 1));
      if (end === 'flagged') {
        const step = run().steps[index];
        const note = step?.review?.note ? `: ${step.review.note}` : '';
        pause(`You flagged "${step?.title}"${note}. Resume to go on.`);
        return;
      }
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

  // Resuming a step whose tx was already approved: only the wait (and the
  // checks) are left. Sending it again would move the funds twice.
  const resumed = env.getState().flowRun.steps[index];
  const checkFailed = resumed?.checks.some((c) => !c.ok);
  if (resumed?.txHash && (resumed.status === 'confirming' || checkFailed)) {
    return confirm(resumed.txHash);
  }

  const stopRequested = () => {
    if (env.getState().flowRun.status !== 'stopping') return false;
    setStatus('pending');
    pause('Stopped by you');
    return true;
  };

  if (step.kind === 'local') {
    if (gone() || stopRequested()) return 'stop';
    setStatus('working');
    env.navigate(step.stageId);
    let result: { txHash?: string | null };
    try {
      result = await step.perform(env);
    } catch (err) {
      if (gone()) return 'stop';
      return fail(extractErrorMessage(err));
    }
    if (gone()) return 'stop';
    if (!result.txHash) return finish();
    dispatch(flowStepTxHash({ index, txHash: result.txHash }));
    return confirm(result.txHash);
  }

  const expects = expectationOf(step);
  for (;;) {
    if (gone() || stopRequested()) return 'stop';

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
      if (expects === 'refusal') {
        const problems = step.validateRefusal?.(outcome) ?? [];
        recordAttempt({
          outcome: outcome.kind === 'rejected' ? 'rejected' : 'error',
          asExpected: problems.length === 0,
          code: outcome.code,
          message: outcome.message,
          problems,
          duration: durationOf(err),
        });
        if (problems.length > 0) return fail('The wallet refused, but not the way the step expects');
        return finish();
      }
      if (expects === 'approval' && outcome.kind === 'rejected') {
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
        outcome: outcome.kind === 'rejected' ? 'rejected' : 'error',
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
    if (expects === 'refusal') {
      recordAttempt({
        outcome: 'approved',
        asExpected: false,
        code: null,
        message: 'Approved a request the wallet should refuse',
        problems: ['The wallet carried out an invalid request'],
        duration: result.duration,
      });
      return fail('The wallet accepted a request it should have refused');
    }
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
    if (step.checkAnswer) {
      const end = await runChecks(() => step.checkAnswer!(result.response, env), 'Resume to ask again.');
      if (end) return end;
    }

    const hash = step.txHash?.(result.response) ?? null;
    if (!hash) return finish();
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
    if (step.checkOnChain) {
      const end = await runChecks(() => step.checkOnChain!(hash, env), 'Resume to check again.');
      if (end) return end;
    }
    return finish();
  }

  /** Runs and records a step's checks; returns how the step ends if one failed. */
  async function runChecks(check: () => Promise<FlowCheck[]>, retry: string): Promise<StepEnd | null> {
    setStatus('checking');
    let checks: FlowCheck[];
    try {
      checks = await check();
    } catch (err) {
      checks = [{ ok: false, text: `Could not run the checks: ${extractErrorMessage(err)}` }];
    }
    if (gone()) return 'stop';
    dispatch(flowStepChecked({ index, checks }));
    const failed = checks.find((c) => !c.ok);
    return failed ? fail(`${failed.text}. ${retry}`) : null;
  }

  /** Asks the step's review question, if any, then marks the step done. */
  async function finish(): Promise<StepEnd> {
    if (step.review) {
      setStatus('reviewing');
      const review = await env.askReview(step.review, gone);
      if (!review || gone()) return 'stop';
      dispatch(flowStepReviewed({ index, review }));
      if (!review.ok) {
        setStatus('done');
        return 'flagged';
      }
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
