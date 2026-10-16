/**
 * FlowRunPanel — the floating checklist of an automatic flow run: each step
 * with its state, attempts and tx, what the run is waiting for, and the
 * controls (stop after this step, resume, skip, end). It also hands the
 * router's navigate to the runner. Sits bottom left, clear of the toasts and
 * the deep-link modal on the right, and collapses to a pill so it never
 * hides a form the user wants to take over.
 */

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  MdCheckCircle,
  MdExpandLess,
  MdExpandMore,
  MdFlag,
  MdHelpOutline,
  MdHighlightOff,
  MdRadioButtonUnchecked,
  MdRedo,
} from 'react-icons/md';
import { selectFlowRun, type FlowAttempt, type FlowStepState } from '../../store/slices/flowRunSlice';
import { selectRpcNetwork } from '../../store/slices/walletConnectSlice';
import { getStageUrl } from '../../config/stageRoutes';
import { answerFlowReview, setFlowNavigator } from '../../flows/flowEnv';
import { flowById } from '../../flows';
import { StatusChip } from '../ui/StatusChip';
import { TxIdDisplay } from '../common/TxIdDisplay';
import { useFlowControls } from './useFlowControls';

const RUN_STATUS_LABEL = {
  idle: 'Idle',
  running: 'Running',
  stopping: 'Stopping',
  paused: 'Paused',
  passed: 'Passed',
  failed: 'Failed',
} as const;

const RUN_STATUS_TONE = {
  idle: 'idle',
  running: 'progress',
  stopping: 'progress',
  paused: 'warning',
  passed: 'success',
  failed: 'error',
} as const;

function StepIcon({ step }: { step: FlowStepState }) {
  switch (step.status) {
    case 'done':
    case 'succeeded':
      return <MdCheckCircle className="size-5 shrink-0 text-success" aria-hidden="true" />;
    case 'failed':
      return <MdHighlightOff className="size-5 shrink-0 text-error" aria-hidden="true" />;
    case 'skipped':
      return <MdRedo className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />;
    case 'filling':
    case 'awaiting-wallet':
    case 'confirming':
    case 'checking':
    case 'working':
      return <span className="loading loading-spinner loading-sm shrink-0 text-primary" aria-hidden="true" />;
    case 'reviewing':
      return <MdHelpOutline className="size-5 shrink-0 text-primary" aria-hidden="true" />;
    default:
      return <MdRadioButtonUnchecked className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />;
  }
}

const STEP_LINE: Partial<Record<FlowStepState['status'], string>> = {
  filling: 'Filling the form…',
  'awaiting-wallet': 'Approve or reject on your phone',
  confirming: 'Waiting for a block to confirm the tx…',
  checking: 'Checking the answer…',
  working: 'Working on it…',
  succeeded: 'Success!',
  skipped: 'Skipped',
};

function attemptLabel(a: FlowAttempt, step: FlowStepState): string {
  if (step.expects === 'refusal') {
    if (a.outcome === 'approved') return 'Approved, should be refused';
    return `Refused${a.code !== null ? ` (${a.code})` : ''}${a.asExpected ? '' : ', unexpected'}`;
  }
  if (a.outcome === 'approved') return a.asExpected ? 'Approved' : 'Approved, unexpected response';
  if (a.outcome === 'rejected') return a.asExpected ? 'Rejected (5002)' : `Rejected, unexpected message`;
  return `Error${a.code !== null ? ` ${a.code}` : ''}`;
}

