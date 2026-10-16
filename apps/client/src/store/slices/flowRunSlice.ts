/**
 * Flow run state: an automatic run of a chain of stages (e.g. the bet
 * nano contract flow), driven by `flows/flowRunner.ts` and shown by the run
 * panel. Also carries the form values the runner fills into each stage
 * (`prefill`), which the stages apply through `useFlowPrefill`.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StageId } from '../../types/stage';

export type FlowRunStatus =
  | 'idle'
  /** Sending steps. */
  | 'running'
  /** Stop requested: pauses once the current request settles. */
  | 'stopping'
  /** Waiting for the user: stopped by them, or something unexpected happened. */
  | 'paused'
  | 'passed'
  | 'failed';

export type FlowStepStatus =
  | 'pending'
  /** Form filled, about to send. */
  | 'filling'
  /** Request sent, waiting for the user on the wallet. */
  | 'awaiting-wallet'
  /** Approved, waiting for the tx to be confirmed and executed. */
  | 'confirming'
  /** Confirmed; checking the tx on chain. */
  | 'checking'
  /** Briefly, before the run moves on. */
  | 'succeeded'
  | 'done'
  | 'failed'
  | 'skipped';

export type FlowAttemptOutcome = 'approved' | 'rejected' | 'error';

export interface FlowAttempt {
  outcome: FlowAttemptOutcome;
  /** False when the response broke an expectation (wrong rejection message, unexpected response). */
  asExpected: boolean;
  code: number | null;
  message: string;
  /** Expectations the response broke. */
  problems: string[];
  duration: number;
  at: number;
}

/** One on-chain check of a confirmed step (e.g. who paid the fee). */
export interface FlowCheck {
  ok: boolean;
  text: string;
}

export interface FlowStepState {
  id: string;
  title: string;
  stageId: StageId;
  status: FlowStepStatus;
  txHash: string | null;
  attempts: FlowAttempt[];
  /** The checks run on the confirmed tx; a failed one pauses the run. */
  checks: FlowCheck[];
}

export interface FlowVerdict {
  passed: boolean;
  detail: string;
}

export interface FlowRunState {
  flowId: string | null;
  title: string;
  status: FlowRunStatus;
  currentStep: number;
  /** Why the run paused or failed. */
  reason: string | null;
  steps: FlowStepState[];
  verdict: FlowVerdict | null;
  startedAt: number | null;
  finishedAt: number | null;
  /** Values the flow picked when it started (e.g. the token it moves), kept for its steps. */
  context: Record<string, string>;
  prefill: Partial<Record<StageId, { nonce: number; values: Record<string, unknown> }>>;
}

const initialState: FlowRunState = {
  flowId: null,
  title: '',
  status: 'idle',
  currentStep: 0,
  reason: null,
  steps: [],
  verdict: null,
  startedAt: null,
  finishedAt: null,
  context: {},
  prefill: {},
};

let prefillNonce = 0;

const flowRunSlice = createSlice({
  name: 'flowRun',
  initialState,
  reducers: {
    flowStarted: (
      _state,
      action: PayloadAction<{
        flowId: string;
        title: string;
        steps: { id: string; title: string; stageId: StageId }[];
        at: number;
      }>
    ) => {
      const { flowId, title, steps, at } = action.payload;
      return {
        ...initialState,
        flowId,
        title,
        status: 'running',
        startedAt: at,
        steps: steps.map((s) => ({ ...s, status: 'pending' as const, txHash: null, attempts: [], checks: [] })),
      };
    },
    flowStatusChanged: (state, action: PayloadAction<{ status: FlowRunStatus; reason?: string | null }>) => {
      state.status = action.payload.status;
      if (action.payload.reason !== undefined) state.reason = action.payload.reason;
    },
    /** Asks the runner to pause once the current request settles. */
    flowStopRequested: (state) => {
      if (state.status === 'running') state.status = 'stopping';
    },
    flowStepStatusChanged: (state, action: PayloadAction<{ index: number; status: FlowStepStatus }>) => {
      const step = state.steps[action.payload.index];
      if (step) step.status = action.payload.status;
    },
    flowStepTxHash: (state, action: PayloadAction<{ index: number; txHash: string | null }>) => {
      const step = state.steps[action.payload.index];
      if (step) step.txHash = action.payload.txHash;
    },
    flowStepChecked: (state, action: PayloadAction<{ index: number; checks: FlowCheck[] }>) => {
      const step = state.steps[action.payload.index];
      if (step) step.checks = action.payload.checks;
    },
    flowContextSet: (state, action: PayloadAction<Record<string, string>>) => {
      Object.assign(state.context, action.payload);
    },
    flowAttemptRecorded: (state, action: PayloadAction<{ index: number; attempt: FlowAttempt }>) => {
      state.steps[action.payload.index]?.attempts.push(action.payload.attempt);
    },
    flowCurrentStepChanged: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    /** Skips the current step (the user did it by hand); the run stays paused. */
    flowStepSkipped: (state) => {
      const step = state.steps[state.currentStep];
      if (step && step.status !== 'done') step.status = 'skipped';
      state.currentStep += 1;
    },
    flowFinished: (state, action: PayloadAction<{ verdict: FlowVerdict; at: number }>) => {
      state.status = action.payload.verdict.passed ? 'passed' : 'failed';
      state.verdict = action.payload.verdict;
      state.reason = null;
      state.finishedAt = action.payload.at;
    },
    flowPrefillSet: (state, action: PayloadAction<{ stageId: StageId; values: Record<string, unknown> }>) => {
      prefillNonce += 1;
      state.prefill[action.payload.stageId] = { nonce: prefillNonce, values: action.payload.values };
    },
    /** Ends the run; the stages keep the values already filled in. */
    flowDismissed: () => initialState,
  },
});

export const {
  flowStarted,
  flowStatusChanged,
  flowStopRequested,
  flowStepStatusChanged,
  flowStepTxHash,
  flowStepChecked,
  flowContextSet,
  flowAttemptRecorded,
  flowCurrentStepChanged,
  flowStepSkipped,
  flowFinished,
  flowPrefillSet,
  flowDismissed,
} = flowRunSlice.actions;

export const selectFlowRun = (state: { flowRun: FlowRunState }) => state.flowRun;

/** True while a run is sending or about to (the wallet may be showing its prompt). */
export const selectFlowRunActive = (state: { flowRun: FlowRunState }) =>
  state.flowRun.status === 'running' || state.flowRun.status === 'stopping';

export default flowRunSlice.reducer;