function AttemptRow({ attempt, step }: { attempt: FlowAttempt; step: FlowStepState }) {
  const succeeded = attempt.outcome === 'approved' || step.expects === 'refusal';
  const tone = !attempt.asExpected ? 'error' : succeeded ? 'success' : 'info';
  return (
    <li className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={attempt.outcome} label={attemptLabel(attempt, step)} tone={tone} />
        <span className="text-caption text-ink-muted">
          {new Date(attempt.at).toLocaleTimeString()} · {(attempt.duration / 1000).toFixed(1)}s
        </span>
      </div>
      {/* A refusal's message is what the first runs record for the invalid requests. */}
      {(attempt.outcome === 'error' || !attempt.asExpected || step.expects === 'refusal') && (
        <p className="m-0 break-words font-mono text-data-sm text-ink-muted">{attempt.message}</p>
      )}
      {attempt.problems.length > 0 && (
        <ul className="m-0 list-disc pl-5 text-caption text-error">
          {attempt.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** "Did the wallet's screen look right?": the run waits for the answer. */
function ReviewPrompt({ question }: { question: string }) {
  const [flagging, setFlagging] = useState(false);
  const [note, setNote] = useState('');

  return (
    <div className="ml-7 flex flex-col gap-2 rounded-field bg-tint-info px-3 py-2" role="group" aria-label="Review">
      <p className="m-0 text-body font-semibold">{question}</p>
      {flagging ? (
        <>
          <label className="flex flex-col gap-1 text-caption text-ink-muted">
            What was off?
            <textarea
              className="textarea textarea-bordered textarea-sm text-body"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-error btn-sm"
              onClick={() => answerFlowReview({ ok: false, note: note.trim() })}
            >
              <MdFlag aria-hidden="true" />
              Flag and pause
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFlagging(false)}>
              Back
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => answerFlowReview({ ok: true, note: '' })}
          >
            Yes, looked right
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setFlagging(true)}>
            Something was off
          </button>
        </div>
      )}
    </div>
  );
}

function StepRow({ step, active, network }: { step: FlowStepState; active: boolean; network: string }) {
  const [open, setOpen] = useState(false);
  const rejections =
    step.expects === 'approval' ? step.attempts.filter((a) => a.outcome === 'rejected' && a.asExpected).length : 0;
  const finished = step.status === 'done' || step.status === 'succeeded';
  const line = STEP_LINE[step.status];

  return (
    <li className={`flex flex-col gap-1.5 rounded-field px-2 py-1.5 ${active ? 'bg-base-200' : ''}`}>
      <div className="flex items-center gap-2">
        <StepIcon step={step} />
        <Link
          to={getStageUrl(step.stageId)}
          className="min-w-0 flex-1 truncate font-semibold text-inherit no-underline hover:underline"
        >
          {step.title}
        </Link>
        {rejections > 0 && <StatusChip status="info" label={`Rejected ×${rejections}`} tone="info" />}
        {finished && rejections === 0 && step.expects === 'approval' && (
          <StatusChip status="warning" label="Rejection not tested" tone="warning" />
        )}
        {step.expects === 'no-prompt' && <StatusChip status="idle" label="No prompt" tone="idle" />}
        {step.review && !step.review.ok && <StatusChip status="error" label="Flagged" tone="error" />}
        {step.attempts.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square"
            aria-expanded={open}
            aria-label={open ? `Hide ${step.title} attempts` : `Show ${step.title} attempts`}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <MdExpandLess aria-hidden="true" /> : <MdExpandMore aria-hidden="true" />}
          </button>
        )}
      </div>
      {line && (
        <p
          className={`m-0 pl-7 text-body ${step.status === 'succeeded' ? 'font-semibold text-success' : step.status === 'awaiting-wallet' ? 'font-semibold' : 'text-ink-muted'}`}
          role={active ? 'status' : undefined}
        >
          {line}
        </p>
      )}
      {step.txHash && <TxIdDisplay hash={step.txHash} network={network} className="pl-7" />}
      {step.status === 'reviewing' && step.reviewQuestion && <ReviewPrompt question={step.reviewQuestion} />}
      {step.review && !step.review.ok && (
        <p className="m-0 flex items-start gap-1 pl-7 text-caption text-error">
          <MdFlag className="mt-0.5 shrink-0" aria-hidden="true" />
          {step.review.note || 'You flagged the wallet screen'}
        </p>
      )}
      {step.checks.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-0.5 pl-7 text-caption">
          {step.checks.map((c) => (
            <li key={c.text} className={`flex items-start gap-1 ${c.ok ? 'text-ink-muted' : 'text-error'}`}>
              {c.ok ? (
                <MdCheckCircle className="mt-0.5 shrink-0 text-success" aria-label="Passed" />
              ) : (
                <MdHighlightOff className="mt-0.5 shrink-0" aria-label="Failed" />
              )}
              {c.text}
            </li>
          ))}
        </ul>
      )}
      {open && (
        <ol className="m-0 flex list-none flex-col gap-2 pl-7">
          {step.attempts.map((a) => (
            <AttemptRow key={a.at} attempt={a} step={step} />
          ))}
        </ol>
      )}
    </li>
  );
}

export function FlowRunPanel() {
  const run = useSelector(selectFlowRun);
  const network = useSelector(selectRpcNetwork);
  const navigate = useNavigate();
  const controls = useFlowControls();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setFlowNavigator(navigate);
    return () => setFlowNavigator(null);
  }, [navigate]);

  if (run.status === 'idle') return null;
  const flow = flowById(run.flowId);
  const statusChip = (
    <StatusChip status={run.status} label={RUN_STATUS_LABEL[run.status]} tone={RUN_STATUS_TONE[run.status]} />
  );
  const doneCount = run.steps.filter((s) => s.status === 'done' || s.status === 'skipped').length;

  if (collapsed) {
    return (
      <button
        type="button"
        className="fixed bottom-4 left-4 lg:left-[264px] z-40 flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-2 shadow-float"
        onClick={() => setCollapsed(false)}
        aria-label="Show the automatic run"
      >
        <span className="font-semibold">{run.title}</span>
        <span className="text-caption text-ink-muted">
          {doneCount}/{run.steps.length}
        </span>
        {statusChip}
        <MdExpandLess aria-hidden="true" />
      </button>
    );
  }

  const finished = run.status === 'passed' || run.status === 'failed';
  const summary = flow?.summary?.(run.context) ?? null;

  return (
    <section
      aria-label="Automatic run"
      className="fixed bottom-4 left-4 lg:left-[264px] z-40 flex max-h-[75dvh] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-float"
    >
      <header className="flex items-center gap-2 border-b border-base-300 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate text-title-sm">{run.title}</h2>
          <p className="m-0 text-caption text-ink-muted">Automatic run · answer the prompts on your phone</p>
        </div>
        {statusChip}
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          aria-label="Collapse the automatic run"
          onClick={() => setCollapsed(true)}
        >
          <MdExpandMore aria-hidden="true" />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-col gap-3 overflow-y-auto px-2 py-3">
        {summary && <p className="m-0 mx-2 text-body text-ink-muted">{summary}</p>}
        {run.reason && run.status === 'paused' && (
          <p role="alert" className="m-0 mx-2 rounded-field bg-tint-warning px-3 py-2 text-body text-warning-ink">
            {run.reason}
          </p>
        )}
        {run.verdict && (
          <p
            role="status"
            className={`m-0 mx-2 rounded-field px-3 py-2 text-body ${run.verdict.passed ? 'bg-tint-success text-success' : 'bg-tint-error text-error'}`}
          >
            <strong>{run.verdict.passed ? 'Passed. ' : 'Failed. '}</strong>
            {run.verdict.detail}
          </p>
        )}
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {run.steps.map((step, i) => (
            <StepRow key={step.id} step={step} active={i === run.currentStep && !finished} network={network} />
          ))}
        </ol>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-base-300 px-4 py-2.5">
        {run.status === 'running' && (
          <button type="button" className="btn btn-sm" onClick={controls.stop}>
            Stop after this step
          </button>
        )}
        {run.status === 'stopping' && (
          <button type="button" className="btn btn-sm" disabled>
            Stopping after this step…
          </button>
        )}
        {run.status === 'paused' && flow && (
          <>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => controls.resume(flow)}>
              {run.currentStep >= run.steps.length ? 'Finish' : 'Resume'}
            </button>
            {run.currentStep < run.steps.length && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={controls.skip}
                title="Mark this step done (e.g. you did it by hand)"
              >
                Skip step
              </button>
            )}
          </>
        )}
        {finished && flow && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => controls.start(flow)}>
            Run again
          </button>
        )}
        {(run.status === 'paused' || finished) && (
          <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={controls.dismiss}>
            {finished ? 'Close' : 'End run'}
          </button>
        )}
      </footer>
    </section>
  );
}

export default FlowRunPanel;
